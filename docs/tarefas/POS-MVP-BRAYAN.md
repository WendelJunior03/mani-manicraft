# 🎨 Pós-MVP do Brayan — Engenheiro de Gráficos e Mundo

> **Seu papel:** transformar os dados do `worldStore` (blocos, chunks, entidades)
> num mundo 3D que aparece na tela — com performance de verdade. Você é os "olhos"
> do jogo: textura, luz, dia-noite, partículas, mobs na tela e, acima de tudo,
> **draw calls baixos e nada de recalcular por frame**.

> ⏳ **Você depende do Japa.** Ele é dono dos dados: a tabela `BLOCKS`, os
> `chunks` no store (`getChunk`), o inventário, o relógio do mundo, as receitas e
> as entidades. Você **consome** esses dados e desenha. Regra: você nunca inventa
> dados nem chama o código do Rodrigo/Japa direto — tudo vem do `worldStore` ou de
> funções puras exportadas. Antes de cada fase, confira se a assinatura que você
> precisa (ex: `getChunk`, `BLOCKS[type].texture`) já existe.

> Como usar este doc: marque os `[ ]` conforme termina. Cada tarefa tem
> **🎮 No Minecraft** (a feature equivalente), **✅ Pronto quando** (definição de
> pronto testável) e, quando útil, **💡 Dica** (truque de Three.js/performance).

---

## 🥇 A Regra de Ouro do Brayan (vale pra TODAS as fases)

1. **Nunca recalcule listas/geometria por frame.** Tudo que vem do store vai
   dentro de `useMemo`/`useLayoutEffect` com a dependência certa (`[blocks]`,
   `[chunk]`, `[entities]`). O `useFrame` só serve pra coisa que muda todo frame
   (posição do sol, animação de mob) — e mesmo aí, mutando `ref`, não `setState`.
2. **Mexeu em matriz de instância? `instanceMatrix.needsUpdate = true`.** Mexeu na
   cor? `instanceColor.needsUpdate = true`. Senão a GPU não vê a mudança.
3. **Draw call é caro. Culling é sagrado.** Não desenhe face escondida entre
   blocos (face culling). Não desenhe chunk que a câmera não vê (frustum) nem que
   está longe demais (distance). Menos triângulo = mais FPS.
4. **Reaproveite objetos.** `dummy`, `Color`, `Vector3`, `Matrix4`, `Raycaster`
   são criados **uma vez fora do componente**, nunca dentro do loop.

---

## 🏁 Ordem recomendada (as fases onde você tem trabalho)

```
Fase 4  → highlight do bloco mirado
Fase 5  → atlas de texturas + faces por lado + material transparente
Fase 6  → chunk meshing + face culling
Fase 7  → rebuild por chunk + frustum/distance culling + fog
Fase 8  → UI de inventário + item no chão + overlay de crack
Fase 9  → ciclo dia-noite + iluminação por bloco (skylight)
Fase 10 → UI de crafting
Fase 11 → modelos/sprites de mobs + animação + render de entidades
Fase 12 → partículas + cor/névoa por bioma + skybox
```

---

# 🟩 Fase 4 — Highlight do bloco mirado

> **Depende do Japa/Rodrigo:** o Rodrigo já faz o raycast e sabe qual bloco está
> mirado (a coordenada `Vec3` do alvo). Combine com ele: o alvo mirado vai pra um
> lugar que você consiga ler — um `useRef` compartilhado, um estado leve no store
> (`targetBlock: Vec3 | null`), ou uma prop. **Nada de raycast por frame no seu
> lado** — o Rodrigo já paga esse custo, você só desenha o resultado.

### Tarefa 4.1 — Wireframe/overlay no bloco mirado
- [ ] Criar `src/components/BlockHighlight.tsx`.
- [ ] Ler o alvo mirado (ex: `useWorldStore((s) => s.targetBlock)` — confirme a
      assinatura com o Japa) ou receber por prop do Rodrigo.
- [ ] Renderizar **um só** `<lineSegments>` com `EdgesGeometry` de um cubo
      `1.001` (levemente maior que o bloco, pra não dar z-fighting com a face).
- [ ] Posicionar movendo a `ref` do mesh (`mesh.position.set(...)`) — **não** via
      React state, pra não re-renderizar.
- [ ] Se `targetBlock` for `null`, esconder (`mesh.visible = false`).

```typescript
'use client';
import { useRef } from 'react';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { useWorldStore } from '@/store/worldStore';

// Criados UMA vez, fora do componente.
const edges = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.001, 1.001, 1.001));
const lineMat = new THREE.LineBasicMaterial({ color: 'black' });

export function BlockHighlight() {
  const ref = useRef<THREE.LineSegments>(null);
  useFrame(() => {
    const t = useWorldStore.getState().targetBlock; // leitura barata, sem re-render
    const mesh = ref.current;
    if (!mesh) return;
    if (!t) { mesh.visible = false; return; }
    mesh.visible = true;
    mesh.position.set(t.x, t.y, t.z);
  });
  return <lineSegments ref={ref} geometry={edges} material={lineMat} visible={false} />;
}
```

