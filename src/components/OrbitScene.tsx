import { Billboard, Html, Line, Sparkles, Stars, Text, TrackballControls } from '@react-three/drei'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useRef } from 'react'
import { Vector3 } from 'three'
import type { RefObject } from 'react'
import type { Group } from 'three'
import type { TrackballControls as TrackballControlsImpl } from 'three-stdlib'
import type { MissionSnapshot } from '../types/mission'

export type SceneFocusTarget = 'earth' | 'orion' | 'moon'

type OrbitSceneProps = {
  snapshot: MissionSnapshot
  focusTarget: SceneFocusTarget | null
  focusRequestId: number
}

const SCENE_MOON_DISTANCE_UNITS = 16
const EARTH_MOON_DISTANCE_KM = 384400
const KM_PER_SCENE_UNIT = EARTH_MOON_DISTANCE_KM / SCENE_MOON_DISTANCE_UNITS
const EARTH_RADIUS = 6371 / KM_PER_SCENE_UNIT
const MOON_RADIUS = 1737.4 / KM_PER_SCENE_UNIT
const EARTH_LABEL_OFFSET = 0.6
const MOON_LABEL_OFFSET = 0.45
const ORION_CREW_MODULE_TOP_RADIUS = 0.041
const ORION_CREW_MODULE_BOTTOM_RADIUS = 0.065
const ORION_CREW_MODULE_HEIGHT = 0.155
const ORION_DOCK_RADIUS = 0.011
const ORION_DOCK_HEIGHT = 0.024
const ORION_ADAPTER_TOP_RADIUS = 0.067
const ORION_ADAPTER_BOTTOM_RADIUS = 0.071
const ORION_ADAPTER_HEIGHT = 0.036
const ORION_ENGINE_TOP_RADIUS = 0.018
const ORION_ENGINE_BOTTOM_RADIUS = 0.034
const ORION_ENGINE_HEIGHT = 0.046
const ORION_ENGINE_CORE_RADIUS = 0.012
const ORION_SOLAR_ARM_LENGTH = 0.028
const ORION_SOLAR_ARM_THICKNESS = 0.0045
const ORION_SOLAR_PANEL_WIDTH = 0.066
const ORION_SOLAR_PANEL_HEIGHT = 0.026
const ORION_SOLAR_PANEL_DEPTH = 0.003
const ORION_SOLAR_PANEL_GAP = 0.009
const ORION_SOLAR_PANEL_BASE_OFFSET = 0.053
const ORION_LABEL_OFFSET = 0.22
const DEFAULT_CAMERA_DIRECTION = new Vector3(0.28, 0.32, 1).normalize()
const LABEL_Z_INDEX_RANGE = [1, 0]
const FOCUS_DISTANCE: Record<SceneFocusTarget, number> = {
  earth: 2.1,
  orion: 1.22,
  moon: 1.55,
}

type FocusControllerProps = {
  controlsRef: RefObject<TrackballControlsImpl | null>
  focusTarget: SceneFocusTarget | null
  focusRequestId: number
  snapshot: MissionSnapshot
}

function getFocusPoint(
  focusTarget: SceneFocusTarget,
  snapshot: MissionSnapshot,
) {
  switch (focusTarget) {
    case 'earth':
      return new Vector3(...snapshot.earthPosition)
    case 'orion':
      return new Vector3(...snapshot.spacecraftPosition)
    case 'moon':
      return new Vector3(...snapshot.moonPosition)
  }
}

