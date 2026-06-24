# 🧠 Tarefas do Japa — Núcleo (Store + Colisão), UI e Infra

> **Seu papel:** você é o mais experiente, então leva as **duas peças mais
> difíceis e de maior risco** — o `worldStore` (de que todos dependem) e a
> **matemática de colisão AABB**. Se uma delas estiver errada, o jogo dos outros
> dois quebra. Por isso, **suas entregas do Sprint 1 destravam o time inteiro.**

> Como usar este doc: vá marcando os `[ ]` conforme termina. Cada tarefa tem
> **🎮 No Minecraft** (a feature equivalente no jogo original), **✅ Pronto quando**
> (a definição de pronto) e **💡 Dica**.

---

## 🏁 Ordem recomendada

1. Sprint 1 → `worldStore` + `types` (o contrato). **Faça PRIMEIRO de tudo.**
2. Sprint 1 → `aabb.ts` (colisão). Destrava o Rodrigo.
3. Sprint 2 → casca do app (Next.js) + HUD.
4. Sprint 3 → contador de blocos + polimento.

---

## SPRINT 1 — O Contrato Central (PRIORIDADE MÁXIMA)

### Tarefa 1.1 — Definir os tipos do mundo
- [ ] Criar `src/types/world.ts` com o `enum BlockType` (AIR, GRASS, DIRT, STONE).
- [ ] Criar a função `blockKey(x, y, z)` que devolve `"x,y,z"`.
- [ ] Criar a função `parseKey(key)` que faz o caminho inverso.

🎮 **No Minecraft:** cada bloco tem um *Block ID* (pedra, terra, grama...). O
`BlockType` é a versão simplificada disso.
✅ **Pronto quando:** o arquivo compila e o resto do time consegue importar `BlockType`.
💡 **Dica:** use `number` (enum) e não `string` — comparar número é mais rápido.

### Tarefa 1.2 — Criar o `worldStore` (a fonte da verdade)
- [ ] Criar `src/store/worldStore.ts` com Zustand.
- [ ] Campo `blocks: Map<string, BlockType>`.
- [ ] Função `getBlock(x, y, z)` → devolve o tipo ou `AIR` se não existir.
- [ ] Função `removeBlock(x, y, z)` → **cria uma `new Map(...)`** e remove a chave.
- [ ] Função `generateFlatWorld()` → preenche um grid 16x16 de grama em `y = 0`.

🎮 **No Minecraft:** é o *World Save* — a estrutura que guarda quais blocos
existem e onde. O mundo plano é o modo "Superflat".
✅ **Pronto quando:** no console do navegador, `useWorldStore.getState().getBlock(0,0,0)`
devolve `1` (GRASS) e `removeBlock(0,0,0)` faz virar `0` (AIR).
💡 **Dica CRÍTICA:** no `removeBlock`, **nunca** mute a Map antiga. Sempre
`const next = new Map(state.blocks)`. Se mutar a antiga, o render do Brayan
**não atualiza** e o bloco "não some" na tela. Esse é o bug nº 1 do projeto.

### Tarefa 1.3 — Testar o store sozinho
- [ ] Chamar `generateFlatWorld()` e dar `console.log(blocks.size)` → deve dar **256**.
- [ ] Remover um bloco e conferir que `size` virou 255.

✅ **Pronto quando:** os números batem. **Avise o time que o contrato está pronto.**

---

## SPRINT 1 — A Colisão AABB (destrava o Rodrigo)

### Tarefa 1.4 — Implementar `playerCollides(x, y, z)`
- [ ] Criar `src/physics/aabb.ts`.
- [ ] Exportar as constantes `PLAYER_HALF_WIDTH (0.3)`, `PLAYER_HEIGHT (1.8)`, `PLAYER_EYE (1.6)`.
- [ ] Função `boxesOverlap(...)` — testa sobreposição nos 3 eixos.
- [ ] Função `playerCollides(px, py, pz)` — varre só os blocos ao redor do player.

🎮 **No Minecraft:** é a *hitbox* do jogador (uma caixa de 0.6 × 1.8 × 0.6) que
impede você de atravessar o chão e as paredes.
✅ **Pronto quando:** com o mundo plano gerado:
- `playerCollides(8, 1, 8)` → `false` (pés acima do chão, livre).
- `playerCollides(8, -0.5, 8)` → `true` (pés afundados no bloco de grama).

