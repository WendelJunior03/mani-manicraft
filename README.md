# Mani Manicraft 🧱

Clone de Minecraft para Web (MVP) — **Next.js + React Three Fiber + Three.js + Zustand**.

Projeto acadêmico (Análise e Desenvolvimento de Sistemas). Equipe: **Brayan**
(Gráficos), **Rodrigo** (Física/Gameplay) e **Japa** (Núcleo, Store + Colisão, UI/Infra).

> Gerenciador de pacotes: **[Bun](https://bun.sh)** (>= 1.3). Instale com
> `curl -fsSL https://bun.sh/install | bash`.

## Como rodar

```bash
git clone git@github.com:WendelJunior03/mani-manicraft.git
bun install
bun dev
```

Abra <http://localhost:3000>. **Clique na tela** para travar o mouse (Pointer Lock).

| Tecla | Ação |
|---|---|
| `W A S D` | Mover |
| `Mouse` | Olhar |
| `Espaço` | Pular |
| `Clique esquerdo` | Quebrar bloco |
| `1` `2` `3` | Trocar slot da hotbar |
| `Esc` | Destravar o mouse |

## Escopo do MVP

1. Mundo plano 16x16 (uma camada de grama).
2. Movimentação FPS com gravidade e colisão AABB (não atravessa chão/paredes).
3. Raycasting para mirar e quebrar blocos.

## Estrutura de pastas

```
src/
├── app/                  # Next.js App Router (JAPA)
│   ├── layout.tsx
│   ├── page.tsx
│   ├── GameClient.tsx    # carrega o 3D só no cliente (ssr:false)
│   └── globals.css
├── components/
│   ├── Scene.tsx         # <Canvas> + luzes (BRAYAN)
│   ├── Blocks.tsx        # InstancedMesh do mundo (BRAYAN)
│   ├── Player.tsx        # game loop + física FPS (RODRIGO)
│   └── HUD.tsx           # overlay 2D: mira + hotbar (JAPA)
├── physics/
│   ├── aabb.ts           # colisão AABB — núcleo difícil (JAPA)
│   ├── useKeyboard.ts    # captura teclado em ref (RODRIGO)
│   └── useBreakBlock.ts  # raycasting de quebrar (RODRIGO)
├── store/
│   └── worldStore.ts     # FONTE DA VERDADE — Zustand (JAPA, dono)
└── types/
    └── world.ts          # contrato central de tipos (time inteiro)
```

## Arquitetura em uma frase

Tudo conversa através do **`worldStore`** (Zustand). Ninguém chama o código do
outro diretamente. Veja **`SPECS.md`** para a especificação técnica completa.

### As 2 regras de ouro

1. **Estado de 60fps (posição/velocidade do player) vive em `useRef`, nunca no Zustand.**
2. **O que vai pro Zustand muda por evento (quebrar bloco), não por frame.**
   Ao escrever, sempre crie uma **nova** `Map` (`new Map(...)`), senão o render não atualiza.