🎮 **No Minecraft:** é o *contorno preto* que aparece no bloco que você está
mirando — some quando você não mira em nada.
✅ **Pronto quando:** ao mirar num bloco, aparece um contorno preto nele que
segue a mira em tempo real; ao mirar pro céu, o contorno some.
💡 **Dica:** ler `useWorldStore.getState()` dentro do `useFrame` **não** dispara
re-render (diferente do hook `useWorldStore((s) => ...)`). É o jeito certo de ler
algo que muda todo frame sem custo de React.

---

# 🟫 Fase 5 — Texturas, atlas, UV e blocos não-sólidos

> **Depende do Japa:** ele amplia a `BlockType` (WOOD, LEAVES, SAND, WATER, GLASS,
> ORE...) e cria a tabela `BLOCKS: Record<BlockType, BlockDef>` com o campo
> `texture: TextureFaces` (topo/lado/baixo) e `transparent`. Você **consome**
> `BLOCKS[type].texture` pra saber qual pedaço do atlas usar em cada face.

### Tarefa 5.1 — Carregar o atlas com NearestFilter (pixel art)
- [ ] Colocar o atlas em `public/textures/atlas.png` (grid de tiles 16x16, ex: 16
      colunas × 16 linhas).
- [ ] Carregar com `TextureLoader` (ou `useTexture` do drei) **uma vez**, num
      módulo/`useMemo`.
- [ ] Setar `texture.magFilter = THREE.NearestFilter` e
      `texture.minFilter = THREE.NearestFilter` — sem isso o pixel art fica borrado.
- [ ] Setar `texture.colorSpace = THREE.SRGBColorSpace`.

```typescript
import * as THREE from 'three';
const atlas = new THREE.TextureLoader().load('/textures/atlas.png');
atlas.magFilter = THREE.NearestFilter; // pixel art nítido, sem blur
atlas.minFilter = THREE.NearestFilter;
atlas.colorSpace = THREE.SRGBColorSpace;
atlas.generateMipmaps = false; // mipmaps borram o pixel art de longe
```

🎮 **No Minecraft:** é o famoso visual *pixelado* — as texturas são 16x16 e o
jogo NÃO suaviza (senão a grama viraria um borrão verde).
✅ **Pronto quando:** um cubo aparece com a textura nítida, quadradinha, sem blur
mesmo de perto.
💡 **Dica:** o Minecraft usa **um atlas só** (todas as texturas numa imagem) pra
manter 1 material → 1 draw call. Nunca 1 textura por bloco: isso quebra o
instancing e explode os draw calls.

### Tarefa 5.2 — UV mapping por tile do atlas (funções puras)
- [ ] Criar `src/lib/atlas.ts` com o tamanho do grid (`TILES = 16`) e uma função
      `tileUV(col, row)` que devolve os 4 cantos UV daquele tile no atlas.
- [ ] Mapear cada índice de tile (ex: `GRASS_TOP = 0`, `DIRT = 2`, `STONE = 1`)
      para `(col, row)` no atlas.
- [ ] Deixar pronto pra ser usado tanto pela `boxGeometry` (Fase 5) quanto pelo
      meshing de chunk (Fase 6).

```typescript
export const TILES = 16; // atlas 16x16 tiles
export function tileUV(col: number, row: number) {
  const s = 1 / TILES;
  const u0 = col * s, v0 = 1 - (row + 1) * s; // v invertido: (0,0) do atlas é topo
  return { u0, v0, u1: u0 + s, v1: v0 + s };
}
```

🎮 **No Minecraft:** é o *UV mapping* — cada face do cubo "recorta" o pedaço
certo do atlas.
✅ **Pronto quando:** `tileUV(2,0)` devolve exatamente os UVs do tile de terra e
esse recorte aparece certo na face.
💡 **Dica:** o `v` costuma vir invertido (o (0,0) da textura é o canto superior).
Se a textura sair de cabeça pra baixo, é aqui que você ajusta o `1 - ...`.

### Tarefa 5.3 — Faces diferentes por lado (topo/lado/baixo)
- [ ] Em `Blocks.tsx`, dar ao cubo texturas diferentes por face usando os 6
      grupos de material da `BoxGeometry` (ordem: +X, -X, +Y, -Y, +Z, -Z).
- [ ] Ler `BLOCKS[type].texture` (`{ top, side, bottom }`) e mandar o tile de
      topo pra face `+Y`, o de baixo pra `-Y`, o de lado pras 4 laterais.
- [ ] Aplicar os UVs de `tileUV(...)` na geometria por face.

