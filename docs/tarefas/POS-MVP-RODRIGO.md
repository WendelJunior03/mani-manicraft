# 🎮 Pós-MVP do Rodrigo — Engenheiro de Física e Gameplay

> **Seu papel daqui pra frente:** o jogo já anda, cai, colide e quebra bloco. Agora
> você transforma a "engine que anda" num **jogo de sobrevivência**: colocar bloco,
> minerar com tempo por dureza, tomar dano de queda, nadar, correr, agachar,
> interagir com bancada, dar física e combate aos mobs, e fazer o passo soar. Você
> continua dono do **game loop** (`useFrame`) — o coração 60x/s.

> Como usar este doc: marque os `[ ]` conforme termina. Cada tarefa tem
> **🎮 No Minecraft** (a feature equivalente), **✅ Pronto quando** (definição de
> pronto testável) e **💡 Dica**. Segue o mesmo padrão do `TAREFAS-RODRIGO.md`.

> ⏳ **De quem você depende (leia antes de começar cada fase):**
> - **Japa** (núcleo/store): te entrega `addBlock`, a tabela `BLOCKS` (com `solid`,
>   `hardness`, `drops`), os stats de vida/fome, o sistema de entidades (mobs) e o
>   relógio do mundo. Sem a assinatura dele pronta, você não fecha a tarefa — mas
>   pode adiantar a matemática com valores fixos e trocar depois.
> - **Brayan** (gráficos): te entrega o mesh `name="world-blocks"` (alvo do raycast),
>   o highlight/wireframe do alvo, o overlay de "crack" (trinca), os modelos/animações
>   de mob e a UI de bancada/inventário. Você só passa **dados** pra ele (o alvo, o
>   progresso da mineração); ele desenha.

> ⚠️ **Regra de Ouro que NUNCA muda:** estado de 60fps (posição, velocidade,
> progresso de mineração, timers) vive em `useRef` — **nunca** `useState`/`set` por
> frame. Para ler o mundo dentro do loop use `useWorldStore.getState()` (nunca o hook
> reativo). Só escreve no store em **evento** (colocou bloco, terminou de minerar,
> tomou dano) — nunca 60x/s.

---

## 🏁 Ordem recomendada (só as fases onde você tem trabalho)

1. **Fase 4** → colocar bloco (raycast +normal, `addBlock`) + passar o alvo pro highlight.
2. **Fase 5** → colisão ignora blocos não-sólidos (água/folhas), usando a tabela `solid`.
3. **Fase 8** → minerar por dureza (segurar clique, acumular tempo, cancelar) + passar progresso.
4. **Fase 9** → dano de queda, física de água/nado, sprint, agachar.
5. **Fase 10** → interagir com bloco (abrir bancada via raycast + tecla).
6. **Fase 11** → física de mob (reusa `aabb`), combate/ataque/knockback do player.
7. **Fase 12** → sons de passo (e sons de quebrar/colocar/dano, se sobrar tempo).

> As fases 6 e 7 são do Brayan/Japa (mundo procedural e render em chunks). Você só
> **consome** o resultado: `getBlock` continua funcionando igual, agora com mundo
> grande. Sua colisão e seu raycast **não mudam** — só passam a rodar num mundo maior.

---

## FASE 4 — Construção (Colocar Blocos)

> Depende de: **Japa** expor `addBlock(x, y, z, type)` no `worldStore`. **Brayan**
> vai desenhar o highlight, mas quem calcula QUAL bloco está mirado é você.

### Tarefa 4.1 — Colocar bloco no clique direito (raycast +normal)
- [ ] Em `src/physics/useBreakBlock.ts` (ou crie um irmão `usePlaceBlock.ts`), tratar o
      **botão direito** (`e.button === 2`) separado do esquerdo (quebrar).
- [ ] Reaproveitar o raycaster do centro da tela (`CENTER = (0,0)`), `far = 5`, mirando
      no mesh `name="world-blocks"` do Brayan.
- [ ] Pegar `hit.point` e `hit.face.normal`. Ao contrário de quebrar, aqui você **soma**
      meio bloco na direção da normal para cair na célula **vizinha** (o espaço vazio).
- [ ] `Math.floor` em cada eixo → `(bx, by, bz)`.
- [ ] Chamar `useWorldStore.getState().addBlock(bx, by, bz, type)`, onde `type` vem do
      slot ativo: `useWorldStore.getState().selectedSlot`.
- [ ] Prevenir o menu do navegador: `e.preventDefault()` no `contextmenu`.

