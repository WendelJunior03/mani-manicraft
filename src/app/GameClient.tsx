// src/app/GameClient.tsx
// =====================================================================
// JAPA — carrega o 3D SOMENTE no cliente (WebGL não roda no servidor).
// =====================================================================
'use client';
import dynamic from 'next/dynamic';
import { HUD } from '@/components/HUD';

// ssr:false -> Three.js nunca tenta rodar no servidor.
const Scene = dynamic(() => import('@/components/Scene').then((m) => m.Scene), {
  ssr: false,
  loading: () => (
    <div style={{ color: '#fff', fontFamily: 'monospace', padding: 24 }}>
      Carregando mundo...
    </div>
  ),
});

export function GameClient() {
  return (
    <div style={{ position: 'fixed', inset: 0, overflow: 'hidden', background: '#000' }}>
      <Scene /> {/* canvas 3D (Rodrigo e Brayan) */}
      <HUD />   {/* overlay HTML por cima (Japa) */}
    </div>
  );
}