function FocusController({
  controlsRef,
  focusTarget,
  focusRequestId,
  snapshot,
}: FocusControllerProps) {
  const camera = useThree((state) => state.camera)
  const trackedPointRef = useRef<Vector3 | null>(null)
  const lastHandledRequestRef = useRef(0)
  const lastTargetRef = useRef<SceneFocusTarget | null>(null)

  useEffect(() => {
    const controls = controlsRef.current
    if (!controls || !focusTarget) {
      trackedPointRef.current = null
      lastTargetRef.current = focusTarget
      return
    }

    const nextTarget = getFocusPoint(focusTarget, snapshot)
    const shouldReframe =
      focusRequestId !== lastHandledRequestRef.current ||
      lastTargetRef.current !== focusTarget ||
      !trackedPointRef.current

    if (shouldReframe) {
      const direction = camera.position.clone().sub(controls.target)
      const safeDirection =
        direction.lengthSq() > 0.0001
          ? direction.normalize()
          : DEFAULT_CAMERA_DIRECTION.clone()

      camera.position.copy(
        nextTarget.clone().add(safeDirection.multiplyScalar(FOCUS_DISTANCE[focusTarget])),
      )
      lastHandledRequestRef.current = focusRequestId
    } else if (trackedPointRef.current) {
      camera.position.add(nextTarget.clone().sub(trackedPointRef.current))
    }

    controls.target.copy(nextTarget)
    controls.update()
    trackedPointRef.current = nextTarget
    lastTargetRef.current = focusTarget
  }, [camera, controlsRef, focusRequestId, focusTarget, snapshot])

  return null
}

function findMoonOrbitAnchor(
  trajectory: [number, number, number][],
  moonRadius: number,
) {
  if (trajectory.length === 0) {
    return null
  }

  let maxRadiusIndex = 0
  let maxRadius = 0

  trajectory.forEach((point, index) => {
    const radius = Math.hypot(point[0], point[1], point[2])
    if (radius > maxRadius) {
      maxRadius = radius
      maxRadiusIndex = index
    }
  })

  const searchRadius = 260
  const start = Math.max(0, maxRadiusIndex - searchRadius)
  const end = Math.min(trajectory.length - 1, maxRadiusIndex + searchRadius)
  let bestPoint = trajectory[maxRadiusIndex]
  let bestDelta = Number.POSITIVE_INFINITY

  for (let index = start; index <= end; index += 1) {
    const point = trajectory[index]
    const radius = Math.hypot(point[0], point[1], point[2])
    const delta = Math.abs(radius - moonRadius)

    if (delta < bestDelta) {
      bestDelta = delta
      bestPoint = point
    }
  }

  return new Vector3(...bestPoint)
}

function buildMoonOrbitTrajectory(
  moonPosition: [number, number, number],
  trajectory: [number, number, number][],
) {
  const moonVector = new Vector3(...moonPosition)
  const radius = moonVector.length()

  if (radius < 0.001) {
    return [] as [number, number, number][]
  }

  const basisA = moonVector.clone().normalize()
  const anchor = findMoonOrbitAnchor(trajectory, radius)
  const anchorVector =
    anchor && anchor.lengthSq() > 0.0001
      ? anchor.clone().normalize().multiplyScalar(radius)
      : null
  const anchorDirection = anchorVector
    ? anchorVector.clone().sub(basisA.clone().multiplyScalar(anchorVector.dot(basisA)))
    : null
  const referenceAxis =
    Math.abs(basisA.y) > 0.92
      ? new Vector3(1, 0, 0)
      : new Vector3(0, 1, 0)
  const basisB =
    anchorDirection && anchorDirection.lengthSq() > 0.000001
      ? anchorDirection.normalize()
      : new Vector3().crossVectors(referenceAxis, basisA).normalize()
  const points: [number, number, number][] = []
  const pointCount = 180

  for (let step = 0; step <= pointCount; step += 1) {
    const angle = (step / pointCount) * Math.PI * 2
    const point = basisA
      .clone()
      .multiplyScalar(Math.cos(angle) * radius)
      .add(basisB.clone().multiplyScalar(Math.sin(angle) * radius))

    points.push(point.toArray() as [number, number, number])
  }

  return points
}

function Earth() {
  const earthRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!earthRef.current) return
    earthRef.current.rotation.y += delta * 0.14
  })

  return (
    <group ref={earthRef} position={[0, 0, 0]}>
      <mesh>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#2f80ed" emissive="#11345a" emissiveIntensity={0.7} />
      </mesh>
      <mesh scale={[1.01, 1.01, 1.01]}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial
          color="#1d4ed8"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshStandardMaterial color="#86d0ff" transparent opacity={0.12} />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[EARTH_RADIUS, 64, 64]} />
        <meshBasicMaterial color="#4cc9ff" transparent opacity={0.045} />
      </mesh>
    </group>
  )
}