```typescript
function onMouseDown(e: MouseEvent) {
  raycaster.setFromCamera(CENTER, camera);
  raycaster.far = REACH;
  const target = scene.getObjectByName('world-blocks');
  if (!target) return;
  const hits = raycaster.intersectObject(target, false);
  if (hits.length === 0 || !hits[0].face) return;
  const hit = hits[0];
  const normal = hit.face!.normal.clone();

  if (e.button === 0) {
    // QUEBRAR: recua meio bloco -> entra NO bloco mirado.
    const inside = hit.point.clone().addScaledVector(normal, -0.5);
    useWorldStore.getState().removeBlock(
      Math.floor(inside.x), Math.floor(inside.y), Math.floor(inside.z),
    );
  } else if (e.button === 2) {
    // COLOCAR: avança meio bloco -> cai na célula VIZINHA (o vazio).
    const outside = hit.point.clone().addScaledVector(normal, 0.5);
    const bx = Math.floor(outside.x), by = Math.floor(outside.y), bz = Math.floor(outside.z);
    const type = useWorldStore.getState().selectedBlockType(); // ou selectedSlot -> type
    useWorldStore.getState().addBlock(bx, by, bz, type);
  }
}
```

🎮 **No Minecraft:** clicar com o **botão direito** coloca o bloco da mão na face que
você está mirando.
✅ **Pronto quando:** mirar uma face e clicar direito faz nascer um bloco **encostado**
na face (nunca dentro do bloco mirado), com o tipo do slot ativo.
💡 **A matemática:** quebrar usa `-0.5 * normal` (entra no bloco); colocar usa
`+0.5 * normal` (sai pro vizinho). É literalmente o mesmo raio, com o sinal trocado.

### Tarefa 4.2 — Não colocar bloco dentro do próprio player
- [ ] Antes de chamar `addBlock`, testar se a célula alvo colidiria com o player.
- [ ] Reusar a matemática do `playerCollides`: se colocar o bloco em `(bx,by,bz)`
      sobrepõe a caixa do player (pés em `feet.current`), **cancelar** a colocação.
- [ ] Como o `usePlaceBlock` não tem acesso ao `feet` ref do `Player`, exponha a
      posição via um ref compartilhado (ex.: um módulo `playerState.ts` com
      `export const playerFeet = new THREE.Vector3()` atualizado no `useFrame`).

```typescript
// Recusa se o bloco novo encostaria no player (senão você "entala" dentro dele).
if (blockOverlapsPlayer(bx, by, bz, playerFeet)) return;
```

🎮 **No Minecraft:** você não consegue colocar um bloco no espaço onde você está —
o jogo bloqueia.
✅ **Pronto quando:** mirar o próprio chão embaixo e tentar colocar bloco onde você
está de pé **não** te prende dentro dele.
💡 **Dica:** `blockOverlapsPlayer` é a mesma checagem de sobreposição do `aabb.ts`,
só que testando **um** bloco específico contra a caixa do player.

### Tarefa 4.3 — Passar o bloco mirado para o highlight (colaboração com Brayan)
- [ ] No `useFrame` do `Player` (ou num hook `useTargetBlock`), a **cada frame** lançar
      o raycast do centro e calcular o bloco mirado (o de **quebrar**: `-0.5 * normal`).
- [ ] Guardar o alvo num `useRef` (`targetBlock.current = {x,y,z} | null`) — **nunca**
      `setState` por frame (Regra de Ouro).
- [ ] Expor esse alvo pro Brayan: via ref compartilhado no módulo `playerState.ts`, ou
      escrevendo num store **leve** que só atualiza quando o alvo **muda de célula**
      (comparar com o alvo anterior antes de escrever).

```typescript
// Só escreve no store quando o bloco mirado MUDA (não 60x/s):
if (bx !== last.x || by !== last.y || bz !== last.z) {
  last.x = bx; last.y = by; last.z = bz;
  useWorldStore.getState().setHighlight(bx, by, bz); // Brayan desenha o wireframe
}
```

🎮 **No Minecraft:** o contorno preto que aparece no bloco que você está mirando.
✅ **Pronto quando:** o Brayan consegue desenhar o wireframe exatamente no bloco que
você mira, e ele some quando você olha pro céu (alvo `null`).
💡 **Dica:** guarde o "último alvo" num ref e só escreva no store quando mudar de
célula. Isso evita re-render a cada frame **e** dá o dado que o Brayan precisa.

---

## FASE 5 — Colisão de Blocos Não-Sólidos

