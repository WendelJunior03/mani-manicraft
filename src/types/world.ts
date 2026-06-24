// src/types/world.ts
// =====================================================================
// A "LINGUAGEM COMUM" do projeto. Rodrigo, Brayan e Japa importam daqui.
// NÃO altere sem avisar o time — é o contrato central.
// =====================================================================

/** Tipos de bloco do MVP. Number compara mais rápido que string. */
export enum BlockType {
  AIR = 0, // ausência de bloco (não desenha, não colide)
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
}

/** Coordenada inteira no grid. Sempre números inteiros. */
export interface Vec3 {
  x: number;
  y: number;
  z: number;
}

/**
 * Gera a chave única de um bloco no mapa. SEMPRE usar esta função
 * (nunca montar a string "x,y,z" na mão em outro lugar).
 */
export function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}

/** Caminho inverso: transforma a chave "x,y,z" de volta em números. */
export function parseKey(key: string): Vec3 {
  const [x, y, z] = key.split(',').map(Number);
  return { x, y, z };
}
