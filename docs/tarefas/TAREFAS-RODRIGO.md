# 🎮 Tarefas do Rodrigo — Engenheiro de Física e Gameplay

> **Seu papel:** dar vida ao jogador — andar em primeira pessoa, cair com
> gravidade, não atravessar blocos, e quebrar o bloco que está mirando. Você é
> dono do **game loop** (`useFrame`), o coração que roda 60x por segundo.

> Como usar este doc: marque os `[ ]` conforme termina. Cada tarefa tem
> **🎮 No Minecraft** (a feature equivalente), **✅ Pronto quando** (definição de
> pronto) e **💡 Dica**.

> ⏳ **Você depende de dois colegas:**
> - **Japa** te entrega `playerCollides(x,y,z)` (a colisão). Sem ela, você não
>   faz a Tarefa 2.x. Comece pela 1.x enquanto espera.
> - **Brayan** te entrega o mesh `name="world-blocks"` (alvo do raycast).

---

## 🏁 Ordem recomendada

1. Sprint 1 → câmera FPS + teclado (sem física ainda).
2. Sprint 2 → gravidade + colisão AABB (usando o `playerCollides` do Japa).
3. Sprint 2 → pulo.
4. Sprint 3 → raycasting (quebrar bloco).

---

## SPRINT 1 — Câmera em Primeira Pessoa

### Tarefa 1.1 — Travar o mouse e olhar (mouselook)
- [ ] Criar `src/components/Player.tsx`.
- [ ] Adicionar `<PointerLockControls />` (do `@react-three/drei`).
- [ ] Plugar o `<Player />` dentro do `<Canvas>` (na `Scene` do Brayan).

🎮 **No Minecraft:** é a *câmera em primeira pessoa* — clicar trava o mouse e
mover o mouse olha em volta.
✅ **Pronto quando:** ao clicar na tela, o mouse trava e você gira a visão.
💡 **Dica:** `Esc` destrava o mouse (o PointerLockControls já faz isso).

### Tarefa 1.2 — Capturar o teclado (WASD)
- [ ] Criar `src/physics/useKeyboard.ts` que guarda as teclas em um `useRef`.
- [ ] Usar esse hook no `Player`.

🎮 **No Minecraft:** são as teclas de *movimento* (W frente, S trás, A/D lados).
✅ **Pronto quando:** `console.log(keys.current)` mostra `true`/`false` ao apertar WASD.
💡 **Dica CRÍTICA:** guarde as teclas em `useRef`, **nunca** em `useState`. Se usar
`useState`, o React re-renderiza a cada tecla e o jogo trava. (Regra de Ouro 1.)

### Tarefa 1.3 — Mover na direção em que olha
- [ ] Dentro de `useFrame`, pegar a direção da câmera (`camera.getWorldDirection`).
- [ ] Zerar o eixo Y (não voar) e normalizar.
- [ ] Calcular o vetor `right` com `crossVectors`.
- [ ] Somar/subtrair conforme W/A/S/D e mover a posição (`* delta`).

🎮 **No Minecraft:** andar para onde a câmera aponta.
✅ **Pronto quando:** WASD movem a câmera pelo mundo (ainda sem gravidade/colisão).
💡 **Dica:** multiplique **tudo** por `delta` (segundos desde o último frame).
Assim o jogo anda na mesma velocidade em 30 fps ou 144 fps.

---

## SPRINT 2 — Física: Gravidade, Colisão e Pulo

### Tarefa 2.1 — Gravidade
- [ ] Guardar `velocity` (velocidade) em `useRef`.
- [ ] No `useFrame`: `velocity.y += GRAVITY * delta` (use `GRAVITY = -28`).
- [ ] Aplicar: `position.y += velocity.y * delta`.

🎮 **No Minecraft:** a *gravidade* que te faz cair quando não há chão.
✅ **Pronto quando:** o player cai continuamente (vai atravessar o chão por
enquanto — a colisão é a próxima tarefa).
💡 **A matemática (Integração de Euler):** a gravidade acelera a velocidade, e a
velocidade move a posição. Por isso a queda fica cada vez mais rápida (realista).
Usamos `-28` em vez de `-9.8` porque dá uma sensação de jogo menos "lunar".