function Moon({ position }: { position: [number, number, number] }) {
  const moonRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!moonRef.current) return
    moonRef.current.rotation.y += delta * 0.08
  })

  return (
    <group ref={moonRef} position={position}>
      <mesh>
        <sphereGeometry args={[MOON_RADIUS, 48, 48]} />
        <meshStandardMaterial color="#d8dde6" emissive="#5e6571" emissiveIntensity={0.15} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[MOON_RADIUS, 48, 48]} />
        <meshBasicMaterial color="#f3f4f6" transparent opacity={0.05} />
      </mesh>
    </group>
  )
}

function SolarArray({ rotationY }: { rotationY: number }) {
  const segmentOffsets = [
    ORION_SOLAR_PANEL_BASE_OFFSET,
    ORION_SOLAR_PANEL_BASE_OFFSET + ORION_SOLAR_PANEL_WIDTH + ORION_SOLAR_PANEL_GAP,
  ]

  return (
    <group rotation={[0, rotationY, 0]} position={[0, -0.006, 0]}>
      <mesh position={[ORION_SOLAR_ARM_LENGTH * 0.5, 0.002, 0]}>
        <boxGeometry
          args={[
            ORION_SOLAR_ARM_LENGTH,
            ORION_SOLAR_ARM_THICKNESS,
            ORION_SOLAR_ARM_THICKNESS,
          ]}
        />
        <meshStandardMaterial color="#d9dee6" metalness={0.84} roughness={0.2} />
      </mesh>

      {segmentOffsets.map((offset, index) => (
        <mesh key={index} position={[offset, 0.002, 0]}>
          <boxGeometry
            args={[
              ORION_SOLAR_PANEL_WIDTH,
              ORION_SOLAR_PANEL_HEIGHT,
              ORION_SOLAR_PANEL_DEPTH,
            ]}
          />
          <meshStandardMaterial
            color="#0f141d"
            emissive="#1f4878"
            emissiveIntensity={0.08}
            metalness={0.55}
            roughness={0.42}
          />
        </mesh>
      ))}
    </group>
  )
}

