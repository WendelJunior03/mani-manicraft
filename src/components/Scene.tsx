// src/components/Scene.tsx
// =====================================================================
// BRAYAN — monta a cena 3D. Rodrigo pluga o <Player /> aqui dentro.
// =====================================================================
'use client';
import { Canvas } from '@react-three/fiber';
import { useEffect } from 'react';
import { Blocks } from './Blocks';
import { Player } from './Player';
import { useWorldStore } from '@/store/worldStore';

export function Scene() {
  const generateFlatWorld = useWorldStore((s) => s.generateFlatWorld);

  // Gera o mundo plano 16x16 uma vez, quando a cena monta.
  useEffect(() => {
    generateFlatWorld();
  }, [generateFlatWorld]);

  return (
    <Canvas shadows camera={{ fov: 75, position: [8, 3, 20] }}>
      {/* Céu simples */}
      <color attach="background" args={['#87ceeb']} />

      {/* Iluminação */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 20, 10]} intensity={1} castShadow />

      {/* Mundo (Brayan) */}
      <Blocks />

      {/* Player + câmera FPS (Rodrigo) */}
      <Player />
    </Canvas>
  );
}
