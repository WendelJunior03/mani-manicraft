// src/store/worldStore.ts
// =====================================================================
// A ÚNICA fonte da verdade do jogo. DONO: Japa.
// Brayan LÊ (render). Rodrigo LÊ (colisão) e ESCREVE (quebrar).
// =====================================================================
import { create } from 'zustand';
import { BlockType, blockKey } from '@/types/world';

interface WorldState {
  // --- DADOS ---
  blocks: Map<string, BlockType>; // chave "x,y,z" -> tipo de bloco
  selectedSlot: number; // slot ativo da hotbar (0..n)
  blocksDestroyed: number; // contador para o HUD
  blocksPlaced: number; //contador para o HUD

  // --- LEITURA (Brayan render / Rodrigo colisão) ---
  getBlock: (x: number, y: number, z: number) => BlockType;

  // --- ESCRITA (Rodrigo ao quebrar via raycast) ---
  removeBlock: (x: number, y: number, z: number) => void;
  addBlock: (x: number, y: number, z: number, blockType: BlockType) => void;
  
  // --- UI (Japa) ---
  setSelectedSlot: (slot: number) => void;
  generateFlatWorld: () => void;
}

export const useWorldStore = create<WorldState>((set, get) => ({
  blocks: new Map(),
  selectedSlot: 0,
  blocksDestroyed: 0,
  blocksPlaced: 0,

  getBlock: (x, y, z) => {
    return get().blocks.get(blockKey(x, y, z)) ?? BlockType.AIR;
  },

  removeBlock: (x, y, z) => {
    set((state) => {
      // IMPORTANTE: cria uma NOVA Map. Se mutar a antiga, o React/R3F
      // não percebe a mudança e o render NÃO atualiza.
      const next = new Map(state.blocks);
      const existed = next.delete(blockKey(x, y, z));
      return existed
        ? { blocks: next, blocksDestroyed: state.blocksDestroyed + 1 }
        : state; // nada mudou -> não dispara re-render
    });
  },

  addBlock: (x, y, z, blockType) => {
    set((state) => {
      const key = blockKey(x, y, z);
      if (state.blocks.get(key) === blockType) return state; 
      const next = new Map(state.blocks); 
      next.set(key, blockType);
      return { blocks: next, blocksPlaced: state.blocksPlaced + 1 };
    });
  },

  setSelectedSlot: (slot) => set({ selectedSlot: slot }),

  // Mundo plano 16x16: uma camada de grama em y = 0.
  generateFlatWorld: () => {
    const blocks = new Map<string, BlockType>();
    for (let x = 0; x < 16; x++) {
      for (let z = 0; z < 16; z++) {
        blocks.set(blockKey(x, 0, z), BlockType.GRASS);
      }
    }
    set({ blocks });
  },
}));
