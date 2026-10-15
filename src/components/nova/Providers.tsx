import { useEffect, useState, type ReactNode } from "react";
import { useStore } from "@/lib/store";
import { I18nProvider } from "@/lib/i18n";
import { AppShell } from "./AppShell";
import { Toaster } from "@/components/ui/sonner";

export function Providers({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const theme = useStore((s) => s.theme);
  const lang = useStore((s) => s.lang);

  useEffect(() => {
    Promise.resolve(useStore.persist.rehydrate()).then(() => setReady(true));
    const inFrame = window.self !== window.top;
    if ("serviceWorker" in navigator && import.meta.env.PROD && !inFrame) {
      navigator.serviceWorker.register("/sw.js").catch(() => {});
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.lang = lang;
  }, [theme, lang]);

  if (!ready) {
    return (
      <div className="grid min-h-screen place-items-center">
        <div className="size-6 animate-spin rounded-full border-2 border-muted border-t-foreground" />
      </div>
    );
  }
  return (
    <I18nProvider>
      <AppShell>{children}</AppShell>
      <Toaster position="top-center" />
    </I18nProvider>
  );
}
