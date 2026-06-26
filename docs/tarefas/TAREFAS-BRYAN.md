# 🎨 Tarefas do Bryan — Engenheiro de Gráficos e Mundo

> **Seu papel:** transformar os dados de blocos do `worldStore` em um mundo 3D
> que aparece na tela, com performance. Você é os "olhos" do jogo.

> Como usar este doc: marque os `[ ]` conforme termina. Cada tarefa tem
> **🎮 No Minecraft** (a feature equivalente), **✅ Pronto quando** (definição de
> pronto) e **💡 Dica**.

> ⏳ **Você depende do Japa:** só comece a Tarefa 1.2 depois que o `worldStore`
> estiver pronto (Sprint 1 do Japa). Enquanto isso, faça a Tarefa 1.1.

---

## 🏁 Ordem recomendada

1. Sprint 1 → cena 3D + luzes (`Scene.tsx`) — dá pra começar sem o store.
2. Sprint 1 → renderizar os blocos com `InstancedMesh` (`Blocks.tsx`).
3. Sprint 2 → cores por tipo de bloco + sombras.
4. Sprint 3 → polimento visual (céu, neblina).

---

## SPRINT 1 — A Cena 3D

### Tarefa 1.1 — Montar o palco (`Scene.tsx`)
- [ ] Criar `src/components/Scene.tsx` com um `<Canvas>` do React Three Fiber.
- [ ] Configurar a câmera (`fov: 75`).
- [ ] Adicionar `ambientLight` (luz base) e `directionalLight` (o "sol").
- [ ] Adicionar uma cor de fundo de céu (`#87ceeb`).

🎮 **No Minecraft:** é o *render do mundo* — o céu, a luz do sol e a sombra que
dá volume aos blocos.
✅ **Pronto quando:** `bun dev` mostra uma tela azul (céu) sem erros.
💡 **Dica:** sem luz, tudo fica preto. `ambientLight` ilumina por igual;
`directionalLight` cria o sombreamento que diferencia as faces do cubo.

### Tarefa 1.2 — Renderizar os blocos com `InstancedMesh`
- [ ] Criar `src/components/Blocks.tsx`.
- [ ] Ler `blocks` do store: `useWorldStore((s) => s.blocks)`.
- [ ] Converter a `Map` em lista com `useMemo` (recalcula só quando muda).
- [ ] Usar **um** `<instancedMesh>` com `boxGeometry(1,1,1)`.
- [ ] No `useLayoutEffect`, posicionar cada instância com o "dummy"
      (`dummy.position.set` → `updateMatrix` → `setMatrixAt`).
- [ ] Setar `mesh.count` e `mesh.instanceMatrix.needsUpdate = true`.
- [ ] Dar o nome **`name="world-blocks"`** ao mesh (o Rodrigo precisa dele).

🎮 **No Minecraft:** é o *Chunk Rendering* — o jogo NÃO desenha cada bloco
separado (seria lento demais); ele agrupa tudo para mandar pouca coisa pra placa
de vídeo. O `InstancedMesh` é a nossa versão disso.
✅ **Pronto quando:** aparece um piso 16x16 de cubos na tela.
💡 **Dica:** `InstancedMesh` = 1 geometria desenhada N vezes em **1 só comando**
pra GPU. 256 cubos com 1 *draw call* em vez de 256. É o que faz rodar liso.

### Tarefa 1.3 — Reagir quando um bloco é quebrado
- [ ] Confirmar que, ao Rodrigo chamar `removeBlock`, o cubo **some sozinho** da tela.

🎮 **No Minecraft:** quando você minera um bloco, ele desaparece e o chunk é
redesenhado.
✅ **Pronto quando:** quebrar um bloco (clique do Rodrigo) some com o cubo, sem
você escrever código extra — o `useMemo` + store fazem isso automaticamente.
💡 **Dica:** se o bloco NÃO some, o problema está no `removeBlock` do Japa (ele
precisa criar `new Map(...)`). Avise-o.

---

## SPRINT 2 — Aparência dos Blocos

### Tarefa 2.1 — Cor por tipo de bloco
- [ ] Criar um mapa `COLORS` (GRASS verde, DIRT marrom, STONE cinza).
- [ ] Usar `mesh.setColorAt(i, cor)` para cada instância.
- [ ] No material, ativar `vertexColors`.

🎮 **No Minecraft:** é a *textura* de cada bloco (grama verde, pedra cinza...).
No MVP usamos cor sólida; textura real fica pós-MVP.
✅ **Pronto quando:** o chão de grama aparece verde.

### Tarefa 2.2 — Sombras
- [ ] Ativar `shadows` no `<Canvas>`.
- [ ] `castShadow` no `directionalLight` e no `instancedMesh`.
- [ ] `receiveShadow` no mesh.

🎮 **No Minecraft:** é o *Smooth Lighting* — dá profundidade ao mundo.
✅ **Pronto quando:** os cubos têm faces mais claras e mais escuras.
💡 **Dica:** sombra é cara em performance; para o MVP, sombra simples já basta.

---

## SPRINT 3 — Polimento Visual (se sobrar tempo)

### Tarefa 3.1 — Neblina (fog)
- [ ] Adicionar `<fog>` para sumir o horizonte suavemente.

🎮 **No Minecraft:** é o *Render Distance / Fog* (a neblina ao longe).
✅ **Pronto quando:** o limite do mundo não fica com um "corte" seco.

### Tarefa 3.2 — Tipos diferentes de bloco no mundo
- [ ] Combinar com o Japa: gerar uma camada de DIRT abaixo da grama (`y = -1`).

🎮 **No Minecraft:** grama em cima, terra embaixo, pedra mais fundo.
✅ **Pronto quando:** ao quebrar a grama, aparece terra embaixo (precisa do Rodrigo
quebrando e do Japa gerando as camadas).

---

## 🔗 Suas integrações (resumo)

| Você CONSOME | De quem | O quê |
|---|---|---|
| `blocks` | Japa | a lista de blocos a desenhar |

| Você ENTREGA | Para quem | O quê |
|---|---|---|
| mesh `name="world-blocks"` | Rodrigo | alvo do raycast (quebrar bloco) |
| `<Scene>` com `<Canvas>` | Rodrigo | é dentro dela que ele pluga o `<Player>` |

---

## ⚠️ Seu erro mais comum a evitar
- **Recalcular a lista de blocos a cada frame** → trava o jogo. Use `useMemo`
  com dependência `[blocks]` para recalcular só quando o mundo muda.
- **Esquecer `instanceMatrix.needsUpdate = true`** → as posições não atualizam na GPU.
