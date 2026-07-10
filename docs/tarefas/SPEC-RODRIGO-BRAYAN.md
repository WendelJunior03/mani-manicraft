# 📋 Spec — Tasks do Rodrigo e do Brayan

> **Escopo:** esta spec reúne as tarefas do **Rodrigo (Física e Gameplay)** e do
> **Brayan (Gráficos e Mundo)** — a dupla que produz, respectivamente, o
> **player jogável** e o **mundo 3D renderizado**.
>
> **Dependência comum:** ambos dependem do `worldStore` e do `aabb.ts` do **Japa**
> (contrato central + colisão). O ponto de integração entre eles é o mesh
> `name="world-blocks"`: o Brayan **entrega**, o Rodrigo **mira o raycast** nele.

---

## 🔗 Integração Rodrigo ↔ Brayan

| Fluxo | Quem entrega | Quem consome | O quê |
|---|---|---|---|
| `name="world-blocks"` | Brayan | Rodrigo | mesh alvo do raycast (quebrar bloco) |
| `<Scene>` com `<Canvas>` | Brayan | Rodrigo | é dentro dela que o `<Player>` é plugado |
| `removeBlock` (via store) | Japa | Rodrigo → reflete no render do Brayan | quebrar um bloco some com o cubo sozinho |

> **Contrato do nome `world-blocks`:** não mudar sem avisar — o raycast do Rodrigo
> depende exatamente desse nome.

---

# 🎨 BRAYAN — Engenheiro de Gráficos e Mundo

> **Papel:** transformar os dados de blocos do `worldStore` em um mundo 3D com
> performance. É os "olhos" do jogo.
>
> ⏳ **Depende do Japa:** só começar a Tarefa 1.2 depois do `worldStore` pronto.
> Enquanto isso, fazer a Tarefa 1.1.

## Sprint 1 — A Cena 3D

### Tarefa 1.1 — Montar o palco (`Scene.tsx`)
- [ ] Criar `src/components/Scene.tsx` com um `<Canvas>` do React Three Fiber.
- [ ] Configurar a câmera (`fov: 75`).
- [ ] Adicionar `ambientLight` (luz base) e `directionalLight` (o "sol").
- [ ] Adicionar cor de fundo de céu (`#87ceeb`).

✅ **Pronto quando:** `bun dev` mostra uma tela azul (céu) sem erros.

### Tarefa 1.2 — Renderizar os blocos com `InstancedMesh` (`Blocks.tsx`)
- [ ] Criar `src/components/Blocks.tsx`.
- [ ] Ler `blocks` do store: `useWorldStore((s) => s.blocks)`.
- [ ] Converter a `Map` em lista com `useMemo` (recalcula só quando muda).
- [ ] Usar **um** `<instancedMesh>` com `boxGeometry(1,1,1)`.
- [ ] No `useLayoutEffect`, posicionar cada instância com o "dummy"
      (`dummy.position.set` → `updateMatrix` → `setMatrixAt`).
- [ ] Setar `mesh.count` e `mesh.instanceMatrix.needsUpdate = true`.
- [ ] Dar o nome **`name="world-blocks"`** ao mesh (o Rodrigo precisa dele).

✅ **Pronto quando:** aparece um piso 16x16 de cubos na tela.

### Tarefa 1.3 — Reagir quando um bloco é quebrado
- [ ] Confirmar que, ao Rodrigo chamar `removeBlock`, o cubo **some sozinho** da tela.

✅ **Pronto quando:** quebrar um bloco some com o cubo, sem código extra
(o `useMemo` + store fazem isso automaticamente).

## Sprint 2 — Aparência dos Blocos

### Tarefa 2.1 — Cor por tipo de bloco
- [ ] Criar um mapa `COLORS` (GRASS verde, DIRT marrom, STONE cinza).
- [ ] Usar `mesh.setColorAt(i, cor)` para cada instância.
- [ ] No material, ativar `vertexColors`.

✅ **Pronto quando:** o chão de grama aparece verde.

### Tarefa 2.2 — Sombras
- [ ] Ativar `shadows` no `<Canvas>`.
- [ ] `castShadow` no `directionalLight` e no `instancedMesh`.
- [ ] `receiveShadow` no mesh.

✅ **Pronto quando:** os cubos têm faces mais claras e mais escuras.

## Sprint 3 — Polimento Visual (se sobrar tempo)

### Tarefa 3.1 — Neblina (fog)
- [ ] Adicionar `<fog>` para sumir o horizonte suavemente.

### Tarefa 3.2 — Tipos diferentes de bloco no mundo
- [ ] Combinar com o Japa: gerar uma camada de DIRT abaixo da grama (`y = -1`).

### ⚠️ Erros a evitar (Brayan)
- **Recalcular a lista de blocos a cada frame** → trava. Use `useMemo` com dep `[blocks]`.
- **Esquecer `instanceMatrix.needsUpdate = true`** → posições não atualizam na GPU.

---

# 🎮 RODRIGO — Engenheiro de Física e Gameplay

> **Papel:** dar vida ao player — andar em 1ª pessoa, cair com gravidade, não
> atravessar blocos, e quebrar o bloco mirado. Dono do **game loop** (`useFrame`).
>
> ⏳ **Depende:** `playerCollides(x,y,z)` e `removeBlock` do **Japa**; mesh
> `name="world-blocks"` do **Brayan**. Começar pela Sprint 1 enquanto espera.

