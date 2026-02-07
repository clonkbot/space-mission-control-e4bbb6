import { useState, useRef, useEffect, Suspense } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Text, Float, Trail, Html } from '@react-three/drei'
import * as THREE from 'three'

// Mission phases
type MissionPhase = 'config' | 'launch' | 'ascent' | 'orbit' | 'deploy' | 'reentry' | 'landing' | 'complete'

// Rocket configuration
interface RocketConfig {
  fuelLoad: number // 0-100%
  payloadMass: number // kg
  thrustPower: number // 0-100%
  heatShieldStrength: number // 0-100%
  landingLegs: boolean
  gridFins: boolean
}

const defaultConfig: RocketConfig = {
  fuelLoad: 80,
  payloadMass: 5000,
  thrustPower: 75,
  heatShieldStrength: 70,
  landingLegs: true,
  gridFins: true
}

// Rocket 3D Component
function Rocket({ config, missionPhase, missionProgress }: { config: RocketConfig; missionPhase: MissionPhase; missionProgress: number }) {
  const rocketRef = useRef<THREE.Group>(null!)
  const flameRef = useRef<THREE.Mesh>(null!)
  const payloadRef = useRef<THREE.Mesh>(null!)

  const isFlying = ['launch', 'ascent', 'orbit', 'reentry', 'landing'].includes(missionPhase)
  const showFlame = ['launch', 'ascent', 'landing'].includes(missionPhase)
  const payloadDeployed = ['deploy', 'reentry', 'landing', 'complete'].includes(missionPhase)

  useFrame((state, delta) => {
    if (!rocketRef.current) return

    if (missionPhase === 'config') {
      rocketRef.current.rotation.y += delta * 0.3
      rocketRef.current.position.y = Math.sin(state.clock.elapsedTime * 0.5) * 0.1
    } else if (missionPhase === 'launch') {
      rocketRef.current.position.y = missionProgress * 5
      rocketRef.current.rotation.y = 0
    } else if (missionPhase === 'ascent') {
      rocketRef.current.position.y = 5 + missionProgress * 10
      rocketRef.current.rotation.z = -missionProgress * 0.3
    } else if (missionPhase === 'orbit') {
      const orbitAngle = missionProgress * Math.PI * 2
      rocketRef.current.position.x = Math.sin(orbitAngle) * 8
      rocketRef.current.position.z = Math.cos(orbitAngle) * 8 - 8
      rocketRef.current.position.y = 15
      rocketRef.current.rotation.z = -orbitAngle - Math.PI / 2
    } else if (missionPhase === 'deploy') {
      const orbitAngle = Math.PI
      rocketRef.current.position.x = Math.sin(orbitAngle) * 8
      rocketRef.current.position.z = Math.cos(orbitAngle) * 8 - 8
      rocketRef.current.position.y = 15
    } else if (missionPhase === 'reentry') {
      rocketRef.current.position.y = 15 - missionProgress * 10
      rocketRef.current.position.x = 0
      rocketRef.current.position.z = 0
      rocketRef.current.rotation.z = 0
    } else if (missionPhase === 'landing') {
      rocketRef.current.position.y = 5 - missionProgress * 5
    } else if (missionPhase === 'complete') {
      rocketRef.current.position.set(0, 0, 0)
      rocketRef.current.rotation.set(0, 0, 0)
    }

    // Flame animation
    if (flameRef.current && showFlame) {
      flameRef.current.scale.y = 1 + Math.sin(state.clock.elapsedTime * 20) * 0.3
      flameRef.current.scale.x = 0.8 + Math.sin(state.clock.elapsedTime * 15) * 0.1
    }
  })

  const fuelColor = config.fuelLoad > 50 ? '#00ff88' : config.fuelLoad > 25 ? '#ffaa00' : '#ff4444'

  return (
    <group ref={rocketRef}>
      {/* Main body */}
      <mesh position={[0, 2, 0]}>
        <cylinderGeometry args={[0.3, 0.4, 4, 16]} />
        <meshStandardMaterial color="#e8e8e8" metalness={0.8} roughness={0.2} />
      </mesh>

      {/* Nose cone */}
      <mesh position={[0, 4.5, 0]}>
        <coneGeometry args={[0.3, 1, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Fuel tank indicator */}
      <mesh position={[0, 1.5, 0.31]}>
        <boxGeometry args={[0.1, config.fuelLoad / 100 * 2, 0.02]} />
        <meshStandardMaterial color={fuelColor} emissive={fuelColor} emissiveIntensity={0.5} />
      </mesh>

      {/* Payload fairing */}
      {!payloadDeployed && (
        <mesh ref={payloadRef} position={[0, 3.8, 0]}>
          <cylinderGeometry args={[0.35, 0.35, 0.8, 16]} />
          <meshStandardMaterial color="#2a2a2a" metalness={0.7} roughness={0.3} />
        </mesh>
      )}

      {/* Grid fins */}
      {config.gridFins && (
        <>
          <mesh position={[0.4, 3.2, 0]} rotation={[0, 0, Math.PI / 4]}>
            <boxGeometry args={[0.4, 0.02, 0.3]} />
            <meshStandardMaterial color="#333" metalness={0.9} />
          </mesh>
          <mesh position={[-0.4, 3.2, 0]} rotation={[0, 0, -Math.PI / 4]}>
            <boxGeometry args={[0.4, 0.02, 0.3]} />
            <meshStandardMaterial color="#333" metalness={0.9} />
          </mesh>
          <mesh position={[0, 3.2, 0.4]} rotation={[Math.PI / 4, 0, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.4]} />
            <meshStandardMaterial color="#333" metalness={0.9} />
          </mesh>
          <mesh position={[0, 3.2, -0.4]} rotation={[-Math.PI / 4, 0, 0]}>
            <boxGeometry args={[0.3, 0.02, 0.4]} />
            <meshStandardMaterial color="#333" metalness={0.9} />
          </mesh>
        </>
      )}

      {/* Landing legs */}
      {config.landingLegs && (
        <>
          {[0, Math.PI / 2, Math.PI, Math.PI * 1.5].map((angle, i) => (
            <mesh key={i} position={[Math.sin(angle) * 0.5, -0.2, Math.cos(angle) * 0.5]} rotation={[Math.sin(angle) * 0.5, 0, Math.cos(angle) * 0.5]}>
              <boxGeometry args={[0.08, 0.8, 0.08]} />
              <meshStandardMaterial color="#444" metalness={0.8} />
            </mesh>
          ))}
        </>
      )}

      {/* Engine nozzles */}
      <mesh position={[0, -0.2, 0]}>
        <cylinderGeometry args={[0.35, 0.25, 0.4, 16]} />
        <meshStandardMaterial color="#1a1a1a" metalness={0.9} roughness={0.1} />
      </mesh>

      {/* Flame */}
      {showFlame && (
        <Trail width={1} length={4} color="#ff6600" attenuation={(w) => w * w}>
          <mesh ref={flameRef} position={[0, -1.2, 0]}>
            <coneGeometry args={[0.3, 1.5, 16]} />
            <meshStandardMaterial
              color="#ff4400"
              emissive="#ff6600"
              emissiveIntensity={2}
              transparent
              opacity={0.9}
            />
          </mesh>
        </Trail>
      )}

      {/* Heat shield glow during reentry */}
      {missionPhase === 'reentry' && (
        <mesh position={[0, -0.5, 0]}>
          <sphereGeometry args={[0.6, 16, 16]} />
          <meshStandardMaterial
            color="#ff2200"
            emissive="#ff4400"
            emissiveIntensity={3}
            transparent
            opacity={0.6}
          />
        </mesh>
      )}
    </group>
  )
}

// Deployed payload satellite
function DeployedPayload({ visible, mass }: { visible: boolean; mass: number }) {
  const ref = useRef<THREE.Group>(null!)

  useFrame((state) => {
    if (ref.current && visible) {
      ref.current.rotation.y += 0.01
      const orbitAngle = state.clock.elapsedTime * 0.2 + Math.PI
      ref.current.position.x = Math.sin(orbitAngle) * 10
      ref.current.position.z = Math.cos(orbitAngle) * 10 - 8
    }
  })

  if (!visible) return null

  const scale = 0.5 + (mass / 10000) * 0.5

  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <group ref={ref} position={[0, 15, 0]} scale={scale}>
        {/* Satellite body */}
        <mesh>
          <boxGeometry args={[0.4, 0.4, 0.6]} />
          <meshStandardMaterial color="#666" metalness={0.8} roughness={0.2} />
        </mesh>
        {/* Solar panels */}
        <mesh position={[0.8, 0, 0]}>
          <boxGeometry args={[1, 0.02, 0.4]} />
          <meshStandardMaterial color="#1a237e" metalness={0.3} roughness={0.5} />
        </mesh>
        <mesh position={[-0.8, 0, 0]}>
          <boxGeometry args={[1, 0.02, 0.4]} />
          <meshStandardMaterial color="#1a237e" metalness={0.3} roughness={0.5} />
        </mesh>
        {/* Antenna */}
        <mesh position={[0, 0.4, 0]}>
          <cylinderGeometry args={[0.02, 0.02, 0.5, 8]} />
          <meshStandardMaterial color="#888" />
        </mesh>
        <mesh position={[0, 0.7, 0]}>
          <sphereGeometry args={[0.08, 8, 8]} />
          <meshStandardMaterial color="#00ff88" emissive="#00ff88" emissiveIntensity={1} />
        </mesh>
      </group>
    </Float>
  )
}

