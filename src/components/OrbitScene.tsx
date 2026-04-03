import { Billboard, Html, Line, OrbitControls, Sparkles, Stars } from '@react-three/drei'
import { Canvas, useFrame } from '@react-three/fiber'
import { useRef } from 'react'
import type { Group } from 'three'
import type { MissionSnapshot } from '../types/mission'

type OrbitSceneProps = {
  snapshot: MissionSnapshot
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
        <sphereGeometry args={[2.6, 64, 64]} />
        <meshStandardMaterial color="#2f80ed" emissive="#11345a" emissiveIntensity={0.7} />
      </mesh>
      <mesh scale={[1.01, 1.01, 1.01]}>
        <sphereGeometry args={[2.6, 64, 64]} />
        <meshStandardMaterial
          color="#1d4ed8"
          wireframe
          transparent
          opacity={0.08}
        />
      </mesh>
      <mesh scale={1.08}>
        <sphereGeometry args={[2.6, 64, 64]} />
        <meshStandardMaterial color="#86d0ff" transparent opacity={0.12} />
      </mesh>
      <mesh scale={1.22}>
        <sphereGeometry args={[2.6, 64, 64]} />
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
        <sphereGeometry args={[0.8, 48, 48]} />
        <meshStandardMaterial color="#d8dde6" emissive="#5e6571" emissiveIntensity={0.15} />
      </mesh>
      <mesh scale={1.14}>
        <sphereGeometry args={[0.8, 48, 48]} />
        <meshBasicMaterial color="#f3f4f6" transparent opacity={0.05} />
      </mesh>
    </group>
  )
}

function Orion({ position }: { position: [number, number, number] }) {
  const craftRef = useRef<Group>(null)

  useFrame((state) => {
    if (!craftRef.current) return
    craftRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 1.1) * 0.08 - 0.6
    craftRef.current.position.y = position[1] + Math.sin(state.clock.elapsedTime * 1.6) * 0.05
  })

  return (
    <group ref={craftRef} position={position} rotation={[0.4, 0.9, -0.6]}>
      <mesh>
        <coneGeometry args={[0.18, 0.6, 8]} />
        <meshStandardMaterial color="#ff9d5c" emissive="#f97316" emissiveIntensity={0.8} />
      </mesh>
      <mesh position={[0, -0.38, 0]}>
        <cylinderGeometry args={[0.12, 0.2, 0.25, 10]} />
        <meshStandardMaterial color="#fff7ed" />
      </mesh>
      <mesh position={[0, -0.52, 0]}>
        <sphereGeometry args={[0.09, 16, 16]} />
        <meshBasicMaterial color="#ffe3b3" />
      </mesh>
      <pointLight position={[0, -0.55, 0]} intensity={2.8} distance={3.4} color="#ffb347" />
    </group>
  )
}

export function OrbitScene({ snapshot }: OrbitSceneProps) {
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

      <Earth />
      <Moon position={snapshot.moonPosition} />
      <Orion position={snapshot.spacecraftPosition} />

      <Billboard position={[0, 3.8, 0]}>
        <Html center distanceFactor={10}>
          <div className="space-label earth-label">Terra</div>
        </Html>
      </Billboard>

      <Billboard position={[snapshot.moonPosition[0], snapshot.moonPosition[1] + 1.8, snapshot.moonPosition[2]]}>
        <Html center distanceFactor={10}>
          <div className="space-label moon-label">Luna</div>
        </Html>
      </Billboard>

      <Billboard
        position={[
          snapshot.spacecraftPosition[0],
          snapshot.spacecraftPosition[1] + 1.1,
          snapshot.spacecraftPosition[2],
        ]}
      >
        <Html center distanceFactor={10}>
          <div className="space-label orion-label">Orion</div>
        </Html>
      </Billboard>

      <OrbitControls
        autoRotate
        autoRotateSpeed={0.38}
        enablePan={false}
        minDistance={10}
        maxDistance={30}
        maxPolarAngle={Math.PI * 0.78}
        minPolarAngle={Math.PI * 0.2}
      />
    </Canvas>
  )
}
