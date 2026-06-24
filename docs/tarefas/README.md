# 📋 Tarefas do MVP — por pessoa

Cada um tem seu backlog (checklist por sprint), com a feature equivalente no
**Minecraft original**, a "Definição de Pronto" e dicas.

- 🧠 [Japa — Núcleo (Store + Colisão), UI e Infra](./TAREFAS-JAPA.md)
- 🎨 [Brayan — Gráficos e Mundo](./TAREFAS-BRAYAN.md)
- 🎮 [Rodrigo — Física e Gameplay](./TAREFAS-RODRIGO.md)

> A especificação técnica completa (com os exemplos de código) está em
> [`../../SPECS.md`](../../SPECS.md).

---

## 🔓 Quem destrava quem (leia antes de começar)

O **Japa entrega primeiro**, porque os outros dois dependem dele:

```
Japa: worldStore + aabb.ts  ──►  destrava  ──►  Brayan (render) e Rodrigo (física)
Brayan: mesh "world-blocks"  ──►  destrava  ──►  Rodrigo (raycast de quebrar)
```

Por isso, no **Sprint 1**, a prioridade nº 1 do Japa é o `worldStore`. Enquanto
ele faz isso, Brayan adianta a cena 3D (luzes) e Rodrigo adianta a câmera FPS —
nenhum dos dois precisa do store para essas primeiras tarefas.

---

## 📅 Cronograma resumido (visão de time)

| Sprint | Japa | Brayan | Rodrigo |
|---|---|---|---|
| **1** | `worldStore` + `aabb.ts` | Cena 3D + `InstancedMesh` | Câmera FPS + teclado |
| **2** | Casca Next.js + HUD | Cores + sombras | Gravidade + colisão + pulo |
| **3** | Contador + polimento | Polimento visual | Raycasting (quebrar) |

---

## ✅ Definição de "MVP PRONTO" (a meta do time)

O jogador:
1. anda em primeira pessoa sobre o grid 16x16 (WASD + mouse);
2. **não atravessa o chão** (cai e para com a gravidade);
3. pula com Espaço;
4. mira um bloco, clica, e o **bloco some**;
5. o **contador no HUD sobe** a cada bloco quebrado;
6. tudo isso a **60fps**, sem travar.

Quando os 6 itens funcionam juntos, o MVP está entregue. 🎉

---

## 🤝 3 combinados de time (para não travar na integração)

1. **Nomes são contratos.** `world-blocks`, `getBlock`, `removeBlock`,
   `playerCollides` — ninguém muda sem avisar os outros.
2. **Estado de 60fps em `useRef`; estado de evento no Zustand.** (Regra de Ouro.)
3. **Ao escrever no store, sempre `new Map(...)`.** Senão o render não atualiza.