🎮 **No Minecraft:** a *grama* tem topo verde, laterais de grama-com-terra e
fundo de terra pura. Tronco tem anéis no topo e casca nas laterais.
✅ **Pronto quando:** o bloco de grama aparece verde só em cima, com lateral
mista e terra embaixo.
💡 **Dica:** cada face da `BoxGeometry` tem um `materialIndex` fixo. Se você usar
InstancedMesh com atlas, o caminho mais robusto (e que já prepara a Fase 6) é
escrever os UVs por vértice na geometria, não trocar de material.

### Tarefa 5.4 — Material transparente pra água e vidro
- [ ] Ler `BLOCKS[type].transparent` do store.
- [ ] Para GLASS: material com `transparent: true` e a textura com alpha (buracos
      ficam vazados).
- [ ] Para WATER: material com `transparent: true`, `opacity ~0.7`, e
      `depthWrite: false` (pra não cortar o que está atrás na água).
- [ ] Renderizar os blocos transparentes num **mesh separado** dos opacos (não
      misture água/vidro no mesmo InstancedMesh dos sólidos).

🎮 **No Minecraft:** *vidro* deixa ver através (e não tem face interna entre dois
vidros), *água* é semitransparente azulada.
✅ **Pronto quando:** dá pra ver o mundo através do vidro e da água; a água fica
levemente azul translúcida.
💡 **Dica:** transparência precisa ser renderizada por último e com
`depthWrite: false`, senão dá "buraco" visual. Por isso o mesh separado: primeiro
os opacos, depois os transparentes.

---

# 🟪 Fase 6 — Chunk meshing + face culling

> **Depende do Japa:** ele guarda o mundo em **chunks** no store e expõe
> `getChunk(cx, cz): Chunk` e `getBlock(x,y,z)`. Você para de desenhar bloco por
> bloco (InstancedMesh global) e passa a construir **uma malha por chunk**,
> pulando as faces escondidas.

### Tarefa 6.1 — Meshing de um chunk (BufferGeometry) com face culling
- [ ] Criar `src/lib/chunkMesh.ts` com `buildChunkGeometry(chunk, getBlock)`.
- [ ] Percorrer cada bloco sólido do chunk; para cada uma das 6 faces, checar o
      **vizinho** com `getBlock`: se o vizinho é AIR ou transparente, **desenha**
      a face; se é sólido, **pula** (culling).
- [ ] Para cada face desenhada, empurrar 4 vértices (posições), a `normal`, os
      `uv` (via `tileUV` da face certa) e 2 triângulos nos `indices`.
- [ ] Montar um `THREE.BufferGeometry` com `position`/`normal`/`uv`/`index`.
- [ ] Chamar `geometry.computeBoundingSphere()` (precisa pro frustum culling da 7).

```typescript
const FACES = [
  { dir: [ 1, 0, 0], /* +X */ }, { dir: [-1, 0, 0] /* -X */ },
  { dir: [ 0, 1, 0], /* +Y */ }, { dir: [ 0,-1, 0] /* -Y */ },
  { dir: [ 0, 0, 1], /* +Z */ }, { dir: [ 0, 0,-1] /* -Z */ },
];

// Regra do culling: só desenha a face se o vizinho deixa ver.
function faceVisible(nx: number, ny: number, nz: number, getBlock) {
  const n = getBlock(nx, ny, nz);
  return n === BlockType.AIR || BLOCKS[n].transparent; // vizinho vazado -> desenha
}
```

🎮 **No Minecraft:** é o coração do render — o *greedy/face culling*. As faces
entre dois blocos vizinhos **nunca são desenhadas** (ninguém as vê), então um
mundo de milhões de blocos vira só a "casca" visível.
✅ **Pronto quando:** um chunk aparece como uma malha única e, ao olhar as
estatísticas, o nº de triângulos é MUITO menor que 12 × (nº de blocos) — só as
faces expostas foram geradas.
💡 **Dica:** uma parede de 16×16×16 = 4096 blocos tem só ~1500 faces expostas, não
24576. É essa diferença que faz o mundo grande rodar. Sem culling, o navegador
morre.

### Tarefa 6.2 — Componente `<Chunk>` que desenha a malha
- [ ] Criar `src/components/Chunk.tsx` que recebe `(cx, cz)`.
- [ ] Ler o chunk do store com seletor (`useWorldStore((s) => s.getChunk(cx,cz))`
      ou o objeto do chunk) e gerar a geometria com `useMemo([chunkVersion])`.
- [ ] Um `<mesh>` por chunk, com o material único do atlas (`meshStandardMaterial`
      com o `map` do atlas), posicionado no offset do chunk (`cx*16, 0, cz*16`).
- [ ] Manter o `name="world-blocks"` (ou combinar novo alvo de raycast com o
      Rodrigo) pra ele continuar quebrando bloco.
- [ ] Ter um `<Chunks>` que renderiza todos os chunks carregados.

