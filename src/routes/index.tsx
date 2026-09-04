import { createFileRoute, Link } from "@tanstack/react-router";
import { BarChart3, CheckCircle2, CloudSun, Package, Scale, Sprout } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTranslation } from "@/i18n/useTranslation";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "RuralPlan — Production Planning" },
      {
        name: "description",
        content:
          "Plan the right production quantity using sales history, expected demand, inventory, raw materials, capacity and weather. Built for rural entrepreneurs in Maharashtra.",
      },
      {
        property: "og:title",
        content: "RuralPlan — Production Planning",
      },
      {
        property: "og:description",
        content:
          "Decide what, when and how much to produce using your own data — demand estimates, stock, raw materials, capacity and weather.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Landing,
});

const BENEFITS = [
  {
    icon: Scale,
    translationKey: "landing.featureProduction",
  },
  {
    icon: CheckCircle2,
    translationKey: "landing.featureDemand",
  },
  {
    icon: BarChart3,
    translationKey: "landing.featureInventory",
  },
];

function Landing() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-background">
      <header className="hero-gradient px-4 pt-6 pb-16 text-sidebar-foreground sm:px-8">
        <div className="mx-auto flex max-w-5xl items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="flex size-10 items-center justify-center rounded-xl bg-sidebar-primary text-sidebar-primary-foreground">
              <Sprout className="size-5" />
            </span>
            <span className="font-display text-lg font-semibold">RuralPlan</span>
          </div>
          <Link to="/auth">
            <Button variant="secondary" size="sm">
              {t("auth.login")}
            </Button>
          </Link>
        </div>

        <div className="mx-auto mt-14 max-w-3xl text-center">
          <h1 className="font-display text-4xl font-semibold sm:text-5xl">{t("landing.title")}</h1>
          <p className="mt-3 text-lg font-medium text-sidebar-primary sm:text-xl">
            {t("landing.subtitle")}
          </p>
          <p className="mx-auto mt-5 max-w-2xl text-base opacity-90">
            {t("dashboard.description")}
          </p>
          <div className="mt-8 flex justify-center">
            <Link to="/auth">
              <Button size="lg" className="h-14 px-10 text-base">
                {t("landing.getStarted")}
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto -mt-10 grid max-w-5xl gap-4 px-4 sm:grid-cols-3 sm:px-8">
        {[
          { icon: Scale, title: "Smart Production Planning", text: "Get a clear recommended production quantity for every product you make." },
          { icon: CheckCircle2, title: "Demand Forecasting", text: "Simple warnings tell you when stock is too high or too low for expected demand." },
          { icon: BarChart3, title: "Inventory Management", text: "Your sales history, inventory, capacity and weather all in one simple screen." },
        ].map(({ icon: Icon, title, text }) => (
          <article key={title} className="surface-card p-5">
            <span className="flex size-11 items-center justify-center rounded-xl bg-secondary text-primary">
              <Icon className="size-5" />
            </span>
            <h2 className="mt-4 font-display text-lg font-semibold">{title}</h2>
            <p className="mt-1.5 text-sm text-muted-foreground">{text}</p>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-5xl px-4 py-14 sm:px-8">
        <div className="surface-card p-6 sm:p-8">
          <h2 className="font-display text-xl font-semibold">
            Answers you get from your own data
          </h2>
          <ul className="mt-4 grid gap-3 text-sm text-muted-foreground sm:grid-cols-2">
            {[
              "What should I produce?",
              "How much should I produce?",
              "When should I produce it?",
              "Do I have enough raw materials?",
              "Is my current stock enough?",
              "Is there a risk of overproduction or shortage?",
            ].map((q) => (
              <li key={q} className="flex items-start gap-2">
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                {q}
              </li>
            ))}
          </ul>
          <div className="mt-6 flex flex-wrap gap-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <Package className="size-3.5" /> Any fruit or food product
            </span>
            <span className="inline-flex items-center gap-2 rounded-full bg-secondary px-3 py-1.5 text-xs font-medium text-secondary-foreground">
              <CloudSun className="size-3.5" /> Weather as a production factor
            </span>
          </div>
        </div>
      </section>

      <footer className="border-t border-border px-4 py-8 text-center text-xs text-muted-foreground">
        RuralPlan · Real-time production planning support for rural entrepreneurs in Maharashtra
      </footer>
    </div>
  );
}