function Orion({ position }: { position: [number, number, number] }) {
  const craftRef = useRef<Group>(null)
  const arraysRef = useRef<Group>(null)

  useFrame((state, delta) => {
    if (!craftRef.current) return
    if (arraysRef.current) {
      arraysRef.current.rotation.y += delta * 0.22
    }

    craftRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1) * 0.08 - 0.6
    craftRef.current.rotation.x = 0.32 + Math.sin(state.clock.elapsedTime * 0.85) * 0.04
    craftRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.6) * 0.035
  })

  return (
    <group ref={craftRef} position={position} rotation={[0.32, 0.9, -0.6]}>
      <mesh position={[0, 0.045, 0]}>
        <cylinderGeometry
          args={[
            ORION_CREW_MODULE_TOP_RADIUS,
            ORION_CREW_MODULE_BOTTOM_RADIUS,
            ORION_CREW_MODULE_HEIGHT,
            24,
          ]}
        />
        <meshStandardMaterial
          color="#2f323b"
          emissive="#0f1013"
          emissiveIntensity={0.18}
          metalness={0.52}
          roughness={0.42}
        />
      </mesh>

      <mesh position={[0, 0.043, 0]} scale={[1.01, 1.01, 1.01]}>
        <cylinderGeometry
          args={[
            ORION_CREW_MODULE_TOP_RADIUS,
            ORION_CREW_MODULE_BOTTOM_RADIUS,
            ORION_CREW_MODULE_HEIGHT,
            16,
          ]}
        />
        <meshStandardMaterial color="#4b4f59" wireframe transparent opacity={0.08} />
      </mesh>

      <mesh position={[0, ORION_CREW_MODULE_HEIGHT * 0.515, 0]}>
        <cylinderGeometry args={[ORION_DOCK_RADIUS, ORION_DOCK_RADIUS * 0.88, ORION_DOCK_HEIGHT, 14]} />
        <meshStandardMaterial color="#edf3fb" metalness={0.78} roughness={0.22} />
      </mesh>

      <mesh
        position={[-0.014, 0.082, ORION_CREW_MODULE_BOTTOM_RADIUS * 0.88]}
        rotation={[Math.PI / 2, -0.15, 0.24]}
      >
        <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
        <meshStandardMaterial color="#0c0e12" emissive="#11141b" emissiveIntensity={0.2} />
      </mesh>

      <mesh
        position={[0.014, 0.082, ORION_CREW_MODULE_BOTTOM_RADIUS * 0.88]}
        rotation={[Math.PI / 2, 0.15, -0.24]}
      >
        <cylinderGeometry args={[0.006, 0.006, 0.004, 16]} />
        <meshStandardMaterial color="#0c0e12" emissive="#11141b" emissiveIntensity={0.2} />
      </mesh>

      <mesh
        position={[0.022, 0.062, ORION_CREW_MODULE_BOTTOM_RADIUS * 0.91]}
        rotation={[Math.PI / 2, 0.08, 0]}
      >
        <cylinderGeometry args={[0.007, 0.007, 0.005, 18]} />
        <meshStandardMaterial color="#fff5e8" emissive="#ffb46a" emissiveIntensity={1.4} />
      </mesh>

      <pointLight
        position={[0.022, 0.064, ORION_CREW_MODULE_BOTTOM_RADIUS * 0.97]}
        intensity={1.8}
        distance={0.55}
        color="#ffb46a"
      />

      <mesh position={[0, -0.02, 0]}>
        <cylinderGeometry
          args={[
            ORION_ADAPTER_TOP_RADIUS,
            ORION_ADAPTER_BOTTOM_RADIUS,
            ORION_ADAPTER_HEIGHT,
            28,
          ]}
        />
        <meshStandardMaterial
          color="#eef0f2"
          emissive="#d9dbdf"
          emissiveIntensity={0.04}
          metalness={0.38}
          roughness={0.36}
        />
      </mesh>

      <Text
        position={[0, -0.014, ORION_ADAPTER_BOTTOM_RADIUS + 0.002]}
        fontSize={0.034}
        maxWidth={0.18}
        anchorX="center"
        anchorY="middle"
        color="#d9473f"
      >
        NASA
      </Text>

      <mesh position={[0, -0.022, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[ORION_ADAPTER_BOTTOM_RADIUS - 0.001, 0.0018, 8, 40]} />
        <meshStandardMaterial color="#2e3138" metalness={0.5} roughness={0.42} />
      </mesh>

      <group ref={arraysRef}>
        <SolarArray rotationY={Math.PI / 4} />
        <SolarArray rotationY={(3 * Math.PI) / 4} />
        <SolarArray rotationY={(5 * Math.PI) / 4} />
        <SolarArray rotationY={(7 * Math.PI) / 4} />
      </group>

      <mesh position={[0, -0.061, 0]}>
        <cylinderGeometry
          args={[
            ORION_ENGINE_TOP_RADIUS,
            ORION_ENGINE_BOTTOM_RADIUS,
            ORION_ENGINE_HEIGHT,
            16,
          ]}
        />
        <meshStandardMaterial color="#cec6b4" metalness={0.76} roughness={0.28} />
      </mesh>

      <mesh position={[0, -0.079, 0]}>
        <sphereGeometry args={[ORION_ENGINE_CORE_RADIUS, 14, 14]} />
        <meshBasicMaterial color="#ffd28a" />
      </mesh>

      <pointLight position={[0, -0.084, 0]} intensity={0.82} distance={0.82} color="#ffb347" />
    </group>
  )
}