// Earth
function Earth() {
  const ref = useRef<THREE.Mesh>(null!)

  useFrame(() => {
    if (ref.current) {
      ref.current.rotation.y += 0.001
    }
  })

  return (
    <mesh ref={ref} position={[0, -25, 0]}>
      <sphereGeometry args={[20, 64, 64]} />
      <meshStandardMaterial color="#1a4d7c" />
    </mesh>
  )
}

// Landing pad
function LandingPad() {
  return (
    <group position={[0, -0.5, 0]}>
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[3, 3, 0.1, 32]} />
        <meshStandardMaterial color="#333" metalness={0.5} roughness={0.8} />
      </mesh>
      {/* Target circles */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[1.5, 1.7, 32]} />
        <meshStandardMaterial color="#ff4444" emissive="#ff4444" emissiveIntensity={0.3} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]}>
        <ringGeometry args={[0.8, 1, 32]} />
        <meshStandardMaterial color="#ffffff" emissive="#ffffff" emissiveIntensity={0.3} />
      </mesh>
    </group>
  )
}

// Scene with camera controls
function Scene({ config, missionPhase, missionProgress }: { config: RocketConfig; missionPhase: MissionPhase; missionProgress: number }) {
  const { camera } = useThree()
  const controlsRef = useRef<any>(null!)

  useEffect(() => {
    if (missionPhase === 'config') {
      camera.position.set(5, 3, 5)
    } else if (missionPhase === 'launch' || missionPhase === 'ascent') {
      camera.position.set(8, 8, 8)
    } else if (missionPhase === 'orbit' || missionPhase === 'deploy') {
      camera.position.set(15, 18, 15)
    } else if (missionPhase === 'reentry' || missionPhase === 'landing') {
      camera.position.set(8, 5, 8)
    }
  }, [missionPhase, camera])

  const payloadDeployed = ['deploy', 'reentry', 'landing', 'complete'].includes(missionPhase)

  return (
    <>
      <color attach="background" args={['#050510']} />
      <fog attach="fog" args={['#050510', 30, 100]} />

      <ambientLight intensity={0.2} />
      <directionalLight position={[10, 20, 10]} intensity={1.5} color="#ffffff" />
      <pointLight position={[-10, 10, -10]} intensity={0.5} color="#4488ff" />

      <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={1} />

      <Rocket config={config} missionPhase={missionPhase} missionProgress={missionProgress} />
      <DeployedPayload visible={payloadDeployed} mass={config.payloadMass} />
      <LandingPad />
      <Earth />

      <OrbitControls
        ref={controlsRef}
        enableDamping
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={50}
        enablePan={false}
      />
    </>
  )
}

