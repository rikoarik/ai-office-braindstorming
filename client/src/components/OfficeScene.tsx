import React, { useRef, useState, useEffect, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Sparkles, Environment } from '@react-three/drei';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import * as THREE from 'three';
import styles from './OfficeScene.module.css';

interface CharacterDef {
  id: string;
  name: string;
  desk: number;
  slotX: number;
  color: string;
}

interface DeskConfig {
  x: number;
  z: number;
  label: string;
  width: number;
}

const DESK_CONFIG: Record<number, DeskConfig> = {
  1: { x: -6, z: -4, label: 'Planning', width: 4 },
  2: { x: 6, z: -4, label: 'Design', width: 2.5 },
  3: { x: 0, z: 0.5, label: 'Dev Hub', width: 5 },
  4: { x: -6, z: 4, label: 'QA', width: 2.5 },
  5: { x: 6, z: 4, label: 'DevOps', width: 2.5 }
};

const STAGE_CHARS: Record<string, string[]> = { planning: ['pm','architect'], design: ['designer'], dev: ['dev1','dev2'], qa: ['qa'], deploy: ['devops'] };
const STAGE_TO_DESK: Record<string, number> = { planning: 1, design: 2, dev: 3, qa: 4, deploy: 5 };

const INITIAL_CHARS: CharacterDef[] = [
  { id: 'pm', name: 'Alice (PM)', desk: 1, slotX: -1, color: '#a855f7' },
  { id: 'architect', name: 'Bob (Arch)', desk: 1, slotX: 1, color: '#10b981' },
  { id: 'designer', name: 'Eve (Design)', desk: 2, slotX: 0, color: '#f472b6' },
  { id: 'dev1', name: 'Charlie (Dev)', desk: 3, slotX: -1.2, color: '#38bdf8' },
  { id: 'dev2', name: 'Dave (Dev)', desk: 3, slotX: 1.2, color: '#818cf8' },
  { id: 'qa', name: 'Sam (QA)', desk: 4, slotX: 0, color: '#f59e0b' },
  { id: 'devops', name: 'Ivy (Ops)', desk: 5, slotX: 0, color: '#ef4444' }
];

