<!-- LOVABLE:BEGIN -->
> [!IMPORTANT]
> This project is connected to [Lovable](https://lovable.dev). Avoid rewriting
> published git history — force pushing, or rebasing/amending/squashing commits
> that are already pushed — as it rewrites history on Lovable's side and the
> user will likely lose their project history.
>
> Commits you push to the connected branch sync back to Lovable and show up in
> the editor, so keep the branch in a working state.
<!-- LOVABLE:END -->

- App state lives in one persisted zustand store (src/lib/store.ts, localStorage, skipHydration + rehydrate in Providers). The laptop-local Express JSON API (server/index.js) is the shared LAN sync source; there is no hosted backend. Keep the client gate to avoid SSR hydration mismatches.
- All UI strings come from src/locales/en.ts and bn.ts via useI18n(); bn is typed against en so missing keys fail typecheck.
