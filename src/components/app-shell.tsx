import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CloudSun,
  History,
  LayoutDashboard,
  LineChart,
  Menu,
  MessageCircle,
  Package,
  Settings,
  Sprout,
  Globe,
  ChevronDown,
} from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useStore } from "@/lib/ruralplan/store";
import { useTranslation } from "@/i18n/useTranslation";
import { cn } from "@/lib/utils";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const NAV = [
  { to: "/dashboard", label: "dashboard", icon: LayoutDashboard },
  { to: "/planner", label: "planner", icon: CalendarClock },
  { to: "/products", label: "products", icon: Package },
  { to: "/sales", label: "sales", icon: LineChart },
  { to: "/inventory", label: "inventory", icon: Boxes },
  { to: "/weather", label: "weather", icon: CloudSun },
  { to: "/production-history", label: "productionHistory", icon: History },
  { to: "/alerts", label: "alerts", icon: AlertTriangle },
  { to: "/assistant", label: "assistant", icon: MessageCircle },
  { to: "/settings", label: "settings", icon: Settings },
] as const;

const MOBILE_PRIMARY = ["/dashboard", "/planner", "/alerts", "/assistant"];

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <Link to="/" className="flex items-center gap-2.5">
      <span className="flex size-9 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
        <Sprout className="size-5" />
      </span>
      {!compact && (
        <span className="font-display text-lg font-semibold text-sidebar-foreground">RuralPlan</span>
      )}
    </Link>
  );
}

function NavLinks({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { t } = useTranslation();
  return (
    <nav className="flex flex-col gap-1">
      {NAV.map(({ to, label, icon: Icon }) => {
        const active = pathname === to;
        return (
          <Link
            key={to}
            to={to}
            onClick={onNavigate}
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 text-sm font-medium transition-colors",
              active
                ? "bg-sidebar-accent text-sidebar-primary"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground",
            )}
          >
            <Icon className="size-5 shrink-0" />
            {t(`navigation.${label}`)}
          </Link>
        );
      })}
    </nav>
  );
}

export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl font-semibold sm:text-3xl">{title}</h1>
        {description && (
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
        )}
      </div>
      {action}
    </header>
  );
}

function LanguageSelector() {
  const { language, setLanguage } = useTranslation();
  const langLabels: Record<string, string> = {
    en: "English",
    hi: "हिंदी",
    mr: "मराठी",
  };

  return (
    <Select value={language} onValueChange={setLanguage}>
      <SelectTrigger className="h-10 w-auto border border-border bg-background hover:bg-accent/50 transition-colors gap-2 px-3">
        <div className="flex items-center gap-2">
          <Globe className="size-4 flex-shrink-0" />
          <span className="text-sm font-medium hidden sm:inline">{langLabels[language]}</span>
          <span className="text-sm font-medium sm:hidden">{language.toUpperCase()}</span>
        </div>
      </SelectTrigger>
      <SelectContent align="end" className="w-40">
        <SelectItem value="en">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span>English</span>
          </div>
        </SelectItem>
        <SelectItem value="hi">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span>हिंदी</span>
          </div>
        </SelectItem>
        <SelectItem value="mr">
          <div className="flex items-center gap-2">
            <Globe className="size-4" />
            <span>मराठी</span>
          </div>
        </SelectItem>
      </SelectContent>
    </Select>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, ready, isAuthenticated } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const pathname = useRouterState({ select: (s) => s.location.pathname });

  useEffect(() => {
    if (ready && !isAuthenticated) navigate({ to: "/auth", replace: true });
  }, [ready, isAuthenticated, navigate]);

  if (!ready || !isAuthenticated) {
    return <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">{t("common.loading")}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col justify-between bg-sidebar p-4 lg:flex">
        <div className="flex flex-col gap-6">
          <Brand />
          <NavLinks />
        </div>
        <div className="rounded-xl bg-sidebar-accent/70 p-3 text-sidebar-foreground">
          <p className="text-sm font-medium">{profile?.name ?? "RuralPlan User"}</p>
          <p className="text-xs opacity-80">
            {profile ? `${profile.village}, ${profile.district}` : "Your account"}
          </p>
        </div>
      </aside>

      <div className="lg:pl-64">
        {/* Top Header - Visible on All Devices */}
        <div className="sticky top-0 z-20 border-b border-border bg-background/95 backdrop-blur-sm">
          <div className="flex items-center justify-between px-4 py-3 sm:px-6 lg:px-10">
            {/* Mobile Brand */}
            <div className="flex lg:hidden items-center gap-2">
              <span className="flex size-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
                <Sprout className="size-4" />
              </span>
              <span className="font-display text-base font-semibold">RuralPlan</span>
            </div>

            {/* Right Side - Language Selector + Mobile Menu */}
            <div className="flex items-center gap-3 ml-auto">
              {/* Language Selector - Visible on All Devices */}
              <LanguageSelector />

              {/* Mobile Menu Button */}
              <Sheet open={open} onOpenChange={setOpen}>
                <SheetTrigger asChild>
                  <Button 
                    variant="outline" 
                    size="icon" 
                    aria-label="Open menu"
                    className="lg:hidden"
                  >
                    <Menu className="size-5" />
                  </Button>
                </SheetTrigger>
                <SheetContent side="left" className="w-72 bg-sidebar p-4">
                  <div className="mb-6">
                    <Brand />
                  </div>
                  <NavLinks onNavigate={() => setOpen(false)} />
                </SheetContent>
              </Sheet>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <main className="px-4 pt-6 pb-28 sm:px-6 lg:px-10 lg:pb-12">{children}</main>
      </div>

      {/* Mobile Bottom Navigation */}
      <nav className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-border bg-card lg:hidden">
        {NAV.filter((n) => MOBILE_PRIMARY.includes(n.to)).map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            className={cn(
              "flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium",
              pathname === to ? "text-primary" : "text-muted-foreground",
            )}
          >
            <Icon className="size-5" />
            {t(`navigation.${label}`).split(" ")[0]}
          </Link>
        ))}
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="flex flex-col items-center gap-1 py-2.5 text-[11px] font-medium text-muted-foreground"
        >
          <Menu className="size-5" />
          {t("navigation.more")}
        </button>
      </nav>
    </div>
  );
}