> Depende de: **Japa** entregar a tabela `BLOCKS: Record<BlockType, BlockDef>` com o
> campo `solid: boolean` (água e folhas = `solid: false`). Sem a tabela, use um `Set`
> temporário de "não-sólidos" e troque depois.

### Tarefa 5.1 — Colisão ignora blocos não-sólidos
- [ ] Em `src/physics/aabb.ts`, dentro do `playerCollides`, trocar o teste
      `getBlock(...) === BlockType.AIR` por um teste de **solidez**.
- [ ] Consultar a tabela do Japa: `if (!BLOCKS[type].solid) continue;` — pula ar,
      água, folhas (se o time decidir que folha é atravessável), plantas, etc.

```typescript
// ANTES: if (getBlock(bx, by, bz) === BlockType.AIR) continue;
// DEPOIS:
const type = getBlock(bx, by, bz);
if (!BLOCKS[type].solid) continue; // ar/água/folhas não colidem
```

🎮 **No Minecraft:** você atravessa a água e (dependendo do jogo) as folhas/plantas,
mas para nos blocos sólidos.
✅ **Pronto quando:** você **anda para dentro** de água/folhas sem parar, mas continua
parando em grama/pedra/madeira.
💡 **Dica:** centralize a pergunta "isso é sólido?" numa função pequena
(`isSolid(type)`) para não repetir `BLOCKS[type].solid` em vários lugares. A física de
água em si é a Fase 9 — aqui é só **deixar entrar**.

---

## FASE 8 — Mineração por Dureza

> Depende de: **Japa** entregar `BLOCKS[type].hardness` (segundos base pra quebrar) e
> manter o `removeBlock`/drops. **Brayan** entrega o overlay de "crack" (trinca) e vai
> ler o progresso 0→1 que você fornece.

### Tarefa 8.1 — Segurar o clique acumula tempo (não é mais instantâneo)
- [ ] No hook de quebrar, separar **`mousedown`** (começa a minerar) de **`mouseup`**
      (cancela). Guardar `isMining` num `useRef`.
- [ ] No `useFrame`, se `isMining`, acumular `miningTime.current += delta`.
- [ ] Ler a dureza do alvo: `const hardness = BLOCKS[targetType].hardness;`.
- [ ] Quando `miningTime >= hardness`, chamar `removeBlock(bx,by,bz)` e **resetar**
      `miningTime = 0`.

```typescript
// dentro do useFrame:
if (mining.current && target.current) {
  const { x, y, z } = target.current;
  const type = useWorldStore.getState().getBlock(x, y, z);
  const hardness = BLOCKS[type].hardness; // ex.: pedra 1.5s, terra 0.5s
  mining.current.time += delta;
  if (mining.current.time >= hardness) {
    useWorldStore.getState().removeBlock(x, y, z);
    mining.current.time = 0;
  }
}
```

🎮 **No Minecraft:** minerar leva **tempo** — pedra demora mais que terra; você segura
o clique até o bloco quebrar.
✅ **Pronto quando:** segurar o clique numa pedra demora mais que numa terra, e o bloco
só some quando o tempo bate a dureza.
💡 **Dica:** o tempo acumulado vive em `useRef` (60fps). Só o `removeBlock` (o evento
de quebrar) toca o store. Nunca escreva o progresso no store a cada frame.

### Tarefa 8.2 — Cancelar ao soltar o clique OU trocar de bloco mirado
- [ ] No `mouseup`, setar `mining.current = null` e zerar o tempo.
- [ ] A cada frame, comparar o bloco mirado atual com o que você estava minerando. Se
      **mudou de célula** (você desviou a mira), **resetar** `miningTime = 0`.

```typescript
// Se o alvo mudou de bloco, o progresso do anterior é perdido:
if (target.current && mining.current &&
    (target.current.x !== mining.current.x || /* ...y, z */)) {
  mining.current.time = 0;
  mining.current.x = target.current.x; // ...atualiza y, z
}
```

🎮 **No Minecraft:** se você tira a mira do bloco no meio da mineração, o progresso
"zera" e a trinca some.
✅ **Pronto quando:** soltar o clique ou olhar pra outro bloco reinicia o progresso do
zero.
💡 **Dica:** guarde no ref de mineração **qual** bloco (x,y,z) está sendo minerado,
não só o tempo. É esse par (bloco + tempo) que deixa você detectar a troca.

### Tarefa 8.3 — Publicar o progresso 0→1 pro overlay de trinca (Brayan)
- [ ] Calcular `progress = clamp(miningTime / hardness, 0, 1)`.
- [ ] Expor esse progresso + a posição do bloco pro Brayan (ref compartilhado, ou store
      leve que só escreve quando `progress` cruza um "estágio" — o Minecraft tem 10
      estágios de trinca).