// Telemetry display component
function TelemetryValue({ label, value, unit, warning = false }: { label: string; value: string | number; unit?: string; warning?: boolean }) {
  return (
    <div className="flex justify-between items-center py-1 border-b border-green-900/30">
      <span className="text-green-600/70 text-xs uppercase tracking-wider">{label}</span>
      <span className={`font-mono text-sm ${warning ? 'text-amber-400' : 'text-green-400'}`}>
        {value}{unit && <span className="text-green-600/50 ml-1">{unit}</span>}
      </span>
    </div>
  )
}

// Slider component
function ConfigSlider({
  label,
  value,
  onChange,
  min = 0,
  max = 100,
  unit = '%',
  warning = false
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  unit?: string;
  warning?: boolean;
}) {
  return (
    <div className="mb-4">
      <div className="flex justify-between mb-1">
        <span className="text-green-600/80 text-xs uppercase tracking-wider">{label}</span>
        <span className={`font-mono text-sm ${warning ? 'text-amber-400' : 'text-green-400'}`}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full h-2 bg-green-950 rounded-none appearance-none cursor-pointer accent-green-500
          [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:h-4
          [&::-webkit-slider-thumb]:bg-green-400 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-green-600
          [&::-webkit-slider-thumb]:cursor-pointer"
      />
    </div>
  )
}

// Toggle switch component
function ConfigToggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex justify-between items-center py-2 border-b border-green-900/30">
      <span className="text-green-600/80 text-xs uppercase tracking-wider">{label}</span>
      <button
        onClick={() => onChange(!value)}
        className={`w-12 h-6 rounded-sm relative transition-colors ${value ? 'bg-green-700' : 'bg-green-950'}`}
      >
        <div className={`absolute top-1 w-4 h-4 bg-green-400 transition-transform ${value ? 'left-7' : 'left-1'}`} />
      </button>
    </div>
  )
}

