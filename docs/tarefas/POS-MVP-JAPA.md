# 🧠 Pós-MVP do Japa — Núcleo (Store, Dados, Sistemas, UI e Infra)

> **Seu papel:** você é o mais experiente do time, então continua levando **as peças
> mais difíceis e de maior risco** — tudo que é *núcleo*: o gerador de mundo, os
> chunks, o inventário, os sistemas de sobrevivência, o crafting, o motor de
> entidades (ECS-lite), os biomas e o save/load. É a fundação em que Rodrigo
> (gameplay/física) e Brayan (render/UI) constroem em cima.

> **Suas entregas DESTRAVAM o Rodrigo e o Brayan.** Se o `worldStore` não expõe
> `getChunk`, o Brayan não consegue fazer meshing por chunk. Se `BLOCKS` não tem
> `solid`, o Rodrigo não sabe no que colidir. Se o inventário não é imutável, o
> grid do Brayan não atualiza. **Você vai na frente; eles seguem seus dados.**

> Como usar este doc: vá marcando os `[ ]` conforme termina. Cada tarefa tem
> **🎮 No Minecraft** (a feature equivalente no jogo original), **✅ Pronto quando**
> (definição de pronto, de preferência verificável no console) e **💡 Dica**.

---

## 🥇 A Regra de Ouro (vale pra TODAS as fases abaixo)

> **NUNCA mute a `Map`/`Array` antigos. SEMPRE crie `new Map(...)` / `new Array` /
> objeto novo a cada escrita.** Isso vale para blocos, inventário, entidades,
> stats, chunks — **tudo**. Se você `state.blocks.set(...)` ou `state.inventory[i].count++`
> direto, o React/R3F **não percebe** a mudança e o render do Brayan **não atualiza**.
> É o bug nº 1 do projeto e ele volta em toda fase nova. Padrão fixo:

```typescript
set((state) => {
  const next = new Map(state.blocks); // cópia rasa nova
  next.set(blockKey(x, y, z), type);   // muta a CÓPIA
  return { blocks: next };             // devolve referência nova
});
```

Para arrays de inventário/entidades, o mesmo: `const next = [...state.inventory]`
e, se você mexe DENTRO de um slot, troque o slot por um objeto novo também
(`next[i] = { ...next[i], count: next[i].count + 1 }`).

---

## 🏁 Ordem recomendada (você sempre à frente do time)

1. **Fase 4** → `addBlock` no store + hotbar seleciona *tipo* de bloco. (destrava Rodrigo colocar)
2. **Fase 5** → ampliar `BlockType` + tabela `BLOCKS` (solid/transparent/hardness/drops/texture). (destrava Brayan e Rodrigo)
3. **Fase 6/7** → gerador procedural (ruído + seed) + store por chunk (`getChunk`, dirty flags). (destrava Brayan meshing)
4. **Fase 8** → modelo de inventário (slots/stacks) + drops/pickup como entidades.
5. **Fase 9** → stats (vida/fome/regen/morte/respawn) + relógio do mundo + propagação de luz.
6. **Fase 10** → sistema de receitas de crafting 2x2 e 3x3.
7. **Fase 11** → motor de entidades (ECS-lite) + spawn/despawn + IA + drops de mob.
8. **Fase 12** → biomas + geração de estruturas + áudio + save/load.

---

# FASE 4 — Construção (colocar blocos)

> Você entrega o `addBlock` no store e faz a hotbar carregar um *tipo de bloco*.
> O Rodrigo faz o raycast + normal da face e chama seu `addBlock`.

### Tarefa 4.1 — `addBlock` no `worldStore`
- [ ] Em `src/store/worldStore.ts`, adicionar `addBlock(x, y, z, type: BlockType): void`.
- [ ] Criar `const next = new Map(state.blocks)`, `next.set(blockKey(x,y,z), type)`.
- [ ] Não colocar em cima de bloco já ocupado por sólido? (decisão do Rodrigo; você
      só grava — se `type === AIR`, trate como remover, ou deixe o Rodrigo usar `removeBlock`).
- [ ] Adicionar `blocksPlaced` (contador, opcional) para o HUD, no mesmo estilo de `blocksDestroyed`.

```typescript
addBlock: (x, y, z, type) => {
  set((state) => {
    const key = blockKey(x, y, z);
    if (state.blocks.get(key) === type) return state; // nada mudou
    const next = new Map(state.blocks); // <- NUNCA mutar a antiga
    next.set(key, type);
    return { blocks: next, blocksPlaced: state.blocksPlaced + 1 };
  });
},
```

🎮 **No Minecraft:** clicar com o botão direito segurando um bloco na mão *coloca*
o bloco na face que você está mirando.
✅ **Pronto quando:** no console, `useWorldStore.getState().addBlock(0,5,0, 3)` faz
`getBlock(0,5,0)` devolver `3` (STONE), e a Map ganhou 1 item (`blocks.size` subiu).
💡 **Dica:** o Rodrigo calcula a posição *adjacente* (bloco mirado + normal da face);
você só recebe a coordenada final e grava. Não faça matemática de face aqui.

### Tarefa 4.2 — Hotbar seleciona o *tipo* de bloco
- [ ] No `HUD.tsx`, garantir que `selectedSlot` mapeia para um `BlockType` (a lista `HOTBAR`).
- [ ] Expor no store um helper `getSelectedBlockType(): BlockType` (deriva de `HOTBAR[selectedSlot]`)
      OU deixe o Rodrigo ler `selectedSlot` e a lista. Combine a interface com ele.