🎮 **No Minecraft:** o mundo é dividido em *chunks 16×16* justamente pra render e
carregamento serem por pedaço.
✅ **Pronto quando:** o mundo procedural do Japa aparece inteiro, cada chunk como
uma malha, e quebrar bloco continua funcionando.
💡 **Dica:** o mais pesado aqui é o `buildChunkGeometry`. Ele **só** pode rodar
quando aquele chunk muda (quebrou/colocou bloco), nunca por frame. Guarde uma
"versão" do chunk no store e use como dependência do `useMemo`.

---

# 🟦 Fase 7 — Rebuild por chunk + frustum/distance culling + fog

> **Depende do Japa:** o store precisa marcar **qual chunk foi alterado** (uma
> `version`/`dirty` por chunk) quando um bloco muda, e expor a posição do player
> (ou você pega da câmera). Aqui é onde a performance do mundo grande se decide.

### Tarefa 7.1 — Rebuild só do chunk alterado
- [ ] Garantir que o `useMemo` da geometria de cada `<Chunk>` dependa **só** da
      `version` **daquele** chunk — mudar um bloco no chunk (3,5) NÃO pode
      reconstruir o chunk (0,0).
- [ ] Ao quebrar/colocar um bloco na **borda** de um chunk, invalidar também o
      chunk vizinho (a face exposta muda). Combine com o Japa pra ele marcar os 2
      dirty.
- [ ] Confirmar que quebrar um bloco reconstrói **1 (ou 2) chunk**, não o mundo.

🎮 **No Minecraft:** quando você quebra um bloco, só o *chunk* dele (e o vizinho,
se for na fronteira) é remeshado. O resto do mundo nem pisca.
✅ **Pronto quando:** quebrar um bloco no meio do mundo grande não causa engasgo;
só a malha local muda.
💡 **Dica:** o pulo de gato é o `version` por chunk como dependência do `useMemo`.
Se você depender do `blocks` global, TODO chunk reconstrói a cada clique — a
armadilha nº 1 desta fase.

### Tarefa 7.2 — Distance culling (só desenha chunks perto)
- [ ] Definir `RENDER_DISTANCE` (ex: 8 chunks).
- [ ] No `<Chunks>`, calcular quais coordenadas `(cx,cz)` estão dentro do raio ao
      redor do chunk do player e montar (`useMemo`) só esses.
- [ ] Chunks fora do raio: não montar (ou desmontar).

🎮 **No Minecraft:** é o *Render Distance* — quanto mais longe, menos você
desenha; ajusta o mundo ao que a máquina aguenta.
✅ **Pronto quando:** ao andar, chunks distantes deixam de ser desenhados e novos
aparecem; o FPS fica estável.

### Tarefa 7.3 — Frustum culling (não desenha o que está fora da tela)
- [ ] Garantir que cada chunk-mesh tenha `boundingSphere` (feito na 6.1).
- [ ] Deixar `mesh.frustumCulled = true` (padrão do Three.js) — ele já pula
      automaticamente o que está fora do campo de visão da câmera.
- [ ] Conferir que a `boundingSphere` cobre o chunk inteiro (senão some quando não
      devia).

🎮 **No Minecraft:** o que está **atrás de você** ou fora da tela não é
desenhado. A GPU só pinta o que a câmera enxerga.
✅ **Pronto quando:** olhando pra uma direção, o profiler mostra menos draw calls
do que quando você teria o mundo todo visível.
💡 **Dica:** o Three.js faz frustum culling de graça **se** a `boundingSphere`
estiver certa. O erro comum é gerar geometria com bounding errado e o chunk
"piscar" ao virar a câmera.

### Tarefa 7.4 — Fog (neblina no limite do render)
- [ ] Em `Scene.tsx`, adicionar `<fog>` (ou `fogExp2`) com a cor igual à do céu.
- [ ] Ajustar `near`/`far` do fog pra bater com o `RENDER_DISTANCE` — o mundo some
      suavemente na neblina em vez de cortar seco na borda.

🎮 **No Minecraft:** é a *névoa de render distance* — o mundo desaparece
gradualmente ao longe, escondendo a borda dos chunks carregados.
✅ **Pronto quando:** a borda do mundo carregado não tem um "corte" seco; funde
com a cor do céu.
💡 **Dica:** cor do fog = cor do céu = cor de fundo do `<Canvas>`. Se elas
divergirem, a "parede" de neblina fica visível e feia.

---

# 🟨 Fase 8 — UI de inventário, item no chão e overlay de crack

> **Depende do Japa:** ele é dono do modelo de inventário (slots/stacks) no store e
> das entidades de item (drops). O Rodrigo é dono do "segurar clique pra minerar"
> e te passa o **progresso** (0..1) da mineração do bloco alvo. Você desenha tudo.

### Tarefa 8.1 — UI de inventário em grid (HTML overlay)
- [ ] Criar `src/components/InventoryUI.tsx` como overlay HTML (`fixed`), fora do
      `<Canvas>` — UI de menu é DOM, não 3D.
