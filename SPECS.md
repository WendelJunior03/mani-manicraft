# Especificação Técnica — Mani Manicraft (MVP)

> Clone de Minecraft para Web · Next.js + React Three Fiber + Three.js + Zustand
> Documento de referência para Brayan, Rodrigo e Japa. Leia a Parte 0 **antes** de começar.

---

## Índice

- [Parte 0 — Arquitetura e Regras de Ouro](#parte-0)
- [Parte 1 — O Contrato Central (todos)](#parte-1)
- [Brayan — Gráficos e Mundo](#brayan)
- [Rodrigo — Física e Gameplay](#rodrigo)
- [Japa — Núcleo (Store + Colisão), UI e Infra](#japa)
- [Parte Final — Integração e Cronograma](#parte-final)

---

<a name="parte-0"></a>

## Parte 0 — Arquitetura e Regras de Ouro

### O conceito central

Um jogo voxel é um sistema onde **todas as camadas dependem de UMA única
estrutura de dados: o mundo (os blocos)**.

- **Brayan (Gráficos)** LÊ o mundo para desenhar.
- **Rodrigo (Física)** LÊ o mundo para colidir, e ESCREVE para quebrar.
- **Japa (Núcleo/UI)** é o DONO do estado onde o mundo mora **e da matemática de colisão** (as duas peças mais difíceis).

Por isso, a primeira coisa que o time faz — juntos — é definir o **`worldStore`**.
Ele é a "API interna" do jogo. Depois disso, os três programam contra essa
interface estável, **em paralelo**, sem se pisarem.

> Regra de comunicação: **ninguém chama o código do outro diretamente.**
> Todo mundo conversa através do `worldStore`.

### Diagrama do fluxo de dados

```
                    ┌─────────────────────────────────┐
                    │   worldStore (Zustand)          │  ← JAPA é o DONO
                    │   - blocks: Map<string, Block>  │     (contrato central +
                    │   - selectedSlot: number        │      colisão AABB/aabb.ts)
                    │   - removeBlock(x,y,z)          │
                    └─────────────────────────────────┘
                       ▲          ▲                ▲
              lê (render)│   lê/escreve│          │ lê/escreve
                       │     (colisão)│          │  (hotbar)
              ┌────────┴───┐  ┌─────┴──────┐  ┌──┴──────────┐
              │  BRAYAN    │  │  RODRIGO   │  │   JAPA      │
              │  Gráficos  │  │  Física    │  │ Núcleo + UI │
              │ InstancedM.│  │ loop + Ray │  │ Store+AABB  │
              └────────────┘  └────────────┘  └─────────────┘
                                    │
                              useFrame (game loop)
                              posição do player → ref (NÃO store)
                              (chama playerCollides() do Japa)
```

### As 2 Regras de Ouro (decore — evitam 80% dos bugs)

**Regra 1 — Estado de 60fps NÃO vive no React/Zustand.**
Posição, velocidade e câmera mudam **toda frame**. Se isso disparar `setState`,
o React re-renderiza 60x/segundo = travamento. Esses dados ficam em
**`useRef`**, atualizados dentro do `useFrame`.

**Regra 2 — No Zustand fica só o que muda por EVENTO.**
Os blocos do mundo, o slot da hotbar, o contador. Muda quando o usuário *age*
(quebra um bloco), não a cada frame. Ao escrever, **sempre crie uma nova `Map`**
(`new Map(...)`); mutar a antiga não dispara o re-render e o bloco "não some".

### Stack (e por quê)

| Decisão | Motivo |
|---|---|
| **Next.js** com `dynamic(..., { ssr:false })` | WebGL é client-side; não existe no servidor. |
| **React Three Fiber** | Abstrai o boilerplate do Three.js sem esconder o essencial. |
| **Zustand** (em vez de Context) | Seletores: cada componente só re-renderiza quando *seu* dado muda. |
| **Física própria (AABB)** | Objetivo é **aprender a matemática**. (Rapier fica pós-MVP.) |
| **InstancedMesh** | 256 blocos em **1 draw call** em vez de 256. Escala para mundo real. |

---

<a name="parte-1"></a>

## Parte 1 — O Contrato Central (os 3 definem juntos, Dia 1)

Arquivos: `src/types/world.ts` e `src/store/worldStore.ts`.
**Japa escreve, os três revisam.** Ninguém começa a sua parte antes disto existir.

```typescript
// src/types/world.ts — a "linguagem comum"
export enum BlockType { AIR = 0, GRASS = 1, DIRT = 2, STONE = 3 }
export interface Vec3 { x: number; y: number; z: number }
export function blockKey(x: number, y: number, z: number): string {
  return `${x},${y},${z}`;
}
```

O `worldStore` expõe **leitura** (`getBlock`), **escrita** (`removeBlock`),
e os dados de UI (`selectedSlot`, `blocksDestroyed`). Veja o arquivo completo
em `src/store/worldStore.ts`.

> **Por que `Map` e não array 3D?** O mundo é esparso (quase tudo é ar). A `Map`
> só guarda o que existe; buscar/remover é O(1). É o padrão de engines voxel reais.

---

<a name="brayan"></a>

## Brayan — Engenheiro de Gráficos e Mundo (Three.js / R3F)

### 1. Objetivo principal

Renderizar o mundo lido do `worldStore` com performance. Entregar a cena
(`<Canvas>`), iluminação, e o `<Blocks>` que desenha **todos os blocos com um
único `InstancedMesh`**. Quando o Rodrigo quebra um bloco, o render some sozinho.

### 2. Requisitos técnicos

- **`InstancedMesh`**: 1 geometria + 1 material desenhados N vezes em **1 draw call**.
- **`THREE.Matrix4` + `setMatrixAt(i, matrix)`**: posiciona cada cópia.
- **`THREE.Object3D` (dummy)**: "agulha" que compõe a matriz (`.position.set` → `.updateMatrix()`).
- **`instanceMatrix.needsUpdate = true`**: avisa a GPU que as matrizes mudaram.
- **`useMemo`**: deriva a lista da `Map` só quando ela muda (não por frame).
- **`useLayoutEffect`**: grava as matrizes antes do navegador pintar (sem flicker).
- **Iluminação**: `ambientLight` (base) + `directionalLight` (sol, sombreia faces).

### 3. Núcleo do código

A lógica está em `src/components/Blocks.tsx`. O coração:

```typescript
const dummy = new THREE.Object3D(); // criado UMA vez, fora do componente

useLayoutEffect(() => {
  instances.forEach((b, i) => {
    dummy.position.set(b.x, b.y, b.z); // posiciona no grid (unidade = 1)
    dummy.updateMatrix();              // calcula a Matrix4
    mesh.setMatrixAt(i, dummy.matrix); // grava na instância i
    mesh.setColorAt(i, color.set(COLORS[b.type]));
  });
  mesh.count = instances.length;
  mesh.instanceMatrix.needsUpdate = true; // avisa a GPU
}, [instances]);
```

### 4. Como integrar

- **Consome do Japa:** `useWorldStore((s) => s.blocks)`. Quando a `Map` muda,
  seu render reage sozinho.
- **Expõe para o Rodrigo:** o `InstancedMesh` com **`name="world-blocks"`** — o
  Rodrigo mira o raycast nele. Esse nome é um **contrato**: não mude sem avisar.
- **Expõe para o Japa:** nada (o HUD é HTML fora do `<Canvas>`).

---

<a name="rodrigo"></a>

## Rodrigo — Engenheiro de Física e Gameplay

### 1. Objetivo principal

Dar vida ao player: câmera FPS, WASD, gravidade, pulo, **aplicar a colisão**
(não atravessa blocos), e **quebrar o bloco mirado** (raycasting). Você é dono do
**game loop** (`useFrame`).

> **Divisão da física:** a *matemática* da colisão AABB (`aabb.ts`) é do **Japa**
> (é o núcleo mais difícil). Você **consome** a função `playerCollides(x,y,z)`
> dele dentro do loop. Você cuida do *movimento* (integração, eixos, pulo); ele
> cuida do *teste de sobreposição*. O seção 3a abaixo é o que o Japa te entrega —
> entenda bem, porque você depende dela.

### 2. Requisitos técnicos

- **`PointerLockControls`** (`@react-three/drei`): trava o mouse e faz o mouselook.
- **`useFrame((state, delta) => …)`**: o loop. `delta` = segundos desde a última
  frame. **TUDO multiplicado por `delta`** → roda igual em 30 ou 144 fps.
- **Integração de Euler semi-implícita** (física por frame):
  ```
  velocidade.y += GRAVIDADE * delta   // a gravidade acelera a queda
  posição      += velocidade * delta   // a velocidade move a posição
  ```
- **Colisão AABB**: duas caixas colidem ⇔ **se sobrepõem nos 3 eixos ao mesmo
  tempo**. Truque voxel: **mover e resolver um eixo por vez (X→Z→Y)** evita
  travar em quinas e atravessar.
- **`THREE.Raycaster`**: raio do centro da câmera; retorna ponto de impacto e
  **normal da face**.
- **Refs, não state** (Regra de Ouro 1).

### 3. Núcleo do código

#### 3a. A matemática do AABB (`src/physics/aabb.ts` — entregue pelo Japa)

```typescript
// Duas AABB colidem SE E SOMENTE SE há sobreposição nos 3 eixos.
function boxesOverlap(minX,minY,minZ, maxX,maxY,maxZ, bx,by,bz) {
  return (
    minX < bx + 1 && maxX > bx &&   // eixo X
    minY < by + 1 && maxY > by &&   // eixo Y
    minZ < bz + 1 && maxZ > bz      // eixo Z
  );
}
```

Para testar, varremos só os blocos **ao redor** do player (`Math.floor` dos
limites min/max), nunca o mundo inteiro.

#### 3b. Mover um eixo por vez (`src/components/Player.tsx`)

```typescript
// --- Eixo X ---
p.x += velocity.current.x * delta;
if (playerCollides(p.x, p.y, p.z)) {   // bateu na parede?
  p.x -= velocity.current.x * delta;   // desfaz o movimento
  velocity.current.x = 0;
}
// --- Eixo Z --- (mesma lógica)
// --- Eixo Y --- (chão/teto: se caía e bateu, onGround = true)
```

> **Por quê?** Resolvendo cada eixo isolado, o player **desliza** ao longo das
> paredes (anda rente sem grudar) e a queda é independente do movimento horizontal.

#### 3c. Raycasting para quebrar (`src/physics/useBreakBlock.ts`)

```typescript
raycaster.setFromCamera(new THREE.Vector2(0,0), camera); // centro da tela
const hit = raycaster.intersectObject(worldBlocksMesh)[0];
const normal = hit.face.normal;                          // aponta p/ FORA
const inside = hit.point.clone().addScaledVector(normal, -0.5); // entra meio bloco
removeBlock(Math.floor(inside.x), Math.floor(inside.y), Math.floor(inside.z));
```

> **A matemática:** `hit.point` está na casca do bloco. Subtrair `0.5 * normal`
> entra meio bloco para dentro, garantindo o bloco certo. (`+0.5 * normal` daria
> onde **colocar** um bloco — guarde para o pós-MVP.)

### 4. Como integrar

- **Consome do Japa:** `playerCollides(x,y,z)` (de `aabb.ts`) no game loop; e
  `removeBlock` (quebrar) via `useWorldStore.getState()` — `getState()` (não o
  hook) porque você está no loop e **não quer re-render**.
- **Consome do Brayan:** o mesh `name="world-blocks"`.
- **Combine com o Japa:** o contrato é a assinatura `playerCollides(x,y,z): boolean`
  (pés do player em x,y,z). Se ele mudar a assinatura, te avisa.
- **`<Player />` mora DENTRO do `<Canvas>`** do Brayan.

---

<a name="japa"></a>

## Japa — Núcleo (Store + Colisão), UI e Infra

> Você é o mais experiente do time, então leva as **duas peças mais difíceis e
> de maior risco**: o `worldStore` (contrato de que todos dependem) e a
> **matemática de colisão AABB** (`aabb.ts`). Um erro em qualquer uma quebra o
> jogo dos outros dois — por isso ficam com você.

### 1. Objetivo principal

Três entregas:

1. **`worldStore` (contrato central)** — a fonte da verdade do mundo. Dia 1.
2. **`aabb.ts` (colisão)** — `playerCollides(x,y,z)`, consumida pelo Rodrigo no loop.
3. **Casca do app + HUD** — página Next.js client-side, mira, hotbar e contador.

### 2. Requisitos técnicos

- **`dynamic(..., { ssr:false })`**: WebGL não roda no servidor.
- **Zustand com seletores**: `useWorldStore(s => s.x)` → re-render só quando `x` muda.
- **Colisão AABB**: sobreposição nos 3 eixos; varrer só os blocos ao redor do
  player (`Math.floor` dos limites). Ver a matemática completa na seção 3a do Rodrigo.
- **HUD como overlay HTML, FORA do `<Canvas>`**: `<div>`s com `position:absolute`.
- **`pointer-events: none`** no overlay: senão o HUD "rouba" o clique de quebrar.
- **Listener de teclado** para a hotbar (teclas 1–9).

### 3. Núcleo do código

```typescript
// src/app/GameClient.tsx — carrega o 3D só no cliente
const Scene = dynamic(() => import('@/components/Scene').then(m => m.Scene),
  { ssr: false });

// src/components/HUD.tsx — overlay; pointer-events:none deixa o clique passar
<div style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
  {/* mira central, contador e hotbar */}
</div>
```

### 4. Como integrar

- **Você produz o contrato:** `worldStore.ts` + `types/world.ts`. **Dia 1, sua
  primeira tarefa** — os outros ficam bloqueados sem ele. Entregue o store
  funcional (com `generateFlatWorld`) **antes** do HUD.
- **Expõe para o Brayan:** `blocks`, `getBlock`.
- **Expõe para o Rodrigo:** `getBlock`, `removeBlock`, `selectedSlot` e
  **`playerCollides(x,y,z)`** (de `aabb.ts`). Combine a assinatura com ele cedo —
  o game loop dele depende dela.
- **Cuidado nº 1 do projeto:** garanta `pointerEvents:'none'` no overlay, senão
  o Rodrigo reclama que "não dá pra quebrar bloco".

---

<a name="parte-final"></a>

## Parte Final — Integração e Cronograma

| Fase | Quem | Entrega | Destrava |
|---|---|---|---|
| **Dia 1 (juntos)** | Os 3 | `types/world.ts` + `worldStore.ts`. Acordar nomes (`world-blocks`, `getBlock`, `removeBlock`, `playerCollides`). | Tudo |
| **Sprint 1** | Japa | Store + `generateFlatWorld`, testado com `console.log`. | Brayan e Rodrigo |
| **Sprint 1** | Brayan | `<Canvas>` + `<Blocks>` desenhando os 256 blocos. | Visualização |
| **Sprint 1** | Japa | `aabb.ts` com `playerCollides(x,y,z)` (testar com coordenadas fixas). | Física do Rodrigo |
| **Sprint 2** | Rodrigo | `<Player>`: WASD + gravidade + pulo, usando `playerCollides`. Anda sem cair. | Gameplay |
| **Sprint 2** | Japa | HUD: mira + hotbar + contador. | UX |
| **Sprint 3** | Rodrigo | Raycasting → `removeBlock`. Bloco some (Brayan reage sozinho). | Loop completo |

### Definição de "MVP pronto"

O jogador anda em 1ª pessoa sobre o grid 16x16, **não atravessa o chão**, mira um
bloco, clica, o bloco **some** e o contador no HUD **sobe** — tudo a 60fps sem
re-render por frame.

### Os 3 maiores riscos (vigiem como time)

1. **Posição do player no Zustand** → quebra os 60fps. Use `useRef`.
2. **Mutar a `Map` sem `new Map(...)`** → render não atualiza. O bloco "não some".
3. **HUD sem `pointer-events: none`** → cliques não chegam ao jogo.

### Evoluções pós-MVP (se sobrar tempo)

- Colocar blocos (`+0.5 * normal` no raycast + `addBlock` no store).
- Texturas nos blocos (`TextureLoader` + UV mapping).
- Mundo com altura/relevo (ruído Perlin/Simplex).
- Trocar a física própria por `@react-three/rapier`.