- [ ] Manter as teclas `1..n` e (bônus) o scroll do mouse trocando o slot.

🎮 **No Minecraft:** o item destacado na hotbar é o que você vai colocar/usar.
✅ **Pronto quando:** apertar `2` faz `getSelectedBlockType()` devolver `DIRT`, e o
Rodrigo consegue ler qual tipo colocar.
💡 **Dica:** na Fase 8 a hotbar deixa de ser lista fixa e passa a ler os primeiros
9 slots do inventário. Deixe o `getSelectedBlockType` como o ponto único que muda depois.

---

# FASE 5 — Texturas e Tipos (a tabela `BLOCKS`)

> Esta é a fase que **mais destrava o time**: Brayan lê `texture`/`transparent`,
> Rodrigo lê `solid`/`hardness`, você usa `drops`. É uma tabela única, consultada
> por todos. Defina a assinatura ANTES de todo mundo começar.

### Tarefa 5.1 — Ampliar o `enum BlockType`
- [ ] Em `src/types/world.ts`, ampliar o enum (mantendo AIR=0, GRASS=1, DIRT=2, STONE=3):

```typescript
export enum BlockType {
  AIR = 0, GRASS = 1, DIRT = 2, STONE = 3,
  WOOD = 4, LEAVES = 5, SAND = 6, WATER = 7,
  COBBLESTONE = 8, PLANKS = 9, GLASS = 10,
  COAL_ORE = 11, IRON_ORE = 12, BEDROCK = 13,
  // itens que NÃO são bloco (só existem no inventário) entram noutro enum (Fase 8: ItemType).
}
```

🎮 **No Minecraft:** cada bloco tem seu *Block ID* (pedra, madeira, minério...).
✅ **Pronto quando:** o arquivo compila e `BlockType.WATER === 7`.
💡 **Dica:** NÃO reordene os valores antigos — o save/load (Fase 12) grava esses
números. Mudar `STONE` de 3 pra 4 corromperia mundos salvos. Só *acrescente* no fim.

### Tarefa 5.2 — A interface `BlockDef` e a tabela `BLOCKS`
- [ ] Definir `TextureFaces` (top/side/bottom) e `BlockDef` em `src/types/world.ts`.
- [ ] Criar a tabela `BLOCKS: Record<BlockType, BlockDef>` com um registro por tipo.
- [ ] Preencher `solid`, `transparent`, `hardness` (segundos-base), `drops`, `texture`.
- [ ] Exportar helpers: `isSolid(type)`, `isTransparent(type)`, `getDrop(type)`.

```typescript
export interface TextureFaces {
  top: number;    // índice no atlas (Brayan)
  side: number;
  bottom: number;
}
export interface BlockDef {
  solid: boolean;        // colide? (Rodrigo)
  transparent: boolean;  // deixa ver através / não faz face culling atrás (Brayan)
  hardness: number;      // segundos-base pra minerar à mão (Rodrigo/Japa); Infinity = inquebrável
  drops: BlockType;      // o que cai ao quebrar (você, Fase 8)
  texture: TextureFaces; // faces no atlas (Brayan)
}

export const BLOCKS: Record<BlockType, BlockDef> = {
  [BlockType.AIR]:   { solid: false, transparent: true,  hardness: 0,   drops: BlockType.AIR,   texture: { top: 0, side: 0, bottom: 0 } },
  [BlockType.GRASS]: { solid: true,  transparent: false, hardness: 0.6, drops: BlockType.DIRT,  texture: { top: 1, side: 2, bottom: 3 } },
  [BlockType.DIRT]:  { solid: true,  transparent: false, hardness: 0.5, drops: BlockType.DIRT,  texture: { top: 3, side: 3, bottom: 3 } },
  [BlockType.STONE]: { solid: true,  transparent: false, hardness: 1.5, drops: BlockType.COBBLESTONE, texture: { top: 4, side: 4, bottom: 4 } },
  [BlockType.WATER]: { solid: false, transparent: true,  hardness: Infinity, drops: BlockType.AIR, texture: { top: 5, side: 5, bottom: 5 } },
  [BlockType.LEAVES]:{ solid: true,  transparent: true,  hardness: 0.2, drops: BlockType.LEAVES, texture: { top: 6, side: 6, bottom: 6 } },
  // ... WOOD, SAND, COBBLESTONE, PLANKS, GLASS, COAL_ORE, IRON_ORE, BEDROCK
};

export const isSolid = (t: BlockType) => BLOCKS[t].solid;
export const isTransparent = (t: BlockType) => BLOCKS[t].transparent;
export const getDrop = (t: BlockType) => BLOCKS[t].drops;
```

🎮 **No Minecraft:** grama tem topo verde e lados de terra; água não te empurra;
folhas você vê através. Cada bloco tem dureza (tempo de mineração) e drop próprio.
✅ **Pronto quando:** `BLOCKS[BlockType.WATER].solid === false`,
`BLOCKS[BlockType.GRASS].drops === BlockType.DIRT`, e o Rodrigo/Brayan importam a tabela.
💡 **Dica CRÍTICA:** faça `BLOCKS` uma tabela *pura* (só dados, sem lógica). Todo mundo
consulta o MESMO objeto. Se o Rodrigo criar a lista dele de "o que é sólido" à parte,
vão divergir. Um lugar só.

