# 🗺️ Roadmap Completo — Mani Manicraft (MVP → Survival Completo)

> **Objetivo:** mapear TODO o caminho do MVP atual até um Minecraft "survival
> completo" (single-player), destrinchado em fases e dividido entre os três.
> Este é o documento **master**: define as fases, a matriz de features, os
> contratos novos e a ordem. O detalhe de cada tarefa está nos arquivos por
> pessoa: `POS-MVP-RODRIGO.md`, `POS-MVP-BRAYAN.md`, `POS-MVP-JAPA.md`.

> **Escopo escolhido:** Survival Completo. Inclui construir, texturas, mundo
> procedural em chunks, inventário, minerar com progresso, vida/fome, dia-noite,
> crafting, mobs com IA, combate, biomas, estruturas e sons.
> **Fora do escopo** (paridade total, fica pra um "Roadmap Endgame"): multiplayer,
> redstone, Nether/End, encantamentos, mods.

---

## 📌 Onde estamos (Fases 1–3 = MVP, ✅ concluído)

O MVP entregou a base sobre a qual TUDO isto se apoia:
- `worldStore` (Zustand) como **fonte única da verdade** do mundo.
- `types/world.ts` (contrato) · `aabb.ts` (colisão) · `Blocks.tsx` (InstancedMesh)
- `Player.tsx` (game loop, WASD, gravidade, pulo, colisão, raycast quebrar).

> ⚠️ **Regra que não muda nunca:** estado de 60fps (posição/velocidade) fica em
> `useRef`; estado por evento (mundo, inventário, vida) fica no Zustand com
> `new Map/new Array` a cada escrita. Todas as fases abaixo respeitam isto.

---

## 🧭 As Fases (4 → 12)

| Fase | Tema | Entrega o quê | Dono principal |
|---|---|---|---|
| **4** | Construção | Colocar blocos, hotbar funcional, highlight do alvo | Rodrigo + Japa |
| **5** | Texturas e tipos | Atlas de texturas, faces por lado, +tipos de bloco, blocos não-sólidos | Brayan + Japa |
| **6** | Mundo procedural | Relevo com ruído (Perlin), colunas de altura, seed, chunks | Japa + Brayan |
| **7** | Render em chunks | Face culling, rebuild por chunk, frustum/distance culling | Brayan |
| **8** | Inventário + mineração | Slots/stacks, drops, pickup, minerar por dureza com "crack" | Japa + Rodrigo |
| **9** | Sobrevivência | Vida/fome, dano de queda, água/nado, sprint, dia-noite, luz | Rodrigo + Japa + Brayan |
| **10** | Crafting | Receitas 2x2/3x3, bancada, UI de crafting | Japa + Brayan |
| **11** | Mobs + combate | Entidades, IA (wander/chase/flee), combate, knockback, drops | Japa + Rodrigo + Brayan |
| **12** | Mundo vivo | Biomas, árvores/estruturas, partículas, sons, salvar/carregar | Japa + Brayan |

---

## 🧩 Matriz de features × dono

Legenda: 🟢 dono / 🔵 colabora / ⚪ consome

| Feature | Rodrigo (Física/Gameplay) | Brayan (Gráficos/Mundo) | Japa (Núcleo/UI/Infra) |
|---|---|---|---|
| Colocar bloco (`addBlock`) | 🟢 raycast +normal | ⚪ render reage | 🟢 `addBlock` no store |
| Highlight do bloco mirado | 🔵 passa o alvo | 🟢 wireframe/overlay | ⚪ |
| Texturas / atlas / UV | ⚪ | 🟢 | 🔵 define IDs |
| Faces diferentes (topo/lado) | — | 🟢 | 🔵 tabela por bloco |
| Blocos não-sólidos (água/folhas) | 🔵 colisão ignora | 🔵 material transparente | 🟢 tabela `solid` |
| Ruído/relevo (Perlin, seed) | ⚪ spawn | 🔵 | 🟢 gerador |
| Chunks (dados) | ⚪ | 🔵 | 🟢 store por chunk |
| Face culling / meshing | — | 🟢 | ⚪ |
| Frustum/distance culling | — | 🟢 | — |
| Inventário (slots/stacks) | ⚪ usa item | 🔵 UI grid | 🟢 modelo |
| Drops + pickup | 🔵 colisão de item | 🔵 render do item no chão | 🟢 entidades item |
| Minerar por dureza + crack | 🟢 segurar clique/tempo | 🟢 overlay de trinca | 🔵 dureza por bloco |
| Vida / fome / respawn | 🔵 dano de queda | 🔵 HUD corações | 🟢 stats |
| Água / nado / sprint / agachar | 🟢 | ⚪ | ⚪ |
| Ciclo dia-noite | ⚪ | 🟢 sol/céu | 🔵 relógio do mundo |
| Iluminação por bloco (light) | — | 🟢 render | 🔵 propagação de luz |
| Crafting (receitas) | 🔵 abrir bancada | 🔵 UI | 🟢 receitas |
| Mobs: física | 🟢 reusa `aabb` | 🔵 modelo/anim | 🔵 |
| Mobs: IA / spawn | 🔵 | ⚪ | 🟢 sistema de entidades |
| Combate / knockback | 🟢 | 🔵 feedback | 🔵 dano/vida |
| Biomas | ⚪ | 🔵 cor/névoa | 🟢 mapa de biomas |
| Estruturas (árvores/vilas) | — | 🔵 | 🟢 geração |
| Partículas | — | 🟢 | — |
| Sons | 🔵 passos | ⚪ | 🟢 sistema de áudio |
| Salvar / carregar | ⚪ | ⚪ | 🟢 persistência |