export function OrbitScene({
  snapshot,
  focusTarget,
  focusRequestId,
}: OrbitSceneProps) {
  const controlsRef = useRef<TrackballControlsImpl | null>(null)
  const moonOrbitTrajectory = buildMoonOrbitTrajectory(
    snapshot.moonPosition,
    snapshot.fullTrajectory,
  )
  const futureTrajectory = snapshot.fullTrajectory.slice(
    Math.max(snapshot.completedTrajectory.length - 1, 0),
  )

  return (
    <Canvas camera={{ position: [0, 7, 22], fov: 42 }}>
      <color attach="background" args={['#02050d']} />
      <fog attach="fog" args={['#02050d', 28, 60]} />
      <ambientLight intensity={0.65} />
      <directionalLight position={[8, 12, 6]} intensity={2.2} color="#c8ebff" />
      <pointLight position={[-18, 10, -8]} intensity={60} distance={120} color="#fbbf24" />
      <pointLight position={[18, -6, 8]} intensity={18} distance={90} color="#3ba7ff" />

      <Stars radius={160} depth={70} count={5000} factor={3.2} saturation={0.2} fade speed={0.35} />
      <Sparkles count={40} scale={[32, 18, 22]} size={2.2} speed={0.18} color="#7dd3fc" />

      <Line
        points={snapshot.fullTrajectory}
        color="#183246"
        lineWidth={5}
        transparent
        opacity={0.22}
      />

      <Line
        points={snapshot.fullTrajectory}
        color="#2d5168"
        lineWidth={1.2}
        dashed={false}
        transparent
        opacity={0.75}
      />

      <Line
        points={snapshot.completedTrajectory}
        color="#59d0ff"
        lineWidth={2.2}
        dashed={false}
      />

      {futureTrajectory.length > 1 ? (
        <Line
          points={futureTrajectory}
          color="#8fb9d4"
          lineWidth={1.1}
          dashed
          dashSize={0.5}
          gapSize={0.3}
          transparent
          opacity={0.65}
        />
      ) : null}

      <Line
        points={[snapshot.earthPosition, snapshot.moonPosition]}
        color="#27435a"
        lineWidth={0.7}
        dashed
      />

      {moonOrbitTrajectory.length > 1 ? (
        <Line
          points={moonOrbitTrajectory}
          color="#6e879b"
          lineWidth={0.9}
          dashed
          dashSize={0.24}
          gapSize={0.18}
          transparent
          opacity={0.46}
        />
      ) : null}

      <Earth />
      <Moon position={snapshot.moonPosition} />
      <Orion position={snapshot.spacecraftPosition} />

      <Billboard position={[0, EARTH_RADIUS + EARTH_LABEL_OFFSET, 0]}>
        <Html
          center
          occlude
          pointerEvents="none"
          wrapperClass="space-label-wrapper"
          zIndexRange={LABEL_Z_INDEX_RANGE}
        >
          <div className="space-label earth-label">Terra</div>
        </Html>
      </Billboard>

      <Billboard
        position={[
          snapshot.moonPosition[0],
          snapshot.moonPosition[1] + MOON_RADIUS + MOON_LABEL_OFFSET,
          snapshot.moonPosition[2],
        ]}
      >
        <Html
          center
          occlude
          pointerEvents="none"
          wrapperClass="space-label-wrapper"
          zIndexRange={LABEL_Z_INDEX_RANGE}
        >
          <div className="space-label moon-label">Luna</div>
        </Html>
      </Billboard>

      <Billboard
        position={[
          snapshot.spacecraftPosition[0],
          snapshot.spacecraftPosition[1] + ORION_LABEL_OFFSET,
          snapshot.spacecraftPosition[2],
        ]}
      >
        <Html
          center
          occlude
          pointerEvents="none"
          wrapperClass="space-label-wrapper"
          zIndexRange={LABEL_Z_INDEX_RANGE}
        >
          <div className="space-label orion-label">Orion</div>
        </Html>
      </Billboard>

      <TrackballControls
        ref={controlsRef}
        noPan
        rotateSpeed={3.2}
        zoomSpeed={1.2}
        dynamicDampingFactor={0.08}
      />
      <FocusController
        controlsRef={controlsRef}
        focusTarget={focusTarget}
        focusRequestId={focusRequestId}
        snapshot={snapshot}
      />
    </Canvas>
  )
}
