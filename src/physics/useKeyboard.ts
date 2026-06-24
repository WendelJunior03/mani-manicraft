// src/physics/useKeyboard.ts
// =====================================================================
// RODRIGO — captura o teclado em um ref (sem re-render).
// Retorna um ref<{ [code]: boolean }> lido dentro do useFrame.
// =====================================================================
'use client';
import { useEffect, useRef } from 'react';

export function useKeyboard() {
  const keys = useRef<Record<string, boolean>>({});

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      keys.current[e.code] = true;
    };
    const up = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    window.addEventListener('keydown', down);
    window.addEventListener('keyup', up);
    return () => {
      window.removeEventListener('keydown', down);
      window.removeEventListener('keyup', up);
    };
  }, []);

  return keys;
}