- [ ] Para não escrever 60x/s: só notifique quando `Math.floor(progress * 10)` mudar.

```typescript
const stage = Math.floor(progress * 10); // 0..9 (os "cracks" do Minecraft)
if (stage !== lastStage.current) {
  lastStage.current = stage;
  useWorldStore.getState().setMiningStage(target.current, stage); // Brayan desenha
}
```

🎮 **No Minecraft:** as rachaduras que aparecem no bloco e vão ficando mais fortes até
ele quebrar.
✅ **Pronto quando:** o Brayan consegue mostrar a trinca evoluindo em 10 estágios
conforme você segura o clique.
💡 **Dica:** o Minecraft usa exatamente **10 estágios** de trinca. Publicar por estágio
(`Math.floor(progress*10)`) dá o mesmo efeito sem inundar o store de updates.

---

## FASE 9 — Sobrevivência (Dano de Queda, Água/Nado, Sprint, Agachar)

> Depende de: **Japa** entregar os stats de vida no store (`health`, `applyDamage(n)`).
> **Brayan** entrega o HUD de corações (só lê `health`). A tabela `BLOCKS` precisa marcar
> `WATER` como não-sólido (Fase 5, já feito) — aqui você dá a **física** dela.

### Tarefa 9.1 — Dano de queda pela velocidade Y no impacto
- [ ] No `useFrame`, **antes** de zerar `velocity.y` na colisão com o chão, guardar a
      velocidade de impacto (`impactVy = velocity.current.y`, que é negativa).
- [ ] Converter velocidade em dano: só machuca acima de um limite seguro. Traduzir a
      "distância de queda" do Minecraft (a partir de ~3 blocos) para velocidade.
- [ ] Chamar `useWorldStore.getState().applyDamage(dano)` **uma vez** no frame do impacto
      (é evento, não por frame).

```typescript
// no bloco de colisão do eixo Y, quando bateu caindo (velocity.y < 0):
const impact = -velocity.current.y;        // velocidade de queda (positiva)
const SAFE = 12;                            // abaixo disso não machuca
if (impact > SAFE) {
  const damage = Math.floor((impact - SAFE) * 0.5); // 1 coração ~ 2 de dano
  if (damage > 0) useWorldStore.getState().applyDamage(damage);
}
onGround.current = true;
velocity.current.y = 0;
```

🎮 **No Minecraft:** cair de mais de ~3 blocos tira coração; quanto mais alto, mais dano.
✅ **Pronto quando:** pulinho pequeno não machuca, mas cair de uma torre alta tira vida
(e o HUD do Brayan reage).
💡 **A matemática:** no Minecraft o dano é `distânciaDeQueda - 3`. Como você trabalha
com **velocidade**, use um limiar `SAFE` (velocidade equivalente a ~3 blocos de queda) e
converta o excesso em dano. Ajuste `SAFE` e o fator testando.

### Tarefa 9.2 — Física de água (gravidade reduzida + flutuar)
- [ ] Detectar se o player está **dentro d'água**: `getBlock` na posição da cabeça/pés
      retorna `WATER`. Guardar `inWater` num `useRef` (recalcula por frame).
- [ ] Se `inWater`: usar uma **gravidade menor** e um **arrasto** (multiplicar a
      velocidade por ~0.8 a cada frame) — cai devagar, "amortecido".
- [ ] Aplicar uma pequena **flutuação** para cima (empuxo) quando dentro d'água.

```typescript
const inWater = useWorldStore.getState().getBlock(
  Math.floor(p.x), Math.floor(p.y + PLAYER_EYE), Math.floor(p.z)
) === BlockType.WATER;

if (inWater) {
  velocity.current.y += GRAVITY * 0.3 * delta; // gravidade fraca na água
  velocity.current.multiplyScalar(0.8);        // arrasto (água é densa)
  velocity.current.y += BUOYANCY * delta;      // empuxo leve pra cima
} else {
  velocity.current.y += GRAVITY * delta;       // gravidade normal no ar
}
```

🎮 **No Minecraft:** na água você afunda devagar, tudo fica "pesado" e lento.
✅ **Pronto quando:** entrar na água freia a queda e o movimento fica visivelmente mais
lento e amortecido.
💡 **Dica:** guarde `inWater` num ref recalculado por frame. Ele muda o comportamento
da gravidade **e** do nado (próxima tarefa) — calcule uma vez, use nos dois.