### Tarefa 2.2 — Colisão AABB (não atravessar blocos)
- [ ] Importar `playerCollides` do `@/physics/aabb` (entregue pelo **Japa**).
- [ ] Mover e resolver **um eixo por vez**: X, depois Z, depois Y.
- [ ] Para cada eixo: aplicar o movimento; se `playerCollides(...)` for `true`,
      **desfazer** o movimento daquele eixo e zerar a velocidade dele.
- [ ] No eixo Y: se bateu **caindo**, marcar `onGround = true`.

🎮 **No Minecraft:** a *hitbox* que te impede de atravessar o chão e as paredes,
mas te deixa deslizar rente a elas.
✅ **Pronto quando:** o player para em cima do chão (não cai mais) e não atravessa.
💡 **Por que um eixo por vez?** Se você movesse os 3 ao mesmo tempo, não saberia
em qual parede bateu. Resolvendo X, depois Z, depois Y separadamente, o player
**desliza** ao longo das paredes e a queda funciona independente do andar.

### Tarefa 2.3 — Pulo
- [ ] Se `Espaço` apertado **e** `onGround`, setar `velocity.y = JUMP_SPEED` (≈ 9).
- [ ] Depois de pular, `onGround = false`.

🎮 **No Minecraft:** o *pulo* (Espaço) — só funciona se você estiver no chão.
✅ **Pronto quando:** dá pra pular e a gravidade te traz de volta ao chão.
💡 **Dica:** o teste `onGround` evita o "pulo infinito" (pular no ar).

### Tarefa 2.4 — Câmera nos olhos do player
- [ ] No fim do `useFrame`, posicionar a câmera nos pés + altura dos olhos
      (`camera.position.set(x, y + PLAYER_EYE, z)`).

🎮 **No Minecraft:** a câmera fica na *altura dos olhos*, não no chão.
✅ **Pronto quando:** a visão fica na altura de uma pessoa, não rente ao piso.

---

## SPRINT 3 — Quebrar Blocos (Raycasting)

### Tarefa 3.1 — Mirar e quebrar
- [ ] Criar `src/physics/useBreakBlock.ts`.
- [ ] No clique do mouse, lançar um `THREE.Raycaster` do **centro da tela** (`0,0`).
- [ ] Limitar o alcance (`raycaster.far = 5`).
- [ ] Mirar no mesh `name="world-blocks"` (do **Brayan**).
- [ ] Pegar o ponto de impacto e a **normal da face**.
- [ ] Calcular o bloco: `inside = point - normal * 0.5`, depois `Math.floor` em cada eixo.
- [ ] Chamar `removeBlock(bx, by, bz)` (do **Japa**).

🎮 **No Minecraft:** é a *mineração* — você mira um bloco e clica para quebrá-lo
(no MVP é instantâneo, sem barra de progresso).
✅ **Pronto quando:** mirar um bloco e clicar faz ele sumir (e o contador do HUD sobe).
💡 **A matemática:** o raio bate na *superfície* do bloco. A `normal` aponta pra
fora. Subtrair `0.5 * normal` entra meio bloco pra dentro, garantindo que você
pegue o bloco certo (e não o vizinho). `+0.5 * normal` daria onde **colocar** um
bloco — guarde isso para o pós-MVP.

### Tarefa 3.2 — Proteção contra "delta gigante"
- [ ] No `useFrame`, limitar o delta: `const delta = Math.min(rawDelta, 0.05)`.

🎮 **No Minecraft:** evita que, ao travar/perder o foco da janela, o player
"teleporte" e atravesse o chão.
✅ **Pronto quando:** trocar de aba e voltar não joga o player pra fora do mundo.

---

## 🔗 Suas integrações (resumo)

| Você CONSOME | De quem | O quê |
|---|---|---|
| `playerCollides(x,y,z)` | Japa | testar colisão no game loop |
| `removeBlock(x,y,z)` | Japa | quebrar o bloco mirado |
| mesh `name="world-blocks"` | Brayan | alvo do raycast |

| Você ENTREGA | Para quem | O quê |
|---|---|---|
| `<Player>` jogável | time | o que faz o jogo virar "jogo" |

---

## ⚠️ Seus erros mais comuns a evitar
1. **Posição/velocidade em `useState`** → trava em 60fps. Use `useRef`.
2. **Mover os 3 eixos juntos** → bugs de quina e atravessar. Resolva X→Z→Y separados.
3. **Esquecer o `* delta`** → o jogo fica rápido/lento dependendo do PC.