### Tarefa 5.3 — Atualizar o `aabb.ts` para usar `isSolid`
- [ ] Em `src/physics/aabb.ts`, trocar o teste `=== BlockType.AIR` por `!isSolid(type)`.
- [ ] Assim água (`WATER`) e folhas caso não-sólidas passam a NÃO colidir automaticamente.

🎮 **No Minecraft:** você atravessa água e (dependendo) folhas; não atravessa pedra.
✅ **Pronto quando:** `playerCollides` num bloco de `WATER` devolve `false`.
💡 **Dica:** deixe a colisão consultar a tabela — assim, quando você adicionar um
tipo novo não-sólido, a física já respeita sozinha, sem tocar no `aabb`.

---

# FASE 6 — Mundo Procedural (ruído + seed + chunks)

> Aqui nasce o mundo grande. Você entrega o gerador (ruído Perlin/Simplex por
> coluna) e reorganiza o store para trabalhar **por chunk**, expondo `getChunk`
> e *dirty flags* para o Brayan fazer o meshing.

### Tarefa 6.1 — Ruído determinístico com seed
- [ ] Criar `src/world/noise.ts` com um ruído Perlin/Simplex 2D (pode usar `simplex-noise` ou implementar).
- [ ] Semear a partir de um `seed: number` (mesma seed → mesmo mundo).
- [ ] Expor `noise2D(x, z): number` no intervalo aprox. `-1..1`.

```typescript
// src/world/noise.ts
import { createNoise2D } from 'simplex-noise';
import Alea from 'alea'; // PRNG semeável

export function makeNoise(seed: number) {
  const prng = Alea(seed);
  const raw = createNoise2D(prng);
  return (x: number, z: number) => raw(x, z); // -1..1
}
```

🎮 **No Minecraft:** o *World Seed* — o número que gera sempre o mesmo mundo.
✅ **Pronto quando:** `const n = makeNoise(42); n(0,0)` devolve o MESMO valor toda
vez que você rodar com seed 42.
💡 **Dica:** ruído puro é "chiado". O relevo bonito vem de somar *oitavas*
(frequências diferentes) — ver 6.2.

### Tarefa 6.2 — Altura por coluna (heightmap)
- [ ] Criar `src/world/generator.ts` com `columnHeight(x, z): number`.
- [ ] Somar 2–4 oitavas (amplitude ↓, frequência ↑) para relevo com morros e vales.
- [ ] Mapear o resultado para uma faixa de altura (ex: `SEA_LEVEL ± amplitude`).

```typescript
const SEA_LEVEL = 32;
export function columnHeight(noise: Noise2D, x: number, z: number): number {
  let amp = 16, freq = 0.01, h = 0;
  for (let o = 0; o < 4; o++) {          // 4 oitavas
    h += noise(x * freq, z * freq) * amp;
    amp *= 0.5; freq *= 2;               // fractal brownian motion (fBm)
  }
  return Math.floor(SEA_LEVEL + h);
}
```

🎮 **No Minecraft:** o *heightmap* — a linha de terreno que sobe e desce.
✅ **Pronto quando:** `console.log` de `columnHeight` em vários (x,z) dá números
que variam suave (vizinhos parecidos), não aleatório puro.
💡 **Dica:** trave a seed durante o dev pra sempre ver o mesmo mundo enquanto ajusta números.

### Tarefa 6.3 — Camadas por coluna (grama/terra/pedra/água/bedrock)
- [ ] Em `generator.ts`, `fillColumn(cx, cz, out)`: do topo pra baixo, empilhar camadas.
- [ ] Regra: topo = GRASS; alguns blocos abaixo = DIRT; resto até y=1 = STONE; y=0 = BEDROCK.
- [ ] Abaixo do `SEA_LEVEL` e acima do terreno → WATER (lagos/mar). Areia perto da água.