### Tarefa 9.3 — Nadar (subir com Espaço na água)
- [ ] Se `inWater` **e** `Space` apertado, empurrar pra cima (`velocity.y = SWIM_UP`,
      um valor menor que o pulo normal). Isso permite subir/boiar nadando.
- [ ] Não exigir `onGround` para "nadar pra cima" (diferente do pulo).

```typescript
if (inWater && k['Space']) {
  velocity.current.y = SWIM_UP; // ex.: 4 — sobe nadando, mais devagar que o pulo
}
```

🎮 **No Minecraft:** segurar Espaço na água te faz **subir/boiar** em direção à
superfície.
✅ **Pronto quando:** dentro d'água, segurar Espaço te leva pra cima; soltar te faz
afundar devagar.
💡 **Dica:** nadar não usa `onGround` (você não tem chão na água). É o único caso em que
Espaço mexe na velocidade Y sem estar no chão.

### Tarefa 9.4 — Sprint (correr segurando Shift/Ctrl)
- [ ] Escolher a tecla de sprint (Minecraft usa correr ao segurar uma tecla ou W duplo;
      simplifique com `ShiftLeft` **ou** `ControlLeft` — combine com o time).
- [ ] Se a tecla de sprint estiver ativa **e** houver movimento pra frente, multiplicar
      `MOVE_SPEED` por um fator (`SPRINT_MULT ≈ 1.5`).
- [ ] (Opcional/colabora) sprint drena fome mais rápido — se o Japa expuser fome,
      avise-o para gastar mais quando `isSprinting`.

```typescript
const sprinting = k['ControlLeft'] && k['KeyW'];
const speed = sprinting ? MOVE_SPEED * SPRINT_MULT : MOVE_SPEED;
if (move.lengthSq() > 0) move.normalize().multiplyScalar(speed);
```

🎮 **No Minecraft:** correr te deixa mais rápido (e o FOV abre um pouco).
✅ **Pronto quando:** segurar a tecla de sprint andando pra frente te deixa nitidamente
mais rápido.
💡 **Dica:** só faz sentido correr **pra frente**. Trave o sprint quando não houver
`KeyW`, senão o jogador "corre" de ré, o que fica estranho.

### Tarefa 9.5 — Agachar (sneak: mais lento + não cair da borda)
- [ ] Se a tecla de agachar (ex.: `ShiftLeft`) estiver ativa: reduzir `MOVE_SPEED`
      (`SNEAK_MULT ≈ 0.4`) e **abaixar a câmera** um pouco (`PLAYER_EYE - 0.2`).
- [ ] (Comportamento clássico) impedir cair da borda: se agachado e o próximo passo
      levaria o player a um bloco **sem chão** embaixo, **cancelar** aquele movimento
      horizontal (testar `playerCollides` um pouco abaixo dos pés no destino).

```typescript
const sneaking = k['ShiftLeft'];
const eye = sneaking ? PLAYER_EYE - 0.2 : PLAYER_EYE;
// ao resolver X/Z: se sneaking e não há chão no destino, desfaz o passo.
if (sneaking && onGround.current && !hasGroundBelow(p.x, p.y, p.z)) {
  p.x -= velocity.current.x * delta; // não deixa cair da borda
}
```

🎮 **No Minecraft:** agachar (sneak) te deixa mais lento, abaixa a câmera e **impede
você de cair** da beirada dos blocos.
✅ **Pronto quando:** agachado você anda devagar, a visão abaixa, e você **não cai** ao
andar até a beira de uma plataforma.
💡 **Dica:** o "não cair da borda" é: no destino do passo, teste se existe bloco sólido
logo abaixo dos pés (`hasGroundBelow`). Se não existe e você está no chão agachado,
desfaça só aquele eixo — igual à resolução de colisão que você já domina.

---

## FASE 10 — Interagir com Blocos (Abrir a Bancada)

> Depende de: **Japa** definir quais blocos são "interagíveis" (ex.: `CRAFTING_TABLE`)
> e o estado de UI aberta (ex.: `openCraftingUI()`). **Brayan** desenha a UI da bancada.
> Você só **detecta a intenção** (mirou a bancada + apertou a tecla) e avisa.

### Tarefa 10.1 — Detectar clique direito numa bancada e abrir a UI
- [ ] No handler de botão direito (o mesmo da colocação, Fase 4), **antes** de tentar
      colocar bloco, checar se o bloco mirado é **interagível**.
