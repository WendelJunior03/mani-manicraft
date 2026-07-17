# 🧠 Japa — Tasks que faltam

> Status geral: **10 de 10 tasks concluídas. ✅** Nada pendente.
> Todas (tipos, `worldStore`, `aabb.ts`, app client, HUD mira/hotbar/contador e
> a tela "clique para jogar") já estão prontas no `src/`.

---

## ✅ Tarefa 3.2 — Tela de "clique para jogar" (CONCLUÍDA)

**Situação atual:** o `src/components/HUD.tsx` já mostra a dica
*"Clique para travar o mouse..."*, mas ela fica **sempre visível** — não some
depois que o mouse trava.

**O que falta fazer:**
- [x] Detectar o estado do Pointer Lock (`document.pointerLockElement`).
- [x] Ouvir o evento `pointerlockchange` no `document`.
- [x] Mostrar a dica **só enquanto o mouse NÃO estiver travado**; escondê-la
      quando o lock ativa.
- [x] (Opcional) Deixar a dica maior/central enquanto está destravado, virando
      uma dica discreta depois.

🎮 **No Minecraft:** é o *menu de pausa* — `Esc` destrava o mouse e a dica volta.
✅ **Pronto quando:** ao entrar, aparece "Clique para travar o mouse"; ao clicar,
a dica some; ao apertar `Esc`, ela volta.
💡 **Dica:** guarde `locked` em `useState` (isto muda por EVENTO, não por frame —
pode ir no state sem problema). Exemplo do listener:

```tsx
const [locked, setLocked] = useState(false);
useEffect(() => {
  const onChange = () => setLocked(document.pointerLockElement !== null);
  document.addEventListener('pointerlockchange', onChange);
  return () => document.removeEventListener('pointerlockchange', onChange);
}, []);
// ...renderizar a dica central só quando !locked
```

---

## 🔗 Cuidado de integração
- Você mexe **só** no `HUD.tsx`. Não precisa tocar no `Player.tsx` do Rodrigo
  (o `PointerLockControls` já dispara o `pointerlockchange` nativo do browser).
