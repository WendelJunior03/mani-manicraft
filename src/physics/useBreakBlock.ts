// src/physics/useBreakBlock.ts
// =====================================================================
// RODRIGO — Raycasting para quebrar o bloco mirado ao clicar.
// =====================================================================
'use client';
import { useEffect } from 'react';
import { useThree } from '@react-three/fiber';
import * as THREE from 'three';
import { useWorldStore } from '@/store/worldStore';

const REACH = 5; // alcance máximo, em blocos
const raycaster = new THREE.Raycaster();
const CENTER = new THREE.Vector2(0, 0); // centro da tela (a mira do FPS)

export function useBreakBlock() {
  const { camera, scene } = useThree();

  useEffect(() => {
    function onMouseDown() {
      // Raio do centro da câmera para frente.
      raycaster.setFromCamera(CENTER, camera);
      raycaster.far = REACH;

      const target = scene.getObjectByName('world-blocks'); // mesh do Brayan
      if (!target) return;

      const hits = raycaster.intersectObject(target, false);
      if (hits.length === 0 || !hits[0].face) return;

      const hit = hits[0];
      // normal = face atingida (aponta para FORA do bloco).
      const normal = hit.face!.normal.clone();

      // O ponto de impacto está NA superfície. Recuar METADE de bloco na
      // direção da normal cai DENTRO do bloco mirado. Floor -> grid inteiro.
      const inside = hit.point.clone().addScaledVector(normal, -0.5);
      const bx = Math.floor(inside.x);
      const by = Math.floor(inside.y);
      const bz = Math.floor(inside.z);

      useWorldStore.getState().removeBlock(bx, by, bz); // ESCREVE no store
    }

    document.addEventListener('mousedown', onMouseDown);
    return () => document.removeEventListener('mousedown', onMouseDown);
  }, [camera, scene]);
}