- [ ] Se o bloco mirado (o de "quebrar": `-0.5 * normal`) for `CRAFTING_TABLE` (ou outro
      interagível), **não** colocar bloco — chamar `useWorldStore.getState().openCraftingUI()`.
- [ ] Ao abrir a UI, destravar o mouse (a UI precisa do cursor): coordenar com o
      `PointerLockControls` (ex.: `controls.unlock()`), e re-travar ao fechar (`Esc`).

```typescript
if (e.button === 2) {
  const inside = hit.point.clone().addScaledVector(normal, -0.5);
  const bx = Math.floor(inside.x), by = Math.floor(inside.y), bz = Math.floor(inside.z);
  const type = useWorldStore.getState().getBlock(bx, by, bz);
  if (BLOCKS[type].interactable) {          // bancada, forno, baú...
    useWorldStore.getState().openCraftingUI();
    return;                                  // NÃO coloca bloco quando interage
  }
  // senão: fluxo normal de colocar bloco (Fase 4)
}
```

🎮 **No Minecraft:** clicar com o botão direito na **bancada** abre a grade de crafting
3x3 (em vez de colocar um bloco).
✅ **Pronto quando:** mirar a bancada e clicar direito abre a UI do Brayan (e o mouse
destrava para usar a grade); mirar chão comum ainda coloca bloco.
💡 **Dica:** a ordem importa — teste "é interagível?" **antes** de "colocar bloco". Se
inverter, você coloca um bloco em cima da bancada em vez de abri-la. E lembre de
re-travar o `PointerLockControls` ao fechar a UI.

---

## FASE 11 — Física de Mobs + Combate

> Depende de: **Japa** entregar o **sistema de entidades** (lista de mobs com
> `position`, `velocity`, `health`), a IA (wander/chase/flee decide **para onde** o mob
> quer ir) e o `applyDamage` de mob. **Brayan** entrega o modelo/animação do mob e o
> feedback visual de dano. Você dá a **física** (reusa `aabb`) e o **combate do player**.

### Tarefa 11.1 — Física do mob reusando o AABB do player
- [ ] Criar `src/physics/mobPhysics.ts` (ou uma função pura `stepEntity(entity, delta)`).
- [ ] Para cada mob: aplicar gravidade, mover e resolver colisão **um eixo por vez**,
      exatamente como no `Player` — mas usando o AABB **do mob** (largura/altura próprias).
- [ ] Generalizar `playerCollides` para `entityCollides(x, y, z, halfW, height)` no
      `aabb.ts` (o player vira só um caso: `halfW = PLAYER_HALF_WIDTH`, etc.).
- [ ] A IA do Japa só fornece a **intenção de movimento** (direção/velocidade horizontal);
      você aplica física e colisão. O mob não atravessa parede nem cai no vazio (se a IA
      não mandar).

```typescript
// aabb.ts — generaliza; player passa a ser um caso particular:
export function entityCollides(px, py, pz, halfW, height): boolean { /* ...igual, com halfW/height */ }
export const playerCollides = (x, y, z) =>
  entityCollides(x, y, z, PLAYER_HALF_WIDTH, PLAYER_HEIGHT);

// mobPhysics.ts — mesma resolução X -> Z -> Y do Player:
export function stepEntity(e, delta) {
  e.velocity.y += GRAVITY * delta;
  e.pos.x += e.velocity.x * delta;
  if (entityCollides(e.pos.x, e.pos.y, e.pos.z, e.halfW, e.height)) { e.pos.x -= e.velocity.x * delta; }
  // ...Z, depois Y (marcando onGround do mob)
}
```

🎮 **No Minecraft:** os mobs (vaca, zumbi) têm gravidade e hitbox — não atravessam
paredes nem flutuam.
✅ **Pronto quando:** um mob solto no ar cai e para no chão; empurrado contra uma parede,
ele para (não atravessa).
💡 **Dica:** **não duplique** a matemática de colisão. Generalize `playerCollides` para
receber tamanho de caixa e reutilize. Player e mob são a mesma física com dimensões
diferentes.

### Tarefa 11.2 — Ataque do player (clique com raycast curto na entidade)
- [ ] No clique esquerdo, além de tentar minerar bloco, lançar um raycast curto
      (`far ≈ 3`) contra os **meshes dos mobs** (o Brayan nomeia/registra as entidades).
- [ ] Se acertar um mob, chamar `useWorldStore.getState().damageEntity(id, ATTACK_DAMAGE)`.
- [ ] Respeitar um **cooldown** de ataque (`useRef` com timestamp) para não bater 60x/s.

