import { Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { Boxes, LayoutDashboard, Moon, PieChart, RotateCcw, Search, Settings, ShoppingCart, Sun, BookUser, Command as CmdIcon, Download, X } from "lucide-react";
import { useStore } from "@/lib/store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { CommandDialog, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Button } from "@/components/ui/button";

const NAV = [
  { to: "/", key: "dashboard", icon: LayoutDashboard },
  { to: "/pos", key: "pos", icon: ShoppingCart },
  { to: "/inventory", key: "inventory", icon: Boxes },
  { to: "/returns", key: "returns", icon: RotateCcw },
  { to: "/ledger", key: "ledger", icon: BookUser },
  { to: "/reports", key: "reports", icon: PieChart },
  { to: "/settings", key: "settings", icon: Settings },
] as const;

function Seg<T extends string>({ value, options, onChange }: { value: T; options: { v: T; label: ReactNode }[]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-md border bg-muted/50 p-0.5 text-xs">
      {options.map((o) => (
        <button
          key={o.v}
          onClick={() => onChange(o.v)}
          className={cn("rounded px-2 py-1 font-medium transition-colors", value === o.v ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground")}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { t, pname } = useI18n();
  const { lang, setLang, role, setRole, theme, setTheme, shift, products, customers } = useStore();
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    navigate({ to, search: search as never });
  };

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b bg-background/85 backdrop-blur">
        <div className="mx-auto flex h-14 max-w-[1440px] items-center gap-3 px-4">
          <Link to="/" className="flex items-center gap-2">
            <div className="grid size-7 place-items-center rounded-md bg-foreground text-background">
              <span className="text-sm font-bold">N</span>
            </div>
            <span className="hidden font-semibold tracking-tight sm:inline">NovaInventory</span>
          </Link>
          <span
            className={cn(
              "inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium",
              shift ? "bg-success-soft text-success" : "bg-danger-soft text-danger",
            )}
          >
            <span className={cn("size-1.5 rounded-full", shift ? "bg-success animate-pulse" : "bg-danger")} />
            {shift ? t.shift.open : t.shift.closed}
          </span>

          <nav className="ml-4 hidden items-center gap-0.5 lg:flex">
            {NAV.map((n) => (
              <Link
                key={n.to}
                to={n.to}
                activeOptions={{ exact: n.to === "/" }}
                className="rounded-md px-2.5 py-1.5 text-sm text-muted-foreground transition-colors hover:text-foreground"
                activeProps={{ className: "bg-muted text-foreground font-medium" }}
              >
                {t.nav[n.key]}
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-2">
            <button
              onClick={() => setOpen(true)}
              className="flex h-8 items-center gap-2 rounded-md border bg-card px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              <Search className="size-3.5" />
              <span className="hidden md:inline">{t.common.search}</span>
              <kbd className="hidden items-center gap-0.5 rounded border bg-muted px-1 font-mono text-[10px] md:inline-flex">
                <CmdIcon className="size-2.5" />K
              </kbd>
            </button>
            <div className="hidden sm:block">
              <Seg value={role} onChange={setRole} options={[{ v: "admin", label: t.common.admin }, { v: "cashier", label: t.common.cashier }]} />
            </div>
            <Seg value={lang} onChange={setLang} options={[{ v: "en", label: "EN" }, { v: "bn", label: "বাংলা" }]} />
            <Seg
              value={theme}
              onChange={setTheme}
              options={[{ v: "light", label: <Sun className="size-3.5" /> }, { v: "dark", label: <Moon className="size-3.5" /> }]}
            />
          </div>
        </div>
      </header>
      <nav className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t bg-background/95 px-3 py-1.5 backdrop-blur lg:hidden">
        {NAV.map((n) => (
          <Link
            key={n.to}
            to={n.to}
            activeOptions={{ exact: n.to === "/" }}
            className="flex shrink-0 flex-col items-center gap-0.5 rounded-md px-2.5 py-1 text-[10px] text-muted-foreground"
            activeProps={{ className: "bg-muted text-foreground font-medium" }}
          >
            <n.icon className="size-4" />
            {t.nav[n.key]}
          </Link>
        ))}
        <div className="ml-auto shrink-0 sm:hidden">
          <Seg value={role} onChange={setRole} options={[{ v: "admin", label: t.common.admin }, { v: "cashier", label: t.common.cashier }]} />
        </div>
      </nav>

      <main className="mx-auto max-w-[1440px] px-4 py-6 pb-24 lg:pb-6">{children}</main>

      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder={t.cmd.placeholder} />
        <CommandList>
          <CommandEmpty>{t.cmd.empty}</CommandEmpty>
          <CommandGroup heading={t.cmd.views}>
            {NAV.map((n) => (
              <CommandItem key={n.to} value={`view ${t.nav[n.key]} ${n.key}`} onSelect={() => go(n.to)}>
                <n.icon className="mr-2 size-4" />
                {t.nav[n.key]}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t.cmd.products}>
            {products.map((p) => (
              <CommandItem key={p.id} value={`${p.name.en} ${p.name.bn} ${p.sku} ${p.barcode}`} onSelect={() => go("/inventory", { q: p.sku })}>
                <Boxes className="mr-2 size-4" />
                <span>{pname(p)}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{p.sku}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading={t.cmd.customers}>
            {customers.map((c) => (
              <CommandItem key={c.id} value={`${c.name} ${c.phone}`} onSelect={() => go("/ledger", { q: c.name })}>
                <BookUser className="mr-2 size-4" />
                <span>{c.name}</span>
                <span className="ml-auto font-mono text-xs text-muted-foreground">{c.phone}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>

      <InstallPrompt />
    </div>
  );
}

type BIP = Event & { prompt: () => Promise<void>; userChoice: Promise<unknown> };

export function useInstall() {
  const [evt, setEvt] = useState<BIP | null>(null);
  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault();
      setEvt(e as BIP);
    };
    window.addEventListener("beforeinstallprompt", h);
    return () => window.removeEventListener("beforeinstallprompt", h);
  }, []);
  return { canInstall: !!evt, install: async () => { await evt?.prompt(); setEvt(null); } };
}

function InstallPrompt() {
  const { t } = useI18n();
  const { canInstall, install } = useInstall();
  const [hidden, setHidden] = useState(false);
  if (!canInstall || hidden) return null;
  return (
    <div className="fixed inset-x-4 bottom-20 z-50 mx-auto flex max-w-md items-center gap-3 rounded-lg border bg-card p-3 shadow-lg lg:bottom-4">
      <div className="grid size-9 shrink-0 place-items-center rounded-md bg-foreground text-background font-bold">N</div>
      <p className="text-sm">{t.settings.installHint}</p>
      <Button size="sm" onClick={install}>
        <Download className="size-3.5" />
        {t.settings.install}
      </Button>
      <button onClick={() => setHidden(true)} className="text-muted-foreground" aria-label={t.common.close}>
        <X className="size-4" />
      </button>
    </div>
  );
}