// --- Voxel Character Component ---
function VoxelCharacter({ 
  position, color, name, isWorking, chatText, isTalking 
}: { 
  position: [number, number, number], color: string, name: string, isWorking: boolean, chatText?: string, isTalking: boolean 
}) {
  const group = useRef<THREE.Group>(null);
  const leftLeg = useRef<THREE.Mesh>(null);
  const rightLeg = useRef<THREE.Mesh>(null);
  const body = useRef<THREE.Group>(null);
  
  const targetX = position[0];
  const targetZ = position[2];
  
  const legColor = useMemo(() => new THREE.Color(color).lerp(new THREE.Color('#000'), 0.3), [color]);

  useFrame((state, delta) => {
    if (!group.current) return;
    
    const currX = group.current.position.x;
    const currZ = group.current.position.z;
    const distX = targetX - currX;
    const distZ = targetZ - currZ;
    
    // Smooth linear interpolation for movement
    group.current.position.x += distX * delta * 4;
    group.current.position.z += distZ * delta * 4;
    
    const isWalking = Math.abs(distX) > 0.05 || Math.abs(distZ) > 0.05;
    const time = state.clock.getElapsedTime();
    
    if (isWalking) {
      // Calculate rotation to face movement direction
      const targetAngle = Math.atan2(distX, distZ);
      // Smooth rotation
      let diff = targetAngle - group.current.rotation.y;
      // Normalize angle difference
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      group.current.rotation.y += diff * delta * 8;

      if (leftLeg.current && rightLeg.current && body.current) {
        leftLeg.current.rotation.x = Math.sin(time * 15) * 0.6;
        rightLeg.current.rotation.x = -Math.sin(time * 15) * 0.6;
        body.current.position.y = 0.6 + Math.abs(Math.sin(time * 15)) * 0.1;
      }
    } else {
      // When at target, face the desk (PI) or slightly angled if talking
      let targetAngle = Math.PI; 
      if (!isWorking) targetAngle = 0; // facing forward if visiting
      if (isTalking) targetAngle += Math.sin(time) * 0.2; // animate talking

      let diff = targetAngle - group.current.rotation.y;
      while (diff < -Math.PI) diff += Math.PI * 2;
      while (diff > Math.PI) diff -= Math.PI * 2;
      group.current.rotation.y += diff * delta * 5;

      if (leftLeg.current && rightLeg.current && body.current) {
        leftLeg.current.rotation.x = 0;
        rightLeg.current.rotation.x = 0;
        
        if (isWorking) {
          // Sitting pose
          body.current.position.y = 0.4;
          leftLeg.current.rotation.x = -Math.PI / 2;
          rightLeg.current.rotation.x = -Math.PI / 2;
          leftLeg.current.position.y = 0.1;
          rightLeg.current.position.y = 0.1;
          leftLeg.current.position.z = 0.2;
          rightLeg.current.position.z = 0.2;
        } else {
          // Standing pose
          body.current.position.y = 0.6 + Math.sin(time * 2) * 0.02; 
          leftLeg.current.rotation.x = 0;
          rightLeg.current.rotation.x = 0;
          leftLeg.current.position.y = -0.175;
          rightLeg.current.position.y = -0.175;
          leftLeg.current.position.z = 0;
          rightLeg.current.position.z = 0;
        }
        
        if (isTalking) {
           body.current.position.y += Math.sin(time * 25) * 0.04; 
        }
      }
    }
  });

  return (
    <group ref={group} position={[position[0], 0, position[2]]}>
      <Html position={[0, 2.2, 0]} center distanceFactor={8} zIndexRange={[100, 0]}>
        {chatText && <div className={styles.chatBubble}>{chatText}</div>}
        <div className={styles.nameTag}>{name}</div>
      </Html>
      
      <group ref={body} position={[0, 0.6, 0]}>
        {/* Head */}
        <mesh position={[0, 0.5, 0]} castShadow>
          <boxGeometry args={[0.35, 0.35, 0.35]} />
          <meshStandardMaterial color="#f1c27d" roughness={0.6} />
        </mesh>
        
        {/* Torso */}
        <mesh position={[0, 0, 0]} castShadow>
          <boxGeometry args={[0.45, 0.55, 0.25]} />
          <meshStandardMaterial color={color} roughness={0.4} />
        </mesh>
      </group>
      
      <group position={[-0.12, 0.35, 0]}>
        <mesh ref={leftLeg} position={[0, -0.175, 0]} castShadow>
          <boxGeometry args={[0.18, 0.35, 0.18]} />
          <meshStandardMaterial color={legColor} />
        </mesh>
      </group>
      <group position={[0.12, 0.35, 0]}>
        <mesh ref={rightLeg} position={[0, -0.175, 0]} castShadow>
          <boxGeometry args={[0.18, 0.35, 0.18]} />
          <meshStandardMaterial color={legColor} />
        </mesh>
      </group>
    </group>
  );
}

