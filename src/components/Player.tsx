// src/components/Player.tsx
// =====================================================================
// RODRIGO — Engenheiro de Física e Gameplay.
// Câmera FPS + WASD + gravidade + colisão AABB + pulo.
// Game loop em useFrame. Estado rápido em REFS (nunca setState por frame).
// Consome playerCollides() do aabb.ts (dono: Japa).
// =====================================================================
'use client';
import { useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PointerLockControls } from '@react-three/drei';
import * as THREE from 'three';
import { playerCollides, PLAYER_EYE } from '@/physics/aabb';
import { useKeyboard } from '@/physics/useKeyboard';
import { useBreakBlock } from '@/physics/useBreakBlock';

const GRAVITY = -28; // mais forte que 9.8 -> sensação de jogo (menos "lunar")
const MOVE_SPEED = 5; // blocos por segundo
const JUMP_SPEED = 9; // velocidade vertical inicial do pulo

// Vetores reutilizáveis (evita alocar objeto novo a cada frame).
const forward = new THREE.Vector3();
const right = new THREE.Vector3();
const move = new THREE.Vector3();

export function Player() {
  const { camera } = useThree();

  // ESTADO RÁPIDO em refs (Regra de Ouro 1: NUNCA setState por frame).
  const feet = useRef(new THREE.Vector3(8, 1, 8)); // posição dos PÉS
  const velocity = useRef(new THREE.Vector3(0, 0, 0));
  const onGround = useRef(false);

  const keys = useKeyboard();
  useBreakBlock(); // registra o clique de quebrar bloco

  useFrame((_, rawDelta) => {
    // Clamp do delta: se a aba perdeu o foco, delta gigante faz o player
    // "teleportar" e atravessar paredes. Limitamos a 50ms.
    const delta = Math.min(rawDelta, 0.05);
    const k = keys.current;

    // 1) DIREÇÃO horizontal baseada em para onde a câmera olha.
    camera.getWorldDirection(forward);
    forward.y = 0;
    forward.normalize();
    right.crossVectors(forward, camera.up).normalize();

    move.set(0, 0, 0);
    if (k['KeyW']) move.add(forward);
    if (k['KeyS']) move.sub(forward);
    if (k['KeyD']) move.add(right);
    if (k['KeyA']) move.sub(right);
    if (move.lengthSq() > 0) move.normalize().multiplyScalar(MOVE_SPEED);

    velocity.current.x = move.x;
    velocity.current.z = move.z;

    // 2) GRAVIDADE (integração de Euler semi-implícita).
    velocity.current.y += GRAVITY * delta;

    // 3) PULO: só quando está no chão.
    if (k['Space'] && onGround.current) {
      velocity.current.y = JUMP_SPEED;
      onGround.current = false;
    }

    // 4) MOVER E RESOLVER UM EIXO POR VEZ (o segredo do AABB voxel).
    const p = feet.current;

    // --- Eixo X ---
    p.x += velocity.current.x * delta;
    if (playerCollides(p.x, p.y, p.z)) {
      p.x -= velocity.current.x * delta; // desfaz: bateu na parede
      velocity.current.x = 0;
    }

    // --- Eixo Z ---
    p.z += velocity.current.z * delta;
    if (playerCollides(p.x, p.y, p.z)) {
      p.z -= velocity.current.z * delta;
      velocity.current.z = 0;
    }

    // --- Eixo Y (chão e teto) ---
    p.y += velocity.current.y * delta;
    if (playerCollides(p.x, p.y, p.z)) {
      p.y -= velocity.current.y * delta;
      // Se estava CAINDO (vel < 0) e bateu -> tocou o chão.
      onGround.current = velocity.current.y < 0;
      velocity.current.y = 0;
    } else {
      onGround.current = false;
    }

    // 5) Câmera segue os olhos do player (pés + altura dos olhos).
    camera.position.set(p.x, p.y + PLAYER_EYE, p.z);
  });

  // PointerLockControls trava o mouse e faz o mouselook (girar a câmera).
  return <PointerLockControls />;
}