// Mission status messages
const missionMessages: Record<MissionPhase, string> = {
  config: 'AWAITING LAUNCH CONFIGURATION',
  launch: 'LIFTOFF! MAIN ENGINE START',
  ascent: 'MAX-Q APPROACHING',
  orbit: 'ORBIT ACHIEVED - NOMINAL',
  deploy: 'PAYLOAD DEPLOYMENT SEQUENCE',
  reentry: 'REENTRY BURN INITIATED',
  landing: 'LANDING SEQUENCE ACTIVE',
  complete: 'MISSION SUCCESS'
}

export default function App() {
  const [config, setConfig] = useState<RocketConfig>(defaultConfig)
  const [missionPhase, setMissionPhase] = useState<MissionPhase>('config')
  const [missionProgress, setMissionProgress] = useState(0)
  const [missionTime, setMissionTime] = useState(0)
  const [showMobilePanel, setShowMobilePanel] = useState(false)

  // Calculate mission success probability
  const calculateSuccessChance = () => {
    let chance = 100

    // Fuel check
    if (config.fuelLoad < 60) chance -= (60 - config.fuelLoad)

    // Payload mass vs thrust
    const thrustRatio = config.thrustPower / (config.payloadMass / 100)
    if (thrustRatio < 0.8) chance -= 20

    // Heat shield for reentry
    if (config.heatShieldStrength < 60) chance -= (60 - config.heatShieldStrength) * 0.5

    // Landing equipment
    if (!config.landingLegs) chance -= 30
    if (!config.gridFins) chance -= 15

    return Math.max(0, Math.min(100, Math.round(chance)))
  }

  const successChance = calculateSuccessChance()

  // Mission simulation
  useEffect(() => {
    if (missionPhase === 'config' || missionPhase === 'complete') return

    const phases: MissionPhase[] = ['launch', 'ascent', 'orbit', 'deploy', 'reentry', 'landing', 'complete']
    const phaseDurations = [3, 4, 5, 2, 4, 3, 0] // seconds

    const currentIndex = phases.indexOf(missionPhase)
    const duration = phaseDurations[currentIndex] * 1000

    const startTime = Date.now()

    const interval = setInterval(() => {
      const elapsed = Date.now() - startTime
      const progress = Math.min(1, elapsed / duration)

      setMissionProgress(progress)
      setMissionTime(prev => prev + 0.05)

      if (progress >= 1 && currentIndex < phases.length - 1) {
        setMissionPhase(phases[currentIndex + 1])
        setMissionProgress(0)
      }
    }, 50)

    return () => clearInterval(interval)
  }, [missionPhase])

  const startMission = () => {
    if (successChance < 30) {
      alert('Mission parameters are too risky! Adjust configuration.')
      return
    }
    setMissionTime(0)
    setMissionPhase('launch')
  }

  const resetMission = () => {
    setMissionPhase('config')
    setMissionProgress(0)
    setMissionTime(0)
  }

  const updateConfig = (key: keyof RocketConfig, value: number | boolean) => {
    setConfig(prev => ({ ...prev, [key]: value }))
  }

  const isInMission = missionPhase !== 'config' && missionPhase !== 'complete'

  return (
    <div className="w-screen h-screen bg-[#050510] overflow-hidden relative" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none z-50 opacity-[0.03]"
        style={{
          background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,255,136,0.1) 2px, rgba(0,255,136,0.1) 4px)'
        }}
      />

      {/* 3D Canvas */}
      <Canvas
        camera={{ position: [5, 3, 5], fov: 50 }}
        className="absolute inset-0"
      >
        <Suspense fallback={null}>
          <Scene config={config} missionPhase={missionPhase} missionProgress={missionProgress} />
        </Suspense>
      </Canvas>

      {/* Header */}
      <div className="absolute top-0 left-0 right-0 z-10 p-4 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-green-400 text-lg md:text-2xl font-bold tracking-[0.2em] uppercase">
              Mission Control
            </h1>
            <p className="text-green-600/60 text-[10px] md:text-xs tracking-wider">
              ORBITAL DELIVERY SYSTEM v2.1
            </p>
          </div>
          <div className="text-right">
            <div className="text-green-600/60 text-[10px] uppercase tracking-wider">Mission Time</div>
            <div className="text-green-400 font-mono text-lg md:text-2xl">
              T+{missionTime.toFixed(1)}s
            </div>
          </div>
        </div>

        {/* Mission status bar */}
        <div className="mt-4 bg-black/60 border border-green-900/50 p-3">
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 ${missionPhase === 'complete' ? 'bg-green-400' : isInMission ? 'bg-amber-400 animate-pulse' : 'bg-green-600/50'}`} />
            <span className="text-green-400 text-xs md:text-sm tracking-wider uppercase">
              {missionMessages[missionPhase]}
            </span>
          </div>
          {isInMission && (
            <div className="mt-2 h-1 bg-green-950 overflow-hidden">
              <div
                className="h-full bg-green-500 transition-all duration-100"
                style={{ width: `${missionProgress * 100}%` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Mobile toggle button */}
      <button
        onClick={() => setShowMobilePanel(!showMobilePanel)}
        className="md:hidden absolute bottom-20 right-4 z-20 bg-green-900/80 border border-green-500 px-4 py-2 text-green-400 text-xs uppercase tracking-wider"
      >
        {showMobilePanel ? 'Hide Panel' : 'Config'}
      </button>

      {/* Configuration Panel */}
      <div className={`
        absolute z-10 bg-black/80 border border-green-900/50 backdrop-blur-sm
        transition-transform duration-300
        md:bottom-6 md:left-6 md:w-80 md:translate-x-0
        bottom-0 left-0 right-0 w-full
        ${showMobilePanel ? 'translate-y-0' : 'translate-y-full md:translate-y-0'}
      `}>
        <div className="p-4 border-b border-green-900/50">
          <h2 className="text-green-400 text-sm uppercase tracking-[0.15em] flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400" />
            Vehicle Configuration
          </h2>
        </div>

        <div className="p-4 max-h-[50vh] md:max-h-none overflow-y-auto">
          <ConfigSlider
            label="Fuel Load"
            value={config.fuelLoad}
            onChange={(v) => updateConfig('fuelLoad', v)}
            warning={config.fuelLoad < 60}
          />

          <ConfigSlider
            label="Payload Mass"
            value={config.payloadMass}
            onChange={(v) => updateConfig('payloadMass', v)}
            min={1000}
            max={15000}
            unit="kg"
            warning={config.payloadMass > 10000}
          />

          <ConfigSlider
            label="Thrust Power"
            value={config.thrustPower}
            onChange={(v) => updateConfig('thrustPower', v)}
            warning={config.thrustPower < 50}
          />

          <ConfigSlider
            label="Heat Shield"
            value={config.heatShieldStrength}
            onChange={(v) => updateConfig('heatShieldStrength', v)}
            warning={config.heatShieldStrength < 60}
          />

          <div className="mt-4 pt-2 border-t border-green-900/30">
            <ConfigToggle
              label="Landing Legs"
              value={config.landingLegs}
              onChange={(v) => updateConfig('landingLegs', v)}
            />
            <ConfigToggle
              label="Grid Fins"
              value={config.gridFins}
              onChange={(v) => updateConfig('gridFins', v)}
            />
          </div>
        </div>

        <div className="p-4 border-t border-green-900/50">
          {missionPhase === 'config' ? (
            <button
              onClick={startMission}
              className="w-full py-3 bg-green-900/50 border border-green-500 text-green-400 uppercase tracking-wider text-sm
                hover:bg-green-800/50 hover:border-green-400 transition-colors active:scale-[0.98]"
            >
              Initiate Launch Sequence
            </button>
          ) : (
            <button
              onClick={resetMission}
              className="w-full py-3 bg-amber-900/50 border border-amber-500 text-amber-400 uppercase tracking-wider text-sm
                hover:bg-amber-800/50 hover:border-amber-400 transition-colors active:scale-[0.98]"
            >
              {missionPhase === 'complete' ? 'New Mission' : 'Abort Mission'}
            </button>
          )}
        </div>
      </div>

      {/* Telemetry Panel */}
      <div className="absolute bottom-6 right-6 z-10 hidden md:block w-72 bg-black/80 border border-green-900/50 backdrop-blur-sm">
        <div className="p-4 border-b border-green-900/50">
          <h2 className="text-green-400 text-sm uppercase tracking-[0.15em] flex items-center gap-2">
            <span className="w-2 h-2 bg-green-400 animate-pulse" />
            Live Telemetry
          </h2>
        </div>

        <div className="p-4">
          <TelemetryValue label="Mission Phase" value={missionPhase.toUpperCase()} />
          <TelemetryValue label="Progress" value={Math.round(missionProgress * 100)} unit="%" />
          <TelemetryValue
            label="Altitude"
            value={
              missionPhase === 'config' ? 0 :
              missionPhase === 'launch' ? Math.round(missionProgress * 50) :
              missionPhase === 'ascent' ? Math.round(50 + missionProgress * 150) :
              ['orbit', 'deploy'].includes(missionPhase) ? 200 :
              missionPhase === 'reentry' ? Math.round(200 - missionProgress * 150) :
              missionPhase === 'landing' ? Math.round(50 - missionProgress * 50) : 0
            }
            unit="km"
          />
          <TelemetryValue
            label="Velocity"
            value={
              isInMission ? Math.round(1000 + Math.random() * 100) : 0
            }
            unit="m/s"
          />
          <TelemetryValue label="Fuel Remaining" value={config.fuelLoad} unit="%" warning={config.fuelLoad < 30} />

          <div className="mt-4 pt-4 border-t border-green-900/30">
            <div className="flex justify-between items-center">
              <span className="text-green-600/70 text-xs uppercase tracking-wider">Success Probability</span>
              <span className={`font-mono text-lg ${
                successChance >= 70 ? 'text-green-400' :
                successChance >= 40 ? 'text-amber-400' : 'text-red-400'
              }`}>
                {successChance}%
              </span>
            </div>
            <div className="mt-2 h-2 bg-green-950 overflow-hidden">
              <div
                className={`h-full transition-all ${
                  successChance >= 70 ? 'bg-green-500' :
                  successChance >= 40 ? 'bg-amber-500' : 'bg-red-500'
                }`}
                style={{ width: `${successChance}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Mission complete overlay */}
      {missionPhase === 'complete' && (
        <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-black/90 border-2 border-green-500 p-8 text-center animate-pulse">
            <div className="text-green-400 text-4xl md:text-6xl font-bold tracking-[0.3em] uppercase mb-4">
              Mission
            </div>
            <div className="text-green-300 text-5xl md:text-7xl font-bold tracking-[0.2em] uppercase">
              Success
            </div>
            <div className="mt-6 text-green-600/80 text-sm tracking-wider">
              Payload delivered to orbit • Vehicle recovered
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 z-10 text-green-700/40 text-[10px] tracking-wider">
        Requested by @pablothethinker · Built by @clonkbot
      </div>
    </div>
  )
}