```typescript
if (now - lastAttack.current > ATTACK_COOLDOWN) {
  const mobHit = raycaster.intersectObjects(mobMeshes, true)[0];
  if (mobHit && mobHit.distance <= 3) {
    lastAttack.current = now;
    useWorldStore.getState().damageEntity(mobHit.object.userData.entityId, ATTACK_DAMAGE);
    applyKnockback(mobHit.object.userData.entityId); // Tarefa 11.3
  }
}
```

🎮 **No Minecraft:** clicar num mob dá dano (e tem um pequeno intervalo entre golpes).
✅ **Pronto quando:** mirar um mob e clicar reduz a vida dele (o Japa/Brayan mostram),
e você não consegue "metralhar" — há cooldown.
💡 **Dica:** priorize o alvo: se o raio bate primeiro num **bloco** mais perto que o mob,
foi mineração, não ataque. Compare as distâncias dos dois raycasts (bloco vs. mob).

### Tarefa 11.3 — Knockback (empurrão) ao acertar
- [ ] Ao acertar o mob, calcular a direção **do player para o mob** (horizontal,
      normalizada) e somar um impulso na velocidade do mob (`KNOCKBACK_FORCE`), com um
      empurrãozinho pra cima.
- [ ] O empurrão altera a **velocidade** da entidade; a física da 11.1 resolve a colisão
      (o mob não é jogado através de paredes).

```typescript
function applyKnockback(entityId) {
  const e = useWorldStore.getState().getEntity(entityId);
  const dir = new THREE.Vector3(e.pos.x - playerFeet.x, 0, e.pos.z - playerFeet.z).normalize();
  e.velocity.x += dir.x * KNOCKBACK_FORCE;
  e.velocity.z += dir.z * KNOCKBACK_FORCE;
  e.velocity.y = KNOCKBACK_UP; // pulinho do empurrão
}
```

🎮 **No Minecraft:** ao apanhar, o mob é **empurrado pra trás** (e o player também, se
apanhar).
✅ **Pronto quando:** bater no mob o joga pra trás na direção oposta a você, e ele não
atravessa parede ao voar.
💡 **Dica:** o knockback é só um **impulso de velocidade** — quem impede o mob de
atravessar a parede é a física da 11.1, que já resolve colisão por eixo. Reaproveite.

### Tarefa 11.4 — (Colabora) Knockback e dano NO player ao apanhar
- [ ] Quando um mob ataca o player (a IA/Japa decide o hit), aplicar o mesmo empurrão na
      **velocidade do player** (ref `velocity.current`) na direção mob→player.
- [ ] O dano em si (`applyDamage`) é do Japa; você só dá o **empurrão físico**.

🎮 **No Minecraft:** levar dano de um mob também **te empurra** pra trás.
✅ **Pronto quando:** ser atingido por um mob te empurra visivelmente para longe dele.
💡 **Dica:** é o espelho da 11.3 — mesma matemática, agora mexendo no `velocity.current`
do player em vez do mob.

---

## FASE 12 — Sons (Passos e Feedback)

> Depende de: **Japa** entregar o **sistema de áudio** (ex.: `playSound(name)` que toca
> um efeito). Você decide **quando** tocar; o Japa fornece o **como**. Os arquivos de som
> são responsabilidade de infra (Japa/Brayan).

### Tarefa 12.1 — Som de passo por distância percorrida
- [ ] No `useFrame`, acumular a distância horizontal andada (`stepAccum += horizVel * delta`).
- [ ] Quando `stepAccum` passar de um limiar (ex.: ~2 blocos), tocar um passo e resetar.
- [ ] Só tocar se `onGround` (no ar não tem passo) e se houve movimento real.
- [ ] Escolher o som pelo bloco **sob os pés** (`getBlock(x, y-1, z)`): grama, pedra,
      areia, madeira têm sons diferentes.

```typescript
const horizSpeed = Math.hypot(velocity.current.x, velocity.current.z);
if (onGround.current && horizSpeed > 0.1) {
  stepAccum.current += horizSpeed * delta;
  if (stepAccum.current > STEP_DISTANCE) {
    stepAccum.current = 0;
    const ground = useWorldStore.getState().getBlock(Math.floor(p.x), Math.floor(p.y - 0.1), Math.floor(p.z));
    audio.playSound(footstepFor(ground)); // ex.: 'step_grass', 'step_stone'
  }
}
```

🎮 **No Minecraft:** o som de passo muda conforme o bloco em que você anda (grama,
pedra, areia soam diferente).
✅ **Pronto quando:** andar toca passos ritmados; correr toca mais rápido; parar/pular
não toca; o som combina com o bloco do chão.
💡 **Dica:** dispare o passo por **distância percorrida**, não por tempo. Assim correr
(mais rápido) toca passos mais frequentes automaticamente, sem código extra.