// --- Office Environment Component ---
function OfficeEnvironment({ activeDeskId }: { activeDeskId: number | null }) {
  return (
    <group>
      {/* Base Floor */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[30, 20]} />
        <meshStandardMaterial color="#0b101a" roughness={0.4} metalness={0.2} />
      </mesh>

      {/* Grid Lines */}
      <gridHelper args={[30, 30, '#00e5ff', '#1e293b']} position={[0, 0.01, 0]} />

      {/* Room Walls (Low Poly) */}
      <group>
        {/* Back Wall with Window */}
        <mesh position={[-10, 4, -9]} receiveShadow>
          <boxGeometry args={[10, 8, 0.2]} />
          <meshStandardMaterial color="#0b101a" />
        </mesh>
        <mesh position={[10, 4, -9]} receiveShadow>
          <boxGeometry args={[10, 8, 0.2]} />
          <meshStandardMaterial color="#0b101a" />
        </mesh>
        <mesh position={[0, 1, -9]} receiveShadow>
          <boxGeometry args={[10, 2, 0.2]} />
          <meshStandardMaterial color="#0b101a" />
        </mesh>
        <mesh position={[0, 7.5, -9]} receiveShadow>
          <boxGeometry args={[10, 1, 0.2]} />
          <meshStandardMaterial color="#0b101a" />
        </mesh>
        
        {/* Glass Window Pane */}
        <mesh position={[0, 4.5, -9]}>
          <boxGeometry args={[10, 5, 0.1]} />
          <meshPhysicalMaterial 
            color="#00e5ff" 
            transmission={0.9} 
            opacity={1} 
            roughness={0.1} 
            metalness={0.8}
            ior={1.5}
          />
        </mesh>

        {/* Side Walls */}
        <mesh position={[-15.1, 4, 0]} receiveShadow>
          <boxGeometry args={[0.2, 8, 18]} />
          <meshStandardMaterial color="#0b101a" />
        </mesh>
        <mesh position={[15.1, 4, 0]} receiveShadow>
          <boxGeometry args={[0.2, 8, 18]} />
          <meshStandardMaterial color="#0b101a" />
        </mesh>

        {/* Ceiling */}
        <mesh position={[0, 8.1, 0]} receiveShadow>
          <boxGeometry args={[30.4, 0.2, 18]} />
          <meshStandardMaterial color="#050810" />
        </mesh>

        {/* Neon Strip on Back Wall */}
        <mesh position={[0, 7.8, -8.8]}>
          <boxGeometry args={[29.8, 0.05, 0.1]} />
          <meshStandardMaterial color="#00e5ff" emissive="#00e5ff" emissiveIntensity={1} />
        </mesh>
        
        {/* Pillars */}
        <mesh position={[-14.5, 4, -8.5]} receiveShadow>
          <boxGeometry args={[1, 8, 1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
        <mesh position={[14.5, 4, -8.5]} receiveShadow>
          <boxGeometry args={[1, 8, 1]} />
          <meshStandardMaterial color="#1e293b" />
        </mesh>
      </group>

      {/* Desks and Partitions */}
      {Object.entries(DESK_CONFIG).map(([idStr, config]) => {
        const id = Number(idStr);
        const isActive = activeDeskId === id;
        
        return (
          <group key={id} position={[config.x, 0, config.z]}>
            {/* Spotlight above active desk */}
            {isActive && (
              <spotLight
                position={[0, 6, 0]}
                angle={0.6}
                penumbra={0.5}
                intensity={4}
                color="#00e5ff"
                castShadow
              />
            )}
            
            {/* Glass Partition */}
            <mesh position={[0, 0.8, -0.6]}>
              <boxGeometry args={[config.width + 1.2, 1.6, 0.05]} />
              <meshPhysicalMaterial 
                color={isActive ? "#00e5ff" : "#1e293b"} 
                transmission={0.9} 
                opacity={1} 
                metalness={0.5} 
                roughness={0.2} 
                ior={1.5} 
                thickness={0.5} 
              />
            </mesh>
            
            {/* Desk Surface */}
            <mesh position={[0, 0.7, 0]} castShadow receiveShadow>
              <boxGeometry args={[config.width, 0.05, 1.0]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            {/* Desk Legs */}
            <mesh position={[-(config.width/2 - 0.1), 0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.8]} /><meshStandardMaterial color="#0f172a" /></mesh>
            <mesh position={[(config.width/2 - 0.1), 0.35, 0]} castShadow><boxGeometry args={[0.1, 0.7, 0.8]} /><meshStandardMaterial color="#0f172a" /></mesh>
            
            {/* Monitors & Laptops */}
            {/* Monitor 1 */}
            <mesh position={[-(config.width * 0.2), 0.9, -0.3]} rotation={[0, 0.2, 0]} castShadow>
              <boxGeometry args={[0.8, 0.5, 0.05]} />
              <meshStandardMaterial color="#000" emissive={isActive ? "#00e5ff" : "#000"} emissiveIntensity={isActive ? 1.5 : 0} />
            </mesh>
            {/* Monitor Stand */}
            <mesh position={[-(config.width * 0.2), 0.75, -0.35]} castShadow>
              <boxGeometry args={[0.1, 0.3, 0.1]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* Monitor 2 */}
            <mesh position={[(config.width * 0.2), 0.9, -0.3]} rotation={[0, -0.2, 0]} castShadow>
              <boxGeometry args={[0.8, 0.5, 0.05]} />
              <meshStandardMaterial color="#000" emissive={isActive ? "#a855f7" : "#000"} emissiveIntensity={isActive ? 1.5 : 0} />
            </mesh>
            {/* Monitor Stand 2 */}
            <mesh position={[(config.width * 0.2), 0.75, -0.35]} castShadow>
              <boxGeometry args={[0.1, 0.3, 0.1]} />
              <meshStandardMaterial color="#0f172a" />
            </mesh>

            {/* Chairs */}
            <group position={[-(config.width * 0.2), 0, 0.6]}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0, 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[0, 0.4, 0.15]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
            </group>

            <group position={[(config.width * 0.2), 0, 0.6]}>
              <mesh position={[0, 0.2, 0]} castShadow>
                <cylinderGeometry args={[0.2, 0.2, 0.05, 16]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
              <mesh position={[0, 0.1, 0]} castShadow>
                <cylinderGeometry args={[0.02, 0.02, 0.2, 8]} />
                <meshStandardMaterial color="#0f172a" />
              </mesh>
              <mesh position={[0, 0.4, 0.15]} castShadow>
                <boxGeometry args={[0.3, 0.3, 0.05]} />
                <meshStandardMaterial color="#334155" />
              </mesh>
            </group>

            {/* Coffee Mugs */}
            <mesh position={[-(config.width * 0.2) + 0.4, 0.75, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.1, 16]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>
            <mesh position={[(config.width * 0.2) + 0.4, 0.75, 0]} castShadow>
              <cylinderGeometry args={[0.04, 0.04, 0.1, 16]} />
              <meshStandardMaterial color="#cbd5e1" />
            </mesh>

            {/* Label */}
            <Html position={[0, 2.5, -0.6]} center>
              <div style={{ 
                color: isActive ? '#00e5ff' : '#475569', 
                fontSize: '12px', 
                fontWeight: 800, 
                textTransform: 'uppercase', 
                letterSpacing: '3px', 
                textShadow: isActive ? '0 0 15px rgba(0, 229, 255, 0.8)' : 'none',
                fontFamily: 'Outfit, sans-serif'
              }}>
                {config.label}
              </div>
            </Html>
          </group>
        );
      })}
    </group>
  );
}

// --- Alarm Light Component ---
function AlarmLight({ active }: { active: boolean }) {
  const light = useRef<THREE.PointLight>(null);
  useFrame(({ clock }) => {
    if (active && light.current) {
      light.current.intensity = 8 + Math.sin(clock.elapsedTime * 15) * 4;
    }
  });
  if (!active) return null;
  return <pointLight ref={light} position={[0, 8, 0]} color="#ef4444" distance={50} />;
}

// --- Main Scene Container ---
interface OfficeSceneProps {
  currentStage: string | null;
  latestChat?: { role: string, message: string, id: string };
}

export const OfficeScene: React.FC<OfficeSceneProps> = ({ currentStage, latestChat }) => {
  const [chatTexts, setChatTexts] = useState<Record<string, string>>({});
  const [isAlarm, setIsAlarm] = useState(false);
  
  const activeChars = currentStage ? (STAGE_CHARS[currentStage] || []) : [];
  const activeDeskId = currentStage ? STAGE_TO_DESK[currentStage] : null;

  useEffect(() => {
    if (!latestChat) return;
    setChatTexts(prev => ({ ...prev, [latestChat.role]: latestChat.message }));

    if (latestChat.role === 'qa' && latestChat.message.includes('FAIL')) {
      setIsAlarm(true);
      setTimeout(() => setIsAlarm(false), 6000);
    }

    const timer = setTimeout(() => {
      setChatTexts(prev => {
        const next = { ...prev };
        delete next[latestChat.role];
        return next;
      });
    }, 4000);

    return () => clearTimeout(timer);
  }, [latestChat]);

  return (
    <div className={styles.scene}>
      <Canvas shadows camera={{ position: [0, 12, 18], fov: 40, near: 0.1, far: 1000 }}>
        <color attach="background" args={['#020408']} />
        
        {/* Night City Environment */}
        <Environment preset="city" background blur={0.8} />
        
        {/* Environment Decor */}
        <Sparkles count={150} scale={30} size={1.5} speed={0.2} color={isAlarm ? "#ef4444" : "#00e5ff"} opacity={0.4} />
        
        {/* Ambient Dark Lighting */}
        <ambientLight intensity={isAlarm ? 0.1 : 0.6} />
        {!isAlarm && (
          <directionalLight 
            position={[10, 15, 10]} 
            intensity={1.0} 
            castShadow 
            shadow-mapSize-width={2048} 
            shadow-mapSize-height={2048}
          />
        )}
        
        <AlarmLight active={isAlarm} />
        
        <OfficeEnvironment activeDeskId={activeDeskId} />

        {INITIAL_CHARS.map(c => {
          const isWorking = activeChars.includes(c.id);
          let targetDeskId = c.desk;
          let isVisiting = false;

          // Handoff / Visiting Logic
          if (!isWorking && currentStage) {
            if (currentStage === 'design' && c.id === 'pm') { targetDeskId = 2; isVisiting = true; }
            if (currentStage === 'dev' && c.id === 'designer') { targetDeskId = 3; isVisiting = true; }
            if (currentStage === 'qa' && (c.id === 'dev1' || c.id === 'dev2')) { targetDeskId = 4; isVisiting = true; }
            if (currentStage === 'deploy' && c.id === 'qa') { targetDeskId = 5; isVisiting = true; }
          }
          
          const conf = DESK_CONFIG[targetDeskId];
          let targetX = conf.x + c.slotX;
          let targetZ = conf.z + 2.5; 

          if (isWorking) {
            targetZ = conf.z + 0.6; // Sit at desk
          } else if (isVisiting) {
            targetX = conf.x + (c.slotX >= 0 ? 1.5 : -1.5);
            targetZ = conf.z + 1.5;
          }

          return (
            <VoxelCharacter
              key={c.id}
              name={c.name}
              color={c.color}
              position={[targetX, 0, targetZ]}
              isWorking={isWorking}
              isTalking={!!chatTexts[c.id]}
              chatText={chatTexts[c.id]}
            />
          );
        })}

        <ContactShadows position={[0, 0.02, 0]} opacity={0.8} scale={40} blur={2.5} far={4} />

        <OrbitControls 
          enablePan={true} 
          enableZoom={true} 
          minDistance={5} 
          maxDistance={25}
          maxPolarAngle={Math.PI / 2 - 0.1}
        />

        {/* Post-Processing for Glowing Neon */}
        <EffectComposer enableNormalPass>
          <Bloom luminanceThreshold={isAlarm ? 0.2 : 0.8} mipmapBlur intensity={isAlarm ? 2 : 1.2} />
        </EffectComposer>
      </Canvas>
    </div>
  );
}