- [ ] Ler os slots do store (`useWorldStore((s) => s.inventory)` — confirme a
      forma com o Japa: array de `{ type, count } | null`).
- [ ] Renderizar um grid (ex: 9 colunas) com o ícone do item (o tile do atlas) e o
      número da stack no canto.
- [ ] Abrir/fechar com uma tecla (ex: `E`) — controlar por estado leve.
- [ ] Reaproveitar o mesmo componente de "slot" na hotbar embaixo da tela.

🎮 **No Minecraft:** é a *tela de inventário* (tecla E) — a grade de slots com os
itens empilhados.
✅ **Pronto quando:** apertar `E` abre a grade; os itens coletados aparecem no
slot certo com a contagem.
💡 **Dica:** UI (menu, hotbar, corações) é **HTML/CSS por cima do Canvas**, não
mesh 3D. É mais leve, mais fácil de estilizar e não gasta draw call.

### Tarefa 8.2 — Ícone do item a partir do atlas
- [ ] Criar `src/components/ItemIcon.tsx` que, dado um `BlockType`, mostra o tile
      do atlas via `background-image` + `background-position` (recorte por CSS) ou
      um `<canvas>`.
- [ ] Reusar o mapeamento de tiles da Fase 5 (`atlas.ts`) pra não duplicar.

🎮 **No Minecraft:** é o *sprite do item* na hotbar/inventário.
✅ **Pronto quando:** cada tipo de bloco mostra seu quadradinho correto na UI.

### Tarefa 8.3 — Render do item dropado no chão
- [ ] Criar `src/components/DroppedItems.tsx` que lê as entidades-item do store
      (posição + tipo).
- [ ] Renderizar cada drop como um cubo pequeno (`scale ~0.25`) texturizado, ou um
      billboard/sprite do ícone.
- [ ] Animar levemente no `useFrame`: rotação lenta + flutuação (seno do tempo) —
      **mutando a `ref`**, sem `setState`.
- [ ] Se houver muitos drops, usar **um InstancedMesh** pra todos.

🎮 **No Minecraft:** o item que cai fica *girando e flutuando* no chão até você
passar por cima e coletar.
✅ **Pronto quando:** ao quebrar um bloco, aparece um item girando no chão; some
quando o Rodrigo detecta o pickup (o store remove a entidade).
💡 **Dica:** a rotação/flutuação vai no `useFrame` mutando `ref.current.rotation`
e `.position`. Se você fizer isso via `setState`, re-renderiza 60x por segundo e
trava. `ref` = 60fps grátis.

### Tarefa 8.4 — Overlay de trinca (crack) ao minerar
- [ ] Ler o progresso da mineração do bloco alvo (do Rodrigo/store, `0..1`).
- [ ] Ter uma textura de crack em 10 estágios (ou um atlas de crack) e escolher o
      estágio por `Math.floor(progress * 10)`.
- [ ] Desenhar um cubo `1.002` sobre o bloco alvo com esse material de crack
      (`transparent: true`, `polygonOffset` pra não brigar com a face).
- [ ] Esconder quando não está minerando.

🎮 **No Minecraft:** é a *animação de rachadura* — quanto mais você bate no bloco,
mais trincado ele fica, até quebrar.
✅ **Pronto quando:** segurar o clique num bloco duro mostra a trinca evoluindo em
estágios; soltar antes de quebrar faz a trinca sumir.
💡 **Dica:** reaproveite a posição do `BlockHighlight` (Fase 4) — o crack fica no
mesmo bloco alvo. Só troca o material de wireframe pelo de rachadura.

---

# 🌗 Fase 9 — Ciclo dia-noite + iluminação por bloco (skylight)

> **Depende do Japa:** ele mantém o **relógio do mundo** (`worldTime`, ex: 0..1 ou
> ticks) no store e a **propagação de luz** por bloco (skylight/blocklight) —
> quanto de luz cada bloco recebe. Você **lê** o tempo pra mover o sol e **lê** o
> nível de luz pra escurecer/clarear as faces.

### Tarefa 9.1 — Sol e lua se movendo
- [ ] Em `Scene.tsx`, ler `worldTime` (`useWorldStore.getState().worldTime` dentro
      do `useFrame`, sem re-render).
- [ ] Mover a `directionalLight` (o sol) num arco pelo céu conforme o tempo;
      posicionar a lua no lado oposto.
- [ ] Ajustar a **intensidade** da luz: forte ao meio-dia, fraca ao entardecer,
      quase zero à noite (com a lua dando uma luz azulada fraca).
- [ ] Opcional: um mesh/sprite pro disco do sol e da lua acompanhando a direção.

