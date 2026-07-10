# 🎨 Minhas tasks que faltam (Rodrigo + Brayan)

> **Rodrigo:** 100% concluído (câmera FPS, WASD, gravidade, colisão, pulo,
> raycast, clamp de delta). Nada pendente.
>
> **Brayan:** faltam apenas os 2 itens do **Sprint 3 (polimento visual)**.

---

## ❌ Brayan 3.1 — Neblina (fog)

**Situação atual:** o `src/components/Scene.tsx` não tem nenhum `<fog>`.

**O que falta fazer:**
- [ ] Adicionar `<fog>` dentro do `<Canvas>` no `Scene.tsx`.
- [ ] Usar a mesma cor do céu (`#87ceeb`) para o horizonte sumir suavemente.
- [ ] Ajustar `near`/`far` para o mundo 16x16 (ex.: `near≈10`, `far≈40`).

🎮 **No Minecraft:** é o *Render Distance / Fog* — a neblina ao longe.
✅ **Pronto quando:** o limite do mundo não fica com um "corte" seco; some suave.
💡 **Dica:** no R3F é `<fog attach="fog" args={['#87ceeb', 10, 40]} />`. A cor
igual à do `background` faz o horizonte "derreter" no céu.

---

## ❌ Brayan 3.2 — Camada de DIRT abaixo da grama (`y = -1`)

**Situação atual:** o `generateFlatWorld` (no `worldStore.ts`) só gera **grama em
`y = 0`**. Ao quebrar a grama, não aparece nada embaixo.

**O que falta fazer:**
- [ ] Gerar uma camada de `DIRT` em `y = -1` (mesmo grid 16x16).
- [ ] (Opcional) Uma segunda camada de `DIRT`/`STONE` em `y = -2`.
- [ ] Conferir que, ao quebrar a grama, o cubo marrom (terra) aparece embaixo.

🎮 **No Minecraft:** grama em cima, terra embaixo, pedra mais fundo.
✅ **Pronto quando:** quebrar a grama revela um bloco de terra embaixo.

> ⚠️ **Integração com o Japa:** o `generateFlatWorld` fica no `worldStore.ts`, que
> é **dono do Japa**. Combine a mudança com ele antes de editar — ou peça pra ele
> fazer. As cores (GRASS verde, DIRT marrom, STONE cinza) já existem no
> `Blocks.tsx`, então o render já suporta os novos tipos sem mudança.