### Tarefa 12.2 — (Opcional) Sons de quebrar, colocar, cair na água e dano
- [ ] Ao `removeBlock` (fim da mineração): tocar som de quebra do material do bloco.
- [ ] Ao `addBlock`: tocar som de colocar.
- [ ] Ao entrar na água (`inWater` mudou de `false` pra `true`): som de splash.
- [ ] No dano de queda (Tarefa 9.1): som de "oof"/impacto.

🎮 **No Minecraft:** cada ação tem seu som — quebrar, colocar, cair, apanhar.
✅ **Pronto quando:** as ações principais têm feedback sonoro e o jogo "soa vivo".
💡 **Dica:** todos são **eventos** (não por frame). Chame `playSound` no mesmo ponto em
que você já dispara a ação — não precisa de lógica nova de tempo.

---

## 🔗 Suas integrações (resumo)

| Você CONSOME | De quem | O quê |
|---|---|---|
| `addBlock(x,y,z,type)` | Japa | colocar bloco (Fase 4) |
| `removeBlock(x,y,z)` | Japa | quebrar bloco ao fim da mineração |
| `getBlock(x,y,z)` | Japa | colisão, detectar água, bloco do chão |
| `BLOCKS[type]` (`solid`, `hardness`, `interactable`) | Japa | colisão não-sólida, tempo de mineração, abrir bancada |
| `selectedSlot` / tipo do slot | Japa | qual bloco colocar |
| stats: `health`, `applyDamage(n)` | Japa | dano de queda / apanhar de mob |
| entidades: lista de mobs, `getEntity`, `damageEntity`, IA (intenção de movimento) | Japa | física e combate de mob |
| `openCraftingUI()` + estado de UI aberta | Japa | interagir com bancada |
| `playSound(name)` | Japa | passos e feedback sonoro |
| mesh `name="world-blocks"` | Brayan | alvo do raycast (quebrar/colocar) |
| meshes dos mobs (com `entityId` em `userData`) | Brayan | raycast de ataque |
| UI de bancada/inventário | Brayan | destravar/travar o mouse ao abrir/fechar |

| Você ENTREGA | Para quem | O quê |
|---|---|---|
| bloco mirado (alvo do highlight) | Brayan | wireframe/overlay do bloco na mira |
| progresso/estágio da mineração (0..9) | Brayan | overlay de "crack" (trinca) |
| física de player (andar/pular/nadar/sprint/sneak) | time | a "sensação" do jogo |
| física de mob (`stepEntity` reusando `aabb`) | Japa/Brayan | mob que cai, colide, é empurrado |
| dano de queda / knockback | Japa | integra com vida e combate |
| momento de tocar cada som | Japa | dispara `playSound` na hora certa |

---

## ⚠️ Seus erros mais comuns a evitar
1. **Progresso de mineração / alvo do highlight em `useState`** → re-render 60x/s trava
   tudo. Vive em `useRef`; só escreve no store quando **muda de estágio/célula**.
2. **Trocar `-0.5` por `+0.5` no lugar errado** → quebrar entra no bloco mirado
   (`-0.5 * normal`); colocar sai pro vizinho (`+0.5 * normal`). Errar isso coloca bloco
   dentro do que você quebraria.
3. **Colocar bloco dentro do próprio player** → teste sobreposição com a caixa do player
   **antes** de `addBlock`, senão você entala.
4. **Duplicar a matemática de colisão pro mob** → generalize `playerCollides` para
   receber o tamanho da caixa; mob e player são a mesma física.
5. **Mover os 3 eixos juntos (também no mob)** → resolva X → Z → Y separados, igual ao
   player, ou volta o bug de quina/atravessar.
6. **Esquecer o `* delta`** em qualquer coisa nova (nado, sprint, knockback) → fica
   rápido/lento dependendo do PC.
7. **Ler o store com o hook reativo dentro do `useFrame`** → use sempre
   `useWorldStore.getState()` no loop; o hook é só pra componentes que re-renderizam por
   evento.
8. **Dano/knockback aplicado por frame** → é **evento** (um impacto). Aplique uma vez, no
   frame do acontecimento, nunca acumulando 60x/s.
9. **Colocar bloco em vez de abrir a bancada** → teste "é interagível?" **antes** de
   colocar, e lembre de destravar/re-travar o `PointerLockControls` com a UI.
