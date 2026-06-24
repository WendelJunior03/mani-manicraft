// src/components/Blocks.tsx
// =====================================================================
// BRAYAN — Engenheiro de Gráficos.
// Desenha TODOS os blocos com UM ÚNICO InstancedMesh (1 draw call).
// Reage sozinho quando a Map de blocos muda no store.
// =====================================================================
'use client';
import { useMemo, useRef, useLayoutEffect } from 'react';
import * as THREE from 'three';
import { useWorldStore } from '@/store/worldStore';
import { BlockType, parseKey } from '@/types/world';

// Objeto reutilizável (a "agulha de costura") — criado UMA vez, fora do componente.
const dummy = new THREE.Object3D();
const color = new THREE.Color();

// Cores por tipo de bloco. (No MVP usamos cor sólida; textura fica pós-MVP.)
const COLORS: Record<BlockType, string> = {
  [BlockType.AIR]: '#000000',
  [BlockType.GRASS]: '#5fbb4d',
  [BlockType.DIRT]: '#8b5a2b',
  [BlockType.STONE]: '#888888',
};

const MAX_INSTANCES = 4096; // 16x16 com folga para crescer

export function Blocks() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  // Lê a Map do store. Só recalcula quando 'blocks' muda (ex: quebrou bloco).
  const blocks = useWorldStore((s) => s.blocks);

  // Transforma a Map em lista posicional. useMemo evita recalcular por frame.
  const instances = useMemo(() => {
    const list: { x: number; y: number; z: number; type: BlockType }[] = [];
    for (const [key, type] of blocks) {
      const { x, y, z } = parseKey(key);
      list.push({ x, y, z, type });
    }
    return list;
  }, [blocks]);

  // Após render: escreve a matriz e a cor de cada instância.
  // useLayoutEffect = roda antes do navegador pintar a tela (sem flicker).
  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;

    instances.forEach((b, i) => {
      dummy.position.set(b.x, b.y, b.z); // posiciona no grid (unidade = 1 bloco)
      dummy.updateMatrix(); // calcula a Matrix4 a partir da posição
      mesh.setMatrixAt(i, dummy.matrix); // grava na instância i
      mesh.setColorAt(i, color.set(COLORS[b.type]));
    });

    mesh.count = instances.length; // quantas instâncias desenhar
    mesh.instanceMatrix.needsUpdate = true; // avisa a GPU: matrizes mudaram
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
  }, [instances]);

  return (
    // args: [geometria, material, contagem MÁXIMA]. Passamos null/null e
    // declaramos geometria+material como filhos (forma idiomática do R3F).
    <instancedMesh
      ref={meshRef}
      args={[null as never, null as never, MAX_INSTANCES]}
      name="world-blocks" // Rodrigo acha por este nome no raycast
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial vertexColors />
    </instancedMesh>
  );
}
