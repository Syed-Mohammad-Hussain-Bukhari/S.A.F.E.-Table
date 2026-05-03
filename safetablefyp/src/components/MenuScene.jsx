import { Canvas } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera, Environment } from "@react-three/drei";

import { Suspense } from "react";


// Simple 3D Dish Component
const Dish3D = ({ position }) => {
  return (
    <group position={position}>
      {/* Plate */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
        <cylinderGeometry args={[1.5, 1.5, 0.1, 32]} />
        <meshStandardMaterial color="#ffffff" metalness={0.3} roughness={0.4} />
      </mesh>
      
      {/* Food - Steak representation */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[1.2, 0.4, 0.8]} />
        <meshStandardMaterial color="#8B4513" metalness={0.2} roughness={0.8} />
      </mesh>
      
      {/* Garnish 1 */}
      <mesh position={[0.5, 0.35, 0.3]}>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color="#FF4500" metalness={0.1} roughness={0.6} />
      </mesh>
      
      {/* Garnish 2 */}
      <mesh position={[-0.5, 0.35, 0.2]}>
        <sphereGeometry args={[0.12, 16, 16]} />
        <meshStandardMaterial color="#32CD32" metalness={0.1} roughness={0.6} />
      </mesh>
      
      {/* Sauce */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0.8, 0.11, 0.5]}>
        <circleGeometry args={[0.3, 32]} />
        <meshStandardMaterial color="#8B0000" metalness={0.8} roughness={0.2} />
      </mesh>
    </group>);

};

// Loading placeholder
const LoadingBox = () => {
  return (
    <mesh>
      <boxGeometry args={[2, 2, 2]} />
      <meshStandardMaterial color="#00d4ff" wireframe />
    </mesh>);

};

const MenuScene = () => {
  return (
    <div className="relative w-full h-[600px] rounded-2xl overflow-hidden border-2 border-primary/20">
      {/* Canvas Instructions */}
      <div className="absolute top-4 left-4 z-10 glass-morphism px-4 py-2 rounded-lg text-sm text-foreground">
        <p className="font-semibold mb-1">🖱️ Interactive 3D Menu</p>
        <p className="text-muted-foreground text-xs">Click & drag to rotate • Scroll to zoom</p>
      </div>

      <Canvas shadows>
        <PerspectiveCamera makeDefault position={[0, 3, 6]} fov={50} />
        <OrbitControls
          enablePan={false}
          minDistance={3}
          maxDistance={10}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 2} />
        
        
        {/* Lighting */}
        <ambientLight intensity={0.5} />
        <directionalLight
          position={[5, 5, 5]}
          intensity={1}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048} />
        
        <pointLight position={[-5, 5, 5]} intensity={0.5} color="#00d4ff" />
        <pointLight position={[5, 5, -5]} intensity={0.5} color="#b400ff" />
        
        {/* Environment */}
        <Environment preset="studio" />
        
        {/* 3D Dish */}
        <Suspense fallback={<LoadingBox />}>
          <Dish3D position={[0, 0, 0]} />
        </Suspense>
        
        {/* Ground */}
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.5, 0]} receiveShadow>
          <planeGeometry args={[20, 20]} />
          <meshStandardMaterial color="#0a0a0f" metalness={0.8} roughness={0.2} />
        </mesh>
      </Canvas>

      {/* Glow Effect */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-gradient-to-t from-primary/10 via-transparent to-transparent" />
      </div>
    </div>);

};

export default MenuScene;