🎮 **No Minecraft:** o *sol nasce e se põe*, a lua cruza o céu à noite; a luz
direcional muda de ângulo e força ao longo do dia.
✅ **Pronto quando:** dá pra ver o sol atravessando o céu; ao anoitecer a cena
escurece e a sombra some.
💡 **Dica:** tudo isso é interpolação em função do `worldTime` dentro do
`useFrame`, mutando `light.position`/`light.intensity`. Nada de `setState`.

### Tarefa 9.2 — Cor do céu e luz ambiente por hora do dia
- [ ] Interpolar a **cor de fundo** (`scene.background` / cor do Canvas) e do
      **fog** entre: azul claro (dia) → laranja (pôr do sol) → azul-escuro (noite).
- [ ] Interpolar a `ambientLight.intensity` (dia claro, noite bem escura).
- [ ] Manter a cor do fog sempre igual à cor do céu (senão a neblina "vaza").

🎮 **No Minecraft:** o *céu muda de cor* — azul de dia, laranja/rosa no pôr do
sol, quase preto de noite.
✅ **Pronto quando:** ver um ciclo completo: manhã azul → poente alaranjado →
noite escura → amanhecer.
💡 **Dica:** use `Color.lerpColors(dia, noite, t)` com um `t` derivado do
`worldTime`. Interpolar em poucas etapas (nascer/meio-dia/pôr/meia-noite) já dá um
resultado bonito.

### Tarefa 9.3 — Estrelas à noite
- [ ] Criar as estrelas com **um** `<points>` (`Points` + `PointsMaterial`) com
      centenas de pontos numa esfera grande em volta da câmera.
- [ ] Controlar a `opacity` do material pelo `worldTime`: 0 de dia, 1 de noite
      (mutando no `useFrame`).
- [ ] Deixar as estrelas "presas" ao céu (posição fixa em volta da câmera).

🎮 **No Minecraft:** de noite o céu ganha *estrelas* (e a lua); somem ao amanhecer.
✅ **Pronto quando:** ao anoitecer as estrelas aparecem gradualmente e somem de
manhã.
💡 **Dica:** `Points` desenha milhares de estrelas em 1 draw call. Nunca faça
uma estrela por mesh.

### Tarefa 9.4 — Iluminação por bloco (skylight/blocklight)
- [ ] Ler o nível de luz de cada bloco (do Japa: `getLight(x,y,z)` ou um campo no
      chunk, `0..15` estilo Minecraft).
- [ ] No meshing de chunk (Fase 6), escrever a luz como **cor por vértice**
      (`color`/`vertexColors`) ou num atributo, multiplicando a face pelo nível de
      luz do bloco à frente dela.
- [ ] Cavernas/lugares tapados ficam escuros; superfície exposta fica clara.

🎮 **No Minecraft:** o famoso *lighting por bloco* — cada bloco tem um nível de
luz (0–15); cavernas são escuras, a superfície ao sol é clara, tochas iluminam ao
redor.
✅ **Pronto quando:** ao cavar pra dentro do chão, os blocos ficam progressivamente
mais escuros; a superfície ao sol continua clara.
💡 **Dica:** iluminação por bloco entra na **geometria do chunk** (cor por
vértice), calculada **no rebuild** — não é luz do Three.js em tempo real (seria
caríssimo). O Japa te dá o nível, você pinta o vértice. Mudou a luz → chunk dirty
→ remesh (reusa a Fase 7).

---

# 🛠️ Fase 10 — UI de crafting

> **Depende do Japa:** ele é dono das **receitas** (2×2 e 3×3) e da lógica de
> "essas entradas resultam nessa saída". Você desenha a **grade de crafting** e
> reaproveita os slots/ícones da Fase 8.

### Tarefa 10.1 — UI da grade de crafting
- [ ] Criar `src/components/CraftingUI.tsx` (overlay HTML), reusando o componente
      de slot e o `ItemIcon` da Fase 8.
- [ ] Grade de entrada 2×2 (inventário) e 3×3 (bancada) + slot de **resultado**.
- [ ] Ao mudar as entradas, pedir ao store o resultado da receita
      (`getCraftingResult(grid)` — confirme com o Japa) e mostrar no slot de saída.
- [ ] Ao clicar no resultado, chamar a ação do store que consome os ingredientes e
      entrega o item.
- [ ] Bancada 3×3 só abre perto de uma `CRAFTING_TABLE` (o Rodrigo dispara o
      "abrir"); inventário 2×2 sempre disponível.

🎮 **No Minecraft:** é a *tela de crafting* — a grade onde você arruma os itens no
formato certo e sai o resultado no slot da direita.
✅ **Pronto quando:** arrumar os itens na grade mostra a prévia do resultado;
clicar cria o item e consome os ingredientes.
💡 **Dica:** você **não** implementa as receitas — isso é do Japa. Você só mostra
a grade e chama `getCraftingResult`. Mantenha a UI "burra" e a lógica no store.

---

# 🐷 Fase 11 — Modelos/sprites de mobs, animação e render de entidades

