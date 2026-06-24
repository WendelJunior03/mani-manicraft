// src/components/HUD.tsx
// =====================================================================
// JAPA — Overlay 2D em HTML puro, POR CIMA do <Canvas>.
// pointer-events:none deixa os cliques atravessarem para o jogo.
// =====================================================================
'use client';
import { useEffect } from 'react';
import { useWorldStore } from '@/store/worldStore';
import { BlockType } from '@/types/world';

const HOTBAR: BlockType[] = [BlockType.GRASS, BlockType.DIRT, BlockType.STONE];
const LABELS: Record<number, string> = {
  [BlockType.GRASS]: 'Grama',
  [BlockType.DIRT]: 'Terra',
  [BlockType.STONE]: 'Pedra',
};

export function HUD() {
  // Seletores: este componente só re-renderiza quando ESTES campos mudam.
  const selectedSlot = useWorldStore((s) => s.selectedSlot);
  const setSelectedSlot = useWorldStore((s) => s.setSelectedSlot);
  const destroyed = useWorldStore((s) => s.blocksDestroyed);

  // Teclas 1..n trocam o slot da hotbar.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const n = parseInt(e.key, 10);
      if (n >= 1 && n <= HOTBAR.length) setSelectedSlot(n - 1);
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setSelectedSlot]);

  return (
    // pointer-events:none -> cliques ATRAVESSAM o HUD e chegam ao jogo.
    <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none', userSelect: 'none' }}>
      {/* Mira central (crosshair) */}
      <div
        style={{
          position: 'absolute', top: '50%', left: '50%',
          width: 6, height: 6, marginLeft: -3, marginTop: -3,
          background: '#fff', borderRadius: '50%', mixBlendMode: 'difference',
        }}
      />

      {/* Contador de blocos quebrados */}
      <div
        style={{
          position: 'absolute', top: 12, left: 12,
          color: '#fff', fontFamily: 'monospace', fontSize: 14,
          textShadow: '0 1px 2px rgba(0,0,0,0.8)',
        }}
      >
        Blocos quebrados: {destroyed}
      </div>

      {/* Dica de controles */}
      <div
        style={{
          position: 'absolute', top: 12, right: 12,
          color: '#fff', fontFamily: 'monospace', fontSize: 12, textAlign: 'right',
          textShadow: '0 1px 2px rgba(0,0,0,0.8)', opacity: 0.85,
        }}
      >
        Clique para travar o mouse · WASD mover · Espaço pular · Clique quebrar
      </div>

      {/* Hotbar */}
      <div
        style={{
          position: 'absolute', bottom: 16, left: '50%', transform: 'translateX(-50%)',
          display: 'flex', gap: 4,
        }}
      >
        {HOTBAR.map((type, i) => (
          <div
            key={i}
            style={{
              width: 48, height: 48, border: '2px solid',
              borderColor: selectedSlot === i ? '#fff' : '#555',
              background: 'rgba(0,0,0,0.4)', color: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontFamily: 'monospace', textAlign: 'center',
            }}
          >
            {LABELS[type]}
          </div>
        ))}
      </div>
    </div>
  );
}
