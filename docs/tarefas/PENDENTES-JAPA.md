# 🧠 Japa — Tasks que faltam

> Status geral: **9 de 10 tasks concluídas.** Falta apenas 1 item (Sprint 3).
> As demais (tipos, `worldStore`, `aabb.ts`, app client, HUD mira/hotbar/contador)
> já estão prontas no `src/`.

---

## ❌ Tarefa 3.2 — Tela de "clique para jogar"

**Situação atual:** o `src/components/HUD.tsx` já mostra a dica
*"Clique para travar o mouse..."*, mas ela fica **sempre visível** — não some
depois que o mouse trava.

**O que falta fazer:**
- [ ] Detectar o estado do Pointer Lock (`document.pointerLockElement`).
- [ ] Ouvir o evento `pointerlockchange` no `document`.
- [ ] Mostrar a dica **só enquanto o mouse NÃO estiver travado**; escondê-la
      quando o lock ativa.
- [ ] (Opcional) Deixar a dica maior/central enquanto está destravado, virando
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