> **Depende do Japa:** ele é dono do **sistema de entidades** (spawn, IA
> wander/chase/flee, posição/rotação/estado de cada mob) no store. O Rodrigo cuida
> da física/combate. Você **lê** a lista de entidades e desenha cada mob no lugar,
> animando.

### Tarefa 11.1 — Modelo de mob (montado de cubos)
- [ ] Criar `src/components/mobs/` com um componente por mob (ex: `Pig.tsx`,
      `Zombie.tsx`), montado de `<mesh>`/`boxGeometry` texturizados (estilo
      Minecraft: corpo + cabeça + 4 patas).
- [ ] Aplicar o atlas/sprite do mob (NearestFilter, igual aos blocos).
- [ ] Alternativa mais simples pra começar: **billboard sprite** (um plano que
      sempre encara a câmera) por mob.

🎮 **No Minecraft:** os mobs são *modelos feitos de caixas* (cabeça, corpo,
pernas) com textura pixelada.
✅ **Pronto quando:** um mob de teste aparece na cena com o formato e textura
certos.
💡 **Dica:** comece com poucos "ossos" (grupos): corpo, cabeça, 4 patas. Isso já
basta pra animar andar (girar as patas) na próxima tarefa.

### Tarefa 11.2 — Render de todas as entidades
- [ ] Criar `src/components/Entities.tsx` que lê `useWorldStore((s) => s.entities)`.
- [ ] Para cada entidade, renderizar o componente de mob certo pelo `type`,
      posicionado por `ref` (`mesh.position/rotation`) — atualizado no `useFrame`
      lendo o estado do mob **sem re-render**.
- [ ] Com muitos mobs iguais, considerar InstancedMesh por tipo de mob.

🎮 **No Minecraft:** todos os mobs vivos do mundo são desenhados nas suas
posições, virados pra onde andam.
✅ **Pronto quando:** os mobs que o Japa spawna aparecem e se movem pelo mundo,
virados na direção do movimento.
💡 **Dica:** a posição do mob muda todo frame (a IA do Japa atualiza) — leia via
`getState()` no `useFrame` e mute a `ref`. Mapear `entities` pra JSX é só pra
criar/remover mobs (quando a lista muda), não pra mover.

### Tarefa 11.3 — Animações (andar, atacar, morrer) + feedback de dano
- [ ] Animar as patas do mob ao andar: oscilar a rotação com o seno do tempo,
      proporcional à velocidade (do estado da entidade).
- [ ] Ao levar dano, piscar o mob de **vermelho** (mutar a cor/emissive por alguns
      frames) — feedback de combate/knockback do Rodrigo.
- [ ] Animação simples de morte (cair/encolher) antes de o store remover a
      entidade.

🎮 **No Minecraft:** o mob *balança as patas* ao andar e *pisca vermelho* ao
apanhar; ao morrer, tomba e some soltando drop.
✅ **Pronto quando:** um mob andando mexe as patas; ao ser atingido, pisca
vermelho; ao morrer, some com uma animaçãozinha e dropa item.
💡 **Dica:** animação de esqueleto simples = `group.rotation.x = Math.sin(t*v)`.
Tudo no `useFrame` mutando refs. Sem timeline pesada.

---

# 🌍 Fase 12 — Partículas, biomas visuais e skybox

> **Depende do Japa:** ele é dono do **mapa de biomas** (qual bioma em cada
> coluna) e da geração de estruturas/árvores. Você **lê** o bioma pra ajustar
> cor/névoa e dispara **partículas** nos eventos (quebrar bloco).

### Tarefa 12.1 — Partículas ao quebrar bloco
- [ ] Criar `src/components/Particles.tsx` (ou um sistema `useParticles`) com um
      pool de partículas reaproveitado (**não** criar mesh novo a cada quebra).
- [ ] Ao quebrar um bloco, emitir ~8–12 partículas pequenas com a **cor/textura do
      bloco quebrado**, com velocidade inicial e gravidade, sumindo em ~0.5s.
- [ ] Usar **um** `<points>` ou InstancedMesh pro pool inteiro; animar posições no
      `useFrame` mutando o atributo, com `needsUpdate = true`.
- [ ] Reciclar partículas mortas em vez de alocar novas.

🎮 **No Minecraft:** ao quebrar um bloco, saem *estilhaços* com a cor/textura do
bloco; ao andar saem pequenas poeiras.
✅ **Pronto quando:** quebrar um bloco solta um pufe de partículas na cor daquele
bloco, que caem e somem.
💡 **Dica:** partícula é a armadilha clássica de performance — **pool fixo** e
reciclagem. Nunca `new Mesh()` por partícula por evento; isso enche o garbage
collector e engasga.