🎮 **No Minecraft:** a *estratificação* — grama em cima, terra, depois pedra, bedrock no fundo.
✅ **Pronto quando:** ao gerar uma coluna, o bloco do topo é GRASS (ou SAND perto d'água)
e o de baixo (y baixo) é STONE/BEDROCK.
💡 **Dica:** não gere o mundo inteiro de uma vez. Gere *por chunk*, sob demanda (6.4).

### Tarefa 6.4 — Reestruturar o store por chunk
- [ ] Definir em `types/world.ts`: `CHUNK_SIZE = 16`, `chunkKey(cx, cz)`, tipo `Chunk`.
- [ ] Um `Chunk` guarda seus blocos (uma `Map` local ou `Uint8Array` de `16*altura*16`) + `dirty: boolean`.
- [ ] No store: `chunks: Map<string, Chunk>`, `getChunk(cx, cz): Chunk` (gera on-demand se faltar).
- [ ] `getBlock`/`addBlock`/`removeBlock` passam a calcular o chunk (`cx = x >> 4`) e marcar `dirty = true`.
- [ ] Ao alterar um bloco na *borda* do chunk, marcar também o chunk vizinho como `dirty`.

```typescript
export const CHUNK_SIZE = 16;
export const chunkKey = (cx: number, cz: number) => `${cx},${cz}`;
export interface Chunk {
  cx: number; cz: number;
  blocks: Map<string, BlockType>; // chave local "lx,y,lz" (ou global — combine com Brayan)
  dirty: boolean;                 // Brayan re-mesha só quando true, depois zera
}

getChunk: (cx, cz) => {
  const existing = get().chunks.get(chunkKey(cx, cz));
  if (existing) return existing;
  const chunk = generateChunk(cx, cz, get().seed); // gera on-demand
  set((state) => {
    const next = new Map(state.chunks); // <- new Map, sempre
    next.set(chunkKey(cx, cz), chunk);
    return { chunks: next };
  });
  return chunk;
},
```

🎮 **No Minecraft:** *chunks* de 16×16 gerados/carregados conforme você anda.
✅ **Pronto quando:** `getChunk(0,0)` devolve um chunk populado; alterar um bloco
marca o chunk como `dirty: true`; o Brayan consegue iterar `chunks` e ler `dirty`.
💡 **Dica CRÍTICA (dirty flag imutável):** quando o Brayan termina o mesh e zera o
`dirty`, isso também precisa ser **imutável** — troque o Chunk por um objeto novo
(`{ ...chunk, dirty: false }`) numa `new Map`, senão o próximo mundo salvo/observador
não vê. Combine com o Brayan *quem* zera o `dirty` (recomendo: o Brayan chama
`markChunkClean(cx,cz)` no store).

### Tarefa 6.5 — Seed no store + regenerar mundo
- [ ] Adicionar `seed: number` no store e `regenerate(seed)` que limpa `chunks` e re-gera.
- [ ] (Bônus) campo de seed no menu/HUD para o jogador escolher.

🎮 **No Minecraft:** a tela "criar mundo" onde você digita a seed.
✅ **Pronto quando:** rodar com a mesma seed duas vezes gera exatamente o mesmo relevo.

---

# FASE 7 — Render em Chunks (seu apoio)

> O dono é o **Brayan** (face culling, meshing, frustum/distance culling). Você é
> o suporte de dados: garanta que o contrato de chunk é rápido e correto.

### Tarefa 7.1 — API de leitura amiga do meshing
- [ ] Garantir `getBlock` O(1) mesmo com muitos chunks (nada de varrer tudo).
- [ ] Expor `getLoadedChunks(): Chunk[]` e/ou iterar `chunks` para o Brayan.
- [ ] (Bônus) `neighborsOf(cx,cz)` para o Brayan checar faces nas bordas entre chunks.

🎮 **No Minecraft:** o motor que decide quais faces desenhar.
✅ **Pronto quando:** o Brayan consegue, por chunk `dirty`, ler todos os blocos +
os vizinhos de borda sem gargalo, e o mundo grande roda liso.
💡 **Dica:** se `getBlock` for chamado milhões de vezes no meshing, evite recriar
strings. Considere chave numérica ou `Uint8Array` por chunk se o Brayan reclamar de FPS.

---

# FASE 8 — Inventário + Drops + Pickup

> Você entrega o **modelo de inventário** (slots/stacks/quantidade), o **drop** ao
> quebrar, e o **item no chão** como entidade que o player coleta. Brayan faz a UI
> do grid e o render do item; Rodrigo trata a colisão de pickup.

### Tarefa 8.1 — Modelo de inventário (slots + stacks)
- [ ] Criar `src/types/inventory.ts`: um `ItemStack` (`{ type, count }`) e o array de slots.
- [ ] Definir `MAX_STACK = 64`, número de slots (ex: 36; 9 são a hotbar).
- [ ] No store (ou `inventoryStore` separado — combine): `inventory: (ItemStack | null)[]`.

```typescript
// src/types/inventory.ts
export interface ItemStack { type: BlockType; count: number; }
export const MAX_STACK = 64;
export const INV_SIZE = 36; // 9 hotbar + 27 mochila
```

🎮 **No Minecraft:** o *inventário* — 36 slots, cada um empilha até 64.
✅ **Pronto quando:** `inventory` existe com `INV_SIZE` slots, todos `null` no início.
💡 **Dica:** slot vazio = `null` (não `{type:AIR,count:0}`). Fica mais simples testar `if (slot)`.

### Tarefa 8.2 — `addItem` / `removeItem` (empilhando)
- [ ] `addItem(type, count)`: primeiro completa stacks existentes do mesmo tipo, depois
      preenche slots vazios; respeita `MAX_STACK`; devolve o que **não** coube (overflow).
- [ ] `removeItem(type, count)` e `consumeSlot(index)` para crafting/uso.
- [ ] **Imutável:** clone o array E o slot alterado.

```typescript
addItem: (type, count) => {
  set((state) => {
    const next = [...state.inventory];         // array novo
    let left = count;
    // 1) completa stacks existentes
    for (let i = 0; i < next.length && left > 0; i++) {
      const s = next[i];
      if (s && s.type === type && s.count < MAX_STACK) {
        const put = Math.min(MAX_STACK - s.count, left);
        next[i] = { ...s, count: s.count + put }; // slot NOVO (não muta o antigo)
        left -= put;
      }
    }
    // 2) usa slots vazios
    for (let i = 0; i < next.length && left > 0; i++) {
      if (!next[i]) {
        const put = Math.min(MAX_STACK, left);
        next[i] = { type, count: put };
        left -= put;
      }
    }
    return { inventory: next }; // referência nova -> UI do Brayan atualiza
  });
},
```

🎮 **No Minecraft:** pegar itens que se juntam no mesmo slot até 64.
✅ **Pronto quando:** `addItem(DIRT, 70)` deixa um slot com 64 e outro com 6;
`addItem(DIRT, 60)` depois completa o primeiro e ajusta.
💡 **Dica:** teste no console: `addItem(STONE,1)` 3× → um slot com `count: 3`.

### Tarefa 8.3 — Drop ao quebrar (ligar com `getDrop`)
- [ ] No fluxo de `removeBlock`, ao quebrar, consultar `getDrop(type)` e chamar `addItem`
      (ou soltar um item no chão — 8.4). Combine com Rodrigo *quem* dispara.
- [ ] Blocos com `drops: AIR` (ex: folhas, às vezes) não dão item.

🎮 **No Minecraft:** quebrar pedra dropa *cobblestone*; grama dropa *terra*.
✅ **Pronto quando:** quebrar STONE faz aparecer COBBLESTONE no inventário.

### Tarefa 8.4 — Item dropado como entidade (pickup)
- [ ] Criar um registro de itens no chão: `droppedItems: Map<id, {type,count,x,y,z,age}>`.
- [ ] `spawnDrop(type,count,x,y,z)` cria; `collectDrop(id)` remove e faz `addItem`.
- [ ] Rodrigo detecta proximidade player↔item (raio) e chama `collectDrop`; Brayan renderiza.
- [ ] (Bônus) `age` para o item sumir depois de X segundos.

🎮 **No Minecraft:** o cubinho girando no chão que você anda por cima e coleta.
✅ **Pronto quando:** `spawnDrop` adiciona um item na Map; `collectDrop(id)` remove e
o item aparece no inventário. (Se você já for direto pro inventário na 8.3, marque como opcional.)
💡 **Dica:** reuse o padrão de entidades da Fase 11 se preferir um sistema só.
Mas mantenha imutável: `new Map(state.droppedItems)`.

---

# FASE 9 — Sobrevivência (stats + relógio + luz)

> Você entrega os **stats** (vida/fome/regen/morte/respawn), o **relógio do mundo**
> (dia-noite lógico) e a **propagação de luz por bloco**. Rodrigo aplica dano
> (queda/água); Brayan pinta corações/sol/névoa a partir dos seus dados.

### Tarefa 9.1 — Stats do player (vida/fome)
- [ ] No store (ou `playerStore`): `health` (0–20), `hunger` (0–20), `saturation`.
- [ ] `damage(n)`, `heal(n)`, `setHunger(n)` — todos imutáveis (é primitivo, então é fácil: `set({ health: ... })`).
- [ ] Clampar entre 0 e o máximo.

🎮 **No Minecraft:** os *corações* (vida) e as *coxinhas* (fome), 20 de cada (10 ícones).
✅ **Pronto quando:** `damage(5)` leva `health` de 20 → 15; nunca abaixo de 0.
💡 **Dica:** deixe o Brayan LER `health`/`hunger` para desenhar o HUD; deixe o Rodrigo
CHAMAR `damage` (dano de queda). Você é o dono do número.

### Tarefa 9.2 — Regeneração e fome ao longo do tempo
- [ ] Criar um "tick" lógico (ex: a cada 0.5s ou dentro do relógio 9.4): se `hunger` alto
      e `health < max` → `heal(1)` e gasta saturação; se `hunger` esgota → `damage(1)`.
- [ ] Desacoplar do frame: use um acumulador de `delta`, não faça por frame de render.

🎮 **No Minecraft:** com fome cheia você regenera vida; com fome zerada você perde vida.
✅ **Pronto quando:** com `hunger` cheio e `health` baixo, a vida sobe sozinha ao longo do tempo.

### Tarefa 9.3 — Morte e respawn
- [ ] Ao `health <= 0`: setar `dead: true`, (bônus) largar o inventário como drops.
- [ ] `respawn()`: `health = max`, `hunger = max`, teleporta o player pro spawn (avise o Rodrigo a posição).
- [ ] `dead` liga a tela "Você morreu" (Brayan desenha).

🎮 **No Minecraft:** a tela vermelha *"You Died!"* com botão de renascer.
✅ **Pronto quando:** `damage(20)` marca `dead: true`; `respawn()` restaura tudo e limpa `dead`.

### Tarefa 9.4 — Relógio do mundo (ciclo dia-noite lógico)
- [ ] Criar `src/world/clock.ts` (ou dentro do store) com `timeOfDay` (0..1, onde 0=amanhecer).
- [ ] `tickClock(delta)`: avança `timeOfDay` proporcional ao `delta` (ex: 20 min reais = 1 dia).
- [ ] Derivar `isNight()` e um `skyLightLevel` (0..15) do `timeOfDay` para a luz.

```typescript
// avança por delta (segundos), NÃO por frame fixo
const DAY_LENGTH = 1200; // 20 min reais = 1 dia
tickClock: (delta) => set((state) => ({
  timeOfDay: (state.timeOfDay + delta / DAY_LENGTH) % 1,
})),
```

🎮 **No Minecraft:** o *ciclo dia/noite* (~20 min por dia completo).
✅ **Pronto quando:** `timeOfDay` avança de 0 a 1 e volta; `isNight()` fica `true`
na metade escura. O Brayan usa `timeOfDay` para mover o sol/mudar a cor do céu.
💡 **Dica:** UM lugar chama `tickClock(delta)` (o game loop do Rodrigo, ou um `useFrame`
dedicado). Passe o `delta` real — nunca assuma 60fps fixos.

### Tarefa 9.5 — Propagação de luz por bloco (block light + skylight)
- [ ] Definir níveis de luz 0..15; `skylight` (vem do céu, cai de cima) e `blockLight` (de fontes: tocha, lava).
- [ ] Algoritmo de *flood fill* (BFS) por chunk: começa nas fontes e propaga caindo 1 por bloco.
- [ ] Blocos sólidos opacos bloqueiam; transparentes deixam passar.
- [ ] Expor `getLight(x,y,z): number` (ou por chunk) para o Brayan escurecer as faces.
- [ ] Recalcular a luz do chunk quando ele fica `dirty` (bloco colocado/removido).

🎮 **No Minecraft:** cavernas escuras, tocha ilumina ao redor, luz do sol de dia.
✅ **Pronto quando:** um bloco no fundo de um buraco tem `getLight` baixo; ao lado de
uma fonte de luz, alto; o Brayan consegue multiplicar a cor da face pela luz.
💡 **Dica:** BFS com uma fila é o clássico. Comece simples: só skylight (colunas
abertas = 15, sob teto = cai). Fontes de luz (blockLight) você adiciona depois.
Cuidado com custo — recalcule só o chunk afetado, não o mundo.

---

# FASE 10 — Crafting (receitas 2x2 e 3x3)

> Você entrega o **sistema de receitas** (casar um grid de itens com uma receita e
> produzir o resultado). Brayan faz a UI do grid; Rodrigo abre a bancada.

### Tarefa 10.1 — Modelo de receita
- [ ] Criar `src/crafting/recipes.ts` com o tipo `Recipe` (grid de entrada + resultado).
- [ ] Suportar receitas *shaped* (posição importa: espada) e *shapeless* (só os ingredientes: pão).
- [ ] Tamanho do grid: 2x2 (inventário) e 3x3 (bancada).

```typescript
export interface Recipe {
  shaped: boolean;
  pattern: (BlockType | null)[]; // 4 (2x2) ou 9 (3x3), null = vazio
  width: number; height: number; // p/ shaped, encaixar em qualquer canto
  result: { type: BlockType; count: number };
}
export const RECIPES: Recipe[] = [
  // 1 WOOD -> 4 PLANKS (shapeless)
  { shaped: false, pattern: [BlockType.WOOD], width: 1, height: 1, result: { type: BlockType.PLANKS, count: 4 } },
  // ...
];
```

🎮 **No Minecraft:** o *livro de receitas* — madeira vira tábuas, tábuas viram bancada, etc.
✅ **Pronto quando:** o array `RECIPES` existe e compila.
💡 **Dica:** comece com 3–4 receitas (planks, crafting table, sticks, cobblestone→furnace-like).

### Tarefa 10.2 — Casar grid → receita
- [ ] `matchRecipe(grid): Recipe | null` — compara o grid do jogador com as receitas.
- [ ] Para *shaped*: normalizar (recortar linhas/colunas vazias) e comparar posição a posição.
- [ ] Para *shapeless*: comparar o *multiset* de ingredientes (ordem não importa).
- [ ] `craft(grid)`: se casar, consome os ingredientes e devolve/soma o resultado no inventário.

🎮 **No Minecraft:** montar o padrão certo faz o resultado aparecer no slot de saída.
✅ **Pronto quando:** no console, `matchRecipe([WOOD])` devolve a receita de PLANKS;
`craft` consome 1 WOOD e dá 4 PLANKS via `addItem`.
💡 **Dica:** a normalização shaped é a parte chata — uma espada no canto superior
esquerdo tem que casar igual à do canto inferior direito. Recorte o "bounding box"
dos itens antes de comparar.

---

# FASE 11 — Mobs (motor de entidades + IA)

> Você entrega o **motor de entidades (ECS-lite)**: spawn/despawn, componentes
> (posição, vida, IA), IA de wander/chase/flee, vida de mob, drops e spawn por
> luz/noite. Rodrigo reusa `aabb` para a física dos mobs; Brayan desenha os modelos.

### Tarefa 11.1 — Motor ECS-lite
- [ ] Criar `src/entities/types.ts` e `src/store/entityStore.ts` (ou dentro do worldStore).
- [ ] Uma `Entity` = `{ id, kind, x,y,z, vx,vy,vz, health, ai, target? }`.
- [ ] `entities: Map<id, Entity>`; `spawn(kind, x,y,z)`, `despawn(id)`, `updateEntity(id, patch)`.
- [ ] **Imutável:** toda escrita cria `new Map` e substitui a entidade por um objeto novo.

```typescript
export type MobKind = 'zombie' | 'pig' | 'skeleton';
export type AIState = 'wander' | 'chase' | 'flee';
export interface Entity {
  id: string; kind: MobKind;
  x: number; y: number; z: number;
  vx: number; vy: number; vz: number;
  health: number; ai: AIState;
  target?: { x: number; y: number; z: number };
}
updateEntity: (id, patch) => set((state) => {
  const cur = state.entities.get(id);
  if (!cur) return state;
  const next = new Map(state.entities);       // Map nova
  next.set(id, { ...cur, ...patch });         // entidade NOVA
  return { entities: next };
}),
```

🎮 **No Minecraft:** a lista de *entidades* (mobs, itens) que o mundo simula.
✅ **Pronto quando:** `spawn('pig', 8,33,8)` adiciona à Map; `despawn(id)` remove;
Brayan consegue iterar `entities` e desenhar; alterar posição gera Map nova.
💡 **Dica:** "ECS-lite" = não precisa de framework. É só um Map de entidades + funções
puras de sistema (IA, física) que leem/escrevem. Não invente arquitetura demais.

### Tarefa 11.2 — Sistema de IA (wander / chase / flee)
- [ ] Criar `src/entities/ai.ts` com `updateAI(entity, ctx, delta)` que devolve um *patch* (novo destino/velocidade).
- [ ] `wander`: escolhe um ponto aleatório e caminha até lá; troca de vez em quando.
- [ ] `chase`: se o player está a < R blocos, mira nele (zumbi).
- [ ] `flee`: foge do player (animal ao apanhar).
- [ ] Rodar num tick lógico com `delta` (não por frame). A *física* (mover de fato, colidir)
      fica com o Rodrigo usando `aabb`; você decide a *intenção* (direção/estado).

🎮 **No Minecraft:** zumbis te perseguem, porcos andam à toa, mobs neutros fogem ao apanhar.
✅ **Pronto quando:** um mob perto do player muda `ai` para `'chase'` e seu `target`
aponta pro player; longe, volta a `'wander'`.
💡 **Dica:** separe claramente: **você = decisão** (para onde/estado), **Rodrigo =
movimento+colisão**. Combine a fronteira (você seta `vx,vz` desejados; ele resolve a colisão).

### Tarefa 11.3 — Vida de mob, dano e drops
- [ ] `damageEntity(id, n)`: reduz `health`; se `<= 0`, `despawn` e `spawnDrop` (ex: zumbi → carne podre).
- [ ] Combate: Rodrigo dispara o hit (raycast/alcance); você aplica o dano e o knockback (setar velocidade).

🎮 **No Minecraft:** bater no mob tira vida; ele morre e dropa itens; toma knockback.
✅ **Pronto quando:** `damageEntity(id, 999)` remove o mob e cria o drop dele.

### Tarefa 11.4 — Spawn por luz/noite
- [ ] `trySpawnMobs(ctx)`: num tick, se `isNight()` e a luz do bloco (`getLight`) é baixa,
      spawna mobs hostis perto do player (com limite de população).
- [ ] De dia / luz alta → não spawna hostis (ou eles pegam fogo — bônus).
- [ ] Despawn de mobs muito longe do player (economia).

🎮 **No Minecraft:** monstros aparecem à noite e no escuro; somem se ficam longe.
✅ **Pronto quando:** com o relógio na noite e um lugar escuro, mobs começam a aparecer;
de dia, param.
💡 **Dica:** limite a população (ex: máx 20 hostis carregados) e o raio de spawn,
senão vira lag. Reuse `getLight` da Fase 9 e `isNight()` do relógio.

---

# FASE 12 — Mundo Vivo (biomas + estruturas + áudio + save/load)

> O acabamento. Você entrega o **mapa de biomas** (temperatura/umidade), a
> **geração de árvores/estruturas**, o **sistema de áudio** e o **salvar/carregar**
> (localStorage/IndexedDB). Brayan pinta cores/névoa por bioma.

### Tarefa 12.1 — Mapa de biomas (temperatura × umidade)
- [ ] Em `src/world/biomes.ts`: dois ruídos de baixa frequência → `temperature(x,z)` e `humidity(x,z)`.
- [ ] `biomeAt(x,z): Biome` mapeia (temp,umid) → deserto/planície/floresta/neve, etc.
- [ ] O gerador (6.3) consulta o bioma para escolher blocos de topo (areia no deserto, neve no frio)
      e a densidade de árvores.

```typescript
export type Biome = 'plains' | 'forest' | 'desert' | 'snowy' | 'beach';
export function biomeAt(temp: number, hum: number): Biome {
  if (temp > 0.6 && hum < 0.3) return 'desert';
  if (temp < 0.2) return 'snowy';
  if (hum > 0.6) return 'forest';
  return 'plains';
}
```

🎮 **No Minecraft:** *biomas* — deserto quente e seco, floresta úmida, tundra gelada.
✅ **Pronto quando:** `biomeAt` devolve biomas diferentes para regiões diferentes, e o
gerador troca o bloco de topo conforme o bioma. Brayan lê o bioma para cor/névoa.
💡 **Dica:** use frequência bem BAIXA nos ruídos de temp/umidade (biomas são grandes).

### Tarefa 12.2 — Geração de árvores/estruturas
- [ ] Em `generator.ts` (fase de "decoração", depois do terreno): por coluna, com chance
      dependente do bioma, plantar árvore (tronco WOOD + copa LEAVES).
- [ ] Usar a seed (determinístico) — a mesma seed sempre gera as mesmas árvores.
- [ ] (Bônus) estruturas maiores (cabana, pilar) com um "template" de blocos.
- [ ] Escrever a decoração via `addBlock` respeitando a imutabilidade e o `dirty` do chunk.

🎮 **No Minecraft:** árvores na floresta, cactos no deserto, vilas.
✅ **Pronto quando:** florestas nascem com árvores; a mesma seed reproduz as mesmas árvores.
💡 **Dica:** cuidado com árvore na *borda* de chunk (a copa vaza pro vizinho). Marque
os dois chunks como `dirty`. Um jeito robusto é gerar a decoração por chunk incluindo uma margem.

### Tarefa 12.3 — Sistema de áudio
- [ ] Criar `src/audio/audio.ts`: pré-carregar sons (quebrar, colocar, passo, dano, ambiente).
- [ ] `playSound(name, opts?)` com volume/pitch; pool de `Audio`/WebAudio para não travar.
- [ ] Ganchos: Rodrigo chama som de passo/quebra; você toca dano/pickup/ambiente.
- [ ] Respeitar mudo/volume e a política de "só depois do 1º clique" do navegador.

🎮 **No Minecraft:** o "toc" de quebrar, o passo na grama, a música ambiente.
✅ **Pronto quando:** `playSound('break')` toca o efeito; não engasga ao tocar vários juntos.
💡 **Dica:** navegadores bloqueiam áudio antes da 1ª interação — inicie o AudioContext
no mesmo clique que trava o mouse (Pointer Lock).

### Tarefa 12.4 — Salvar / carregar (localStorage / IndexedDB)
- [ ] Criar `src/persistence/save.ts`: `saveWorld()` serializa **seed + chunks alterados +
      inventário + stats + timeOfDay** e grava; `loadWorld()` restaura.
- [ ] Chunks: NÃO salve o mundo inteiro — salve só as *diferenças* do gerado (blocos que o
      jogador mudou), mais a seed. Ao carregar, re-gera pela seed e aplica as diferenças.
- [ ] `Map` não é JSON: converta para array de pares na serialização e reconstrua com `new Map(...)`.
- [ ] Escolha o backend: localStorage (simples, limite ~5MB) ou IndexedDB (mais espaço) para mundos grandes.

```typescript
// Map -> JSON (serializar)
function serializeBlocks(m: Map<string, BlockType>) {
  return JSON.stringify([...m.entries()]); // [["x,y,z", type], ...]
}
// JSON -> Map (desserializar) — SEMPRE new Map
function deserializeBlocks(json: string): Map<string, BlockType> {
  return new Map(JSON.parse(json) as [string, BlockType][]);
}
```

🎮 **No Minecraft:** o *World Save* no disco — você sai e volta e o mundo está lá.
✅ **Pronto quando:** construir algo, `saveWorld()`, recarregar a página, `loadWorld()`
e a construção + inventário + hora do dia voltam idênticos.
💡 **Dica CRÍTICA:** ao carregar, tudo volta como **`new Map` / arrays novos** — a Regra
de Ouro também vale na hidratação, senão o primeiro render não engata. E salve a *seed*
sempre; ela é o que deixa o save pequeno (só grava o delta do jogador).

---

## 🔗 Suas integrações (resumo)

| Você ENTREGA | Para quem | O quê |
|---|---|---|
| `addBlock`, `getBlock`, `removeBlock` | Rodrigo | colocar/quebrar blocos |
| `BLOCKS` (tabela), `isSolid`, `getDrop` | Rodrigo + Brayan | colisão, dureza, drops, texturas |
| `getChunk`, `chunks`, `dirty` flags | Brayan | meshing por chunk |
| `getLight`, `timeOfDay`, `isNight` | Brayan | escurecer faces, sol/céu, névoa |
| `inventory` + `addItem`/`removeItem` | Brayan (UI) + Rodrigo (uso) | grid de inventário, pickup |
| `droppedItems`, `collectDrop` | Rodrigo (pickup) + Brayan (render) | item no chão |
| `health`/`hunger`, `damage`/`heal`, `dead` | Rodrigo (dano) + Brayan (HUD) | sobrevivência |
| `RECIPES`, `matchRecipe`, `craft` | Brayan (UI) + Rodrigo (abrir bancada) | crafting |
| `entities` + `spawn`/`despawn`/`damageEntity` + IA | Rodrigo (física/combate) + Brayan (modelos) | mobs |
| `biomeAt`, geração de árvores | Brayan | cor/névoa por bioma |
| `saveWorld`/`loadWorld`, `playSound` | Todos | persistência e áudio |

| Você CONSOME | De quem | O quê |
|---|---|---|
| coordenada final de colocação (bloco + normal) | Rodrigo | onde gravar o `addBlock` |
| `delta` real do frame | Rodrigo (game loop) | avançar relógio/IA/regen sem assumir 60fps |
| evento de hit no mob / no player | Rodrigo | quando aplicar `damageEntity`/`damage` |
| `markChunkClean(cx,cz)` após o mesh | Brayan | zerar o `dirty` do chunk |

---

## ⚠️ Seus erros fatais a evitar

1. **Mutar a `Map`/array antigos** (blocos, chunks, inventário, entidades) → o render
   do Brayan e a UI **não atualizam**. SEMPRE `new Map(...)` / `[...arr]` / objeto novo.
   É o erro nº 1 e ele reaparece em toda fase nova.
2. **Zerar o `dirty` do chunk mutando o objeto antigo** → o Brayan re-mesha errado ou
   nunca. Troque o Chunk por `{ ...chunk, dirty: false }` numa Map nova.
3. **Reordenar/reaproveitar valores do `enum BlockType`** → corrompe todos os saves
   (Fase 12 grava os números). Só *acrescente* no fim, nunca reordene.
4. **Rodar relógio/IA/regen por frame fixo** (assumindo 60fps) → em máquinas rápidas
   o dia passa voando, em lentas trava. Sempre por `delta` acumulado.
5. **Gerar o mundo inteiro de uma vez** (em vez de por chunk on-demand) → trava o
   carregamento. Gere sob demanda no `getChunk`.
6. **Salvar o mundo inteiro no `localStorage`** → estoura o limite. Salve seed + só o
   *delta* do jogador; re-gere o resto pela seed.
7. **Dois "donos" da mesma verdade** (ex: Rodrigo com a lista dele do que é sólido) →
   divergem. `BLOCKS` é a fonte única; todos consultam a mesma tabela.
8. **Áudio antes da 1ª interação** → o navegador bloqueia. Inicie o AudioContext no
   clique do Pointer Lock.