---

## 🔗 Novos contratos centrais (todos dependem — Japa é o dono)

Estes ampliam o contrato do MVP. **Definir a assinatura ANTES de cada fase.**

```typescript
// types/world.ts — ampliar
export enum BlockType {
  AIR=0, GRASS=1, DIRT=2, STONE=3,
  // Fase 5+:
  WOOD=4, LEAVES=5, SAND=6, WATER=7,
  COBBLESTONE=8, PLANKS=9, GLASS=10, COAL_ORE=11, IRON_ORE=12, /* ... */
}

// Propriedades por bloco (Fase 5) — tabela única consultada por todos.
export interface BlockDef {
  solid: boolean;        // colide? (Rodrigo)
  transparent: boolean;  // deixa ver através? (Brayan face culling)
  hardness: number;      // segundos base pra minerar (Rodrigo/Japa)
  drops: BlockType;      // o que cai ao quebrar (Japa)
  texture: TextureFaces; // topo/lado/baixo no atlas (Brayan)
}
export const BLOCKS: Record<BlockType, BlockDef>;

// worldStore — novos métodos
addBlock(x,y,z, type): void;          // Fase 4  (Rodrigo consome)
getChunk(cx,cz): Chunk;               // Fase 6  (Brayan consome)
// inventário (Fase 8), stats (Fase 9), entidades (Fase 11) — ver docs por pessoa
```

> **Regra de ouro do contrato:** ninguém chama o código do outro direto. Tudo
> passa pelo `worldStore` (dados) ou por funções puras exportadas (`aabb`, ruído,
> receitas). Mudou uma assinatura? Avisa o time antes.

---

## 🔒 Grafo de dependências (o que destrava o quê)

```
Fase 4 (colocar)      → precisa: MVP. Destrava: construção livre.
Fase 5 (texturas/tipos) → precisa: 4. Destrava: variedade visual + blocos especiais.
Fase 6 (procedural)   → precisa: 5 (tipos). Destrava: mundo grande.
Fase 7 (render chunks)→ precisa: 6 (chunks). Destrava: performance p/ mundo grande.
Fase 8 (inventário)   → precisa: 5 (drops/tipos). Destrava: economia de itens.
Fase 9 (survival)     → precisa: 6 (mundo) + 8 (comida/itens). Destrava: "sobreviver".
Fase 10 (crafting)    → precisa: 8 (inventário). Destrava: progressão.
Fase 11 (mobs)        → precisa: 6 + 9 (vida/combate). Destrava: perigo/vida.
Fase 12 (mundo vivo)  → precisa: 6 (biomas na geração) + tudo. Polimento final.
```

> **Caminho crítico:** 4 → 5 → 6 → 7 é a espinha dorsal. As fases 8, 9, 10, 11
> podem correr parcialmente em paralelo assim que 6 existir.

---

## 📅 Ordem recomendada de execução (por pessoa)

- **Japa (núcleo, sempre à frente):** ampliar `BLOCKS`/tipos (5) → gerador de ruído
  + chunks (6) → inventário (8) → stats + relógio (9) → receitas (10) → entidades
  + IA (11) → biomas + save/load (12).
- **Brayan (segue os dados do Japa):** highlight (4) → atlas/texturas (5) → chunk
  meshing + culling (6–7) → UI inventário (8) → dia-noite + luz (9) → UI crafting
  (10) → modelos de mob (11) → partículas + biomas visuais (12).
- **Rodrigo (gameplay em cima do núcleo):** colocar bloco (4) → colisão de blocos
  não-sólidos (5) → minerar por dureza (8) → dano de queda + água + sprint (9) →
  interagir/abrir bancada (10) → física de mob + combate (11) → sons de passo (12).

---

## ✅ Definições de "fase pronta" (resumo)

| Fase | Pronta quando... |
|---|---|
| 4 | Dá pra colocar E quebrar blocos; o bloco mirado fica destacado. |
| 5 | Blocos têm textura; grama tem topo verde e lado diferente; água não colide. |
| 6 | O mundo tem morros/vales gerados por seed, em vários chunks. |
| 7 | Roda liso com mundo grande; faces internas não são desenhadas. |
| 8 | Quebrar dropa item; o item entra no inventário; minerar leva tempo por dureza. |
| 9 | Player tem vida/fome; cair machuca; existe dia e noite. |
| 10 | Dá pra abrir a bancada e transformar itens em outros via receita. |
| 11 | Existem mobs que andam, perseguem/fogem, e podem ser mortos (dropam item). |
| 12 | O mundo tem biomas e árvores, faz som, e pode ser salvo e recarregado. |

---

## 🎯 Definição de "Survival Completo pronto"

O jogador nasce num mundo gerado por seed, com dia e noite. Ele **minera** blocos
(cada um no seu tempo), **coleta** os drops no inventário, **cria** ferramentas e
blocos na bancada, **constrói** livremente, **sobrevive** a mobs que aparecem à
noite (com vida e fome contando), tudo rodando liso em chunks — e pode **salvar**
e voltar depois. Sem re-render por frame.

---

> Continue nos arquivos por pessoa. Cada tarefa lá segue o padrão da casa:
> **🎮 No Minecraft** · **✅ Pronto quando** · **💡 Dica**, com os `[ ]` pra marcar.