### Tarefa 12.2 — Cor e névoa por bioma
- [ ] Ler o bioma do local do player (do Japa: `getBiome(x,z)`).
- [ ] Ajustar a cor do fog e do céu por bioma (deserto amarelado, floresta
      esverdeada, neve clara) — interpolando ao trocar de bioma pra não "piscar".
- [ ] Tintar a grama/folhas por bioma (grass tint), se o Japa expuser isso —
      multiplicando a cor no vértice/atlas.

🎮 **No Minecraft:** cada *bioma* tem um clima visual — a grama fica mais amarela
no savana, a névoa muda no oceano, neve deixa tudo claro.
✅ **Pronto quando:** atravessar de um bioma pro outro muda suavemente a cor do
céu/névoa (e o tom da grama, se aplicável).
💡 **Dica:** interpole a mudança de bioma ao longo de ~1s. Trocar a cor de golpe
dá um "flash" feio quando o player cruza a fronteira.

### Tarefa 12.3 — Skybox melhor
- [ ] Trocar a cor sólida do céu por um **gradiente** (shader simples de céu ou uma
      esfera invertida com gradiente topo→horizonte).
- [ ] Integrar com o dia-noite (Fase 9): o gradiente muda com a hora.
- [ ] Manter tudo consistente com a cor do fog no horizonte.

🎮 **No Minecraft:** o *céu com gradiente* — mais claro no horizonte, mais forte no
alto, mudando com o dia.
✅ **Pronto quando:** o céu tem um degradê agradável em vez de uma cor chapada, e
acompanha o ciclo dia-noite.
💡 **Dica:** uma esfera grande (`side: BackSide`) com material de gradiente é o
jeito mais barato. Deixe `depthWrite: false` e `renderOrder` baixo pra ela ficar
sempre "atrás" de tudo.

---

## 🔗 Suas integrações (resumo)

| Você CONSOME | De quem | O quê |
|---|---|---|
| `blocks` / `getBlock` | Japa | quais blocos existem e o vizinho (face culling) |
| `getChunk(cx,cz)` + `version` por chunk | Japa | dados do chunk e quando remeshar |
| `BLOCKS[type]` (`texture`, `transparent`) | Japa | tile no atlas e se é vazado |
| `targetBlock` + progresso de mineração | Rodrigo | onde pôr highlight e crack |
| `inventory` / entidades-item | Japa | UI de inventário e drops no chão |
| `worldTime` + `getLight(x,y,z)` | Japa | mover sol/lua e iluminar por bloco |
| receitas (`getCraftingResult`) | Japa | resultado a mostrar na grade |
| `entities` (mobs) | Japa | posição/estado pra desenhar e animar |
| `getBiome(x,z)` | Japa | cor/névoa por bioma |

| Você ENTREGA | Para quem | O quê |
|---|---|---|
| mesh de chunk `name="world-blocks"` | Rodrigo | alvo do raycast (quebrar/colocar) |
| `<Scene>` / `<Canvas>` com luzes e fog | Rodrigo | onde ele pluga o `<Player>` |
| `atlas.ts` (`tileUV`, mapeamento de tiles) | Todos | recorte do atlas reutilizável |
| UIs de inventário/crafting (overlay HTML) | Japa/Rodrigo | telas que consomem o store |

---

## ⚠️ Seus erros mais comuns a evitar
- **Recalcular geometria/lista por frame.** Meshing de chunk, lista de blocos e
  lista de entidades vão em `useMemo`/`useLayoutEffect` com a dependência certa
  (`version` do chunk, `[blocks]`, `[entities]`). Por frame, só `useFrame`+`ref`.
- **Reconstruir o mundo inteiro ao mudar 1 bloco.** Depender do `blocks` global no
  `useMemo` do chunk remesha tudo. Dependa da **`version` daquele chunk** (e do
  vizinho, se for na borda).
- **Esquecer `instanceMatrix.needsUpdate = true`** (e `instanceColor.needsUpdate`)
  — a GPU não vê a mudança.
- **Uma textura por bloco.** Quebra o instancing e explode os draw calls. Um
  **atlas único** → 1 material → poucos draw calls.
- **Deixar o pixel art borrado.** Faltou `NearestFilter` (e desligar mipmaps).
- **Desenhar face escondida entre blocos.** Sem face culling, o navegador morre no
  mundo grande. Sempre cheque o vizinho com `getBlock`.
- **Misturar opaco e transparente no mesmo mesh.** Água/vidro vão em mesh separado,
  desenhados por último, com `depthWrite: false`.
- **Animar/mover com `setState`.** Sol, mobs, drops e partículas se mexem 60x/s —
  mute a `ref` no `useFrame`, nunca `setState`.
- **`boundingSphere` errada.** Quebra o frustum culling e o chunk "pisca" ao virar
  a câmera. Rode `computeBoundingSphere()` depois de montar a geometria.
- **Criar mesh novo por partícula/evento.** Use um **pool** fixo e recicle; senão o
  garbage collector engasga o jogo.