💡 **A lógica:** duas caixas colidem **só se** se sobrepõem em X **e** Y **e** Z
ao mesmo tempo. Você varre os blocos de `Math.floor(min)` até `Math.floor(max)`
em cada eixo (nunca o mundo inteiro!) e, para cada bloco sólido, testa a sobreposição.

### Tarefa 1.5 — Combinar a assinatura com o Rodrigo
- [ ] Confirmar com o Rodrigo: `playerCollides(x, y, z): boolean`, onde `x,y,z`
      são os **pés** do player.
- [ ] Se mudar a assinatura depois, **avisar o Rodrigo** (o game loop dele depende dela).

✅ **Pronto quando:** o Rodrigo consegue `import { playerCollides } from '@/physics/aabb'`.

---

## SPRINT 2 — Casca do App + HUD

### Tarefa 2.1 — Carregar o jogo só no cliente
- [ ] Criar `src/app/layout.tsx` e `src/app/page.tsx`.
- [ ] Criar `src/app/GameClient.tsx` que importa a `Scene` com
      `dynamic(..., { ssr: false })`.

🎮 **No Minecraft:** é a *tela de início* que carrega o mundo.
✅ **Pronto quando:** `bun dev` abre sem erro de "window is not defined".
💡 **Dica:** WebGL não existe no servidor. O `ssr:false` garante que o Three.js
só roda no navegador.

### Tarefa 2.2 — HUD: mira (crosshair)
- [ ] Criar `src/components/HUD.tsx` como overlay HTML (`position:absolute`).
- [ ] Desenhar um ponto/cruz no centro da tela.
- [ ] **Garantir `pointerEvents: 'none'` no container do overlay.**

🎮 **No Minecraft:** é a *mira* (o `+` no centro) que marca onde você vai mirar.
✅ **Pronto quando:** a mira aparece no centro **e** dá pra quebrar bloco (o clique
não fica preso no HUD).
💡 **Cuidado nº 1:** sem `pointer-events: none`, o HUD "rouba" o clique e o Rodrigo
vai reclamar que "não dá pra quebrar bloco".

### Tarefa 2.3 — HUD: hotbar (barra de itens)
- [ ] Adicionar `selectedSlot` e `setSelectedSlot` no `worldStore`.
- [ ] Desenhar a barra com 3 slots (Grama, Terra, Pedra) na parte de baixo.
- [ ] Destacar o slot selecionado com borda branca.
- [ ] Listener de teclado: teclas `1`, `2`, `3` trocam o slot.

🎮 **No Minecraft:** é a *Hotbar* (a barra de 9 slots embaixo, trocada com 1–9 ou o scroll).
✅ **Pronto quando:** apertar `1`/`2`/`3` move o destaque entre os slots.

---

## SPRINT 3 — Contador e Polimento

### Tarefa 3.1 — Contador de blocos quebrados
- [ ] Adicionar `blocksDestroyed` no store, incrementado dentro do `removeBlock`.
- [ ] Mostrar no HUD (canto superior esquerdo).

🎮 **No Minecraft:** lembra a estatística *"Blocks mined"* (blocos minerados).
✅ **Pronto quando:** ao quebrar um bloco, o número sobe na tela.

### Tarefa 3.2 — Tela de "clique para jogar"
- [ ] Mostrar uma dica ("Clique para travar o mouse") até o Pointer Lock ativar.

🎮 **No Minecraft:** é o *menu de pausa* (Esc destrava o mouse).
✅ **Pronto quando:** o jogador entende que precisa clicar para começar.

---

## 🔗 Suas integrações (resumo)

| Você ENTREGA | Para quem | O quê |
|---|---|---|
| `blocks`, `getBlock` | Brayan | ler o mundo para renderizar |
| `getBlock`, `removeBlock`, `playerCollides` | Rodrigo | colidir e quebrar |
| `selectedSlot` | (seu próprio HUD) | destaque da hotbar |

| Você CONSOME | De quem | O quê |
|---|---|---|
| nada de gameplay | — | você é a base; os outros dependem de você |

---

## ⚠️ Seus 2 erros fatais a evitar
1. **`removeBlock` mutando a Map antiga** → render não atualiza. Sempre `new Map(...)`.
2. **HUD sem `pointer-events: none`** → ninguém consegue quebrar bloco.