## Sprint 1 — Câmera em Primeira Pessoa

### Tarefa 1.1 — Travar o mouse e olhar (mouselook)
- [ ] Criar `src/components/Player.tsx`.
- [ ] Adicionar `<PointerLockControls />` (do `@react-three/drei`).
- [ ] Plugar o `<Player />` dentro do `<Canvas>` (na `Scene` do Brayan).

✅ **Pronto quando:** ao clicar na tela, o mouse trava e você gira a visão.

### Tarefa 1.2 — Capturar o teclado (WASD)
- [ ] Criar `src/physics/useKeyboard.ts` que guarda as teclas em um `useRef`.
- [ ] Usar esse hook no `Player`.

✅ **Pronto quando:** `console.log(keys.current)` mostra `true`/`false` ao apertar WASD.
💡 **Crítico:** teclas em `useRef`, **nunca** `useState` (senão re-render trava o jogo).

### Tarefa 1.3 — Mover na direção em que olha
- [ ] Dentro de `useFrame`, pegar a direção da câmera (`camera.getWorldDirection`).
- [ ] Zerar o eixo Y (não voar) e normalizar.
- [ ] Calcular o vetor `right` com `crossVectors`.
- [ ] Somar/subtrair conforme W/A/S/D e mover a posição (`* delta`).

✅ **Pronto quando:** WASD movem a câmera pelo mundo (sem gravidade/colisão ainda).

## Sprint 2 — Física: Gravidade, Colisão e Pulo

### Tarefa 2.1 — Gravidade
- [ ] Guardar `velocity` em `useRef`.
- [ ] No `useFrame`: `velocity.y += GRAVITY * delta` (`GRAVITY = -28`).
- [ ] Aplicar: `position.y += velocity.y * delta`.

✅ **Pronto quando:** o player cai continuamente (a colisão é a próxima tarefa).

### Tarefa 2.2 — Colisão AABB (não atravessar blocos)
- [ ] Importar `playerCollides` do `@/physics/aabb` (entregue pelo **Japa**).
- [ ] Mover e resolver **um eixo por vez**: X, depois Z, depois Y.
- [ ] Para cada eixo: aplicar o movimento; se `playerCollides(...)` for `true`,
      **desfazer** o movimento daquele eixo e zerar a velocidade dele.
- [ ] No eixo Y: se bateu **caindo**, marcar `onGround = true`.

✅ **Pronto quando:** o player para em cima do chão e não atravessa.

### Tarefa 2.3 — Pulo
- [ ] Se `Espaço` apertado **e** `onGround`, setar `velocity.y = JUMP_SPEED` (≈ 9).
- [ ] Depois de pular, `onGround = false`.

✅ **Pronto quando:** dá pra pular e a gravidade te traz de volta ao chão.

### Tarefa 2.4 — Câmera nos olhos do player
- [ ] No fim do `useFrame`, posicionar a câmera nos pés + altura dos olhos
      (`camera.position.set(x, y + PLAYER_EYE, z)`).

✅ **Pronto quando:** a visão fica na altura de uma pessoa, não rente ao piso.

## Sprint 3 — Quebrar Blocos (Raycasting)

### Tarefa 3.1 — Mirar e quebrar
- [ ] Criar `src/physics/useBreakBlock.ts`.
- [ ] No clique, lançar um `THREE.Raycaster` do **centro da tela** (`0,0`).
- [ ] Limitar o alcance (`raycaster.far = 5`).
- [ ] Mirar no mesh `name="world-blocks"` (do **Brayan**).
- [ ] Pegar o ponto de impacto e a **normal da face**.
- [ ] Calcular o bloco: `inside = point - normal * 0.5`, depois `Math.floor` em cada eixo.
- [ ] Chamar `removeBlock(bx, by, bz)` (do **Japa**).

✅ **Pronto quando:** mirar um bloco e clicar faz ele sumir (e o contador do HUD sobe).

### Tarefa 3.2 — Proteção contra "delta gigante"
- [ ] No `useFrame`, limitar o delta: `const delta = Math.min(rawDelta, 0.05)`.

✅ **Pronto quando:** trocar de aba e voltar não joga o player pra fora do mundo.

### ⚠️ Erros a evitar (Rodrigo)
1. **Posição/velocidade em `useState`** → trava em 60fps. Use `useRef`.
2. **Mover os 3 eixos juntos** → bugs de quina e atravessar. Resolva X→Z→Y separados.
3. **Esquecer o `* delta`** → o jogo fica rápido/lento dependendo do PC.

---

## 🏁 Ordem de execução da dupla

1. **Brayan 1.1** (cena/luzes) — pode começar sem o store.
2. **(Japa entrega `worldStore`)** → **Brayan 1.2/1.3** renderiza os 256 blocos.
3. **Rodrigo 1.x** (câmera FPS + WASD) — em paralelo, sem física.
4. **(Japa entrega `aabb.ts`)** → **Rodrigo 2.x** (gravidade + colisão + pulo).
5. **Rodrigo 3.x** (raycast → `removeBlock`) → **Brayan 1.3** confirma que o cubo some.
6. **Brayan 2.x** (cores + sombras) e polimento (Sprint 3) conforme sobrar tempo.
