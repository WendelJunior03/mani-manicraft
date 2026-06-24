// src/physics/aabb.ts
// =====================================================================
// JAPA — Matemática de colisão AABB (Axis-Aligned Bounding Box).
// O "núcleo difícil": Rodrigo consome playerCollides() daqui no game loop.
// O player é uma caixa; cada bloco é uma caixa 1x1x1.
// =====================================================================
import { useWorldStore } from '@/store/worldStore';
import { BlockType } from '@/types/world';

// Dimensões do player (em unidades de bloco).
export const PLAYER_HALF_WIDTH = 0.3; // metade da largura (raio horizontal)
export const PLAYER_HEIGHT = 1.8;
export const PLAYER_EYE = 1.6; // altura dos olhos (câmera) a partir dos pés

/**
 * Duas AABB colidem SE E SOMENTE SE há sobreposição nos 3 eixos ao mesmo tempo.
 * boxA = player (min/max), boxB = bloco (canto mínimo bx,by,bz; lado = 1).
 */
function boxesOverlap(
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number,
  bx: number, by: number, bz: number,
): boolean {
  return (
    minX < bx + 1 && maxX > bx && // sobreposição no eixo X
    minY < by + 1 && maxY > by && // sobreposição no eixo Y
    minZ < bz + 1 && maxZ > bz    // sobreposição no eixo Z
  );
}

/**
 * O player (cujos PÉS estão em px,py,pz) colide com algum bloco sólido?
 * py é a coordenada dos PÉS; a caixa do player vai de py até py + PLAYER_HEIGHT.
 *
 * Usamos getState() (e não o hook) porque isto roda dentro do game loop e
 * NÃO queremos provocar re-render do React.
 */
export function playerCollides(px: number, py: number, pz: number): boolean {
  const getBlock = useWorldStore.getState().getBlock;

  // Limites (min/max) da caixa do player.
  const minX = px - PLAYER_HALF_WIDTH, maxX = px + PLAYER_HALF_WIDTH;
  const minY = py, maxY = py + PLAYER_HEIGHT;
  const minZ = pz - PLAYER_HALF_WIDTH, maxZ = pz + PLAYER_HALF_WIDTH;

  // Só testa os blocos AO REDOR do player (não o mundo inteiro!).
  // Math.floor encontra os índices inteiros do grid que a caixa toca.
  for (let bx = Math.floor(minX); bx <= Math.floor(maxX); bx++) {
    for (let by = Math.floor(minY); by <= Math.floor(maxY); by++) {
      for (let bz = Math.floor(minZ); bz <= Math.floor(maxZ); bz++) {
        if (getBlock(bx, by, bz) === BlockType.AIR) continue; // ar não colide
        if (boxesOverlap(minX, minY, minZ, maxX, maxY, maxZ, bx, by, bz)) {
          return true;
        }
      }
    }
  }
  return false;
}
