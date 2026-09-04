import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { Sprout } from "lucide-react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/field";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useStore } from "@/lib/ruralplan/store";
import { useTranslation } from "@/i18n/useTranslation";
import { MAHARASHTRA_DISTRICTS } from "@/lib/ruralplan/weather";
import { lovable } from "@/integrations/lovable";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Login or Sign Up — RuralPlan" },
      {
        name: "description",
        content:
          "Create your RuralPlan account to start planning production with your own sales, stock and raw material data.",
      },
      { property: "og:title", content: "Login or Sign Up — RuralPlan" },
      {
        property: "og:description",
        content: "Sign in to RuralPlan and plan production with your own data.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AuthPage,
});

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(60),
  email: z.string().trim().email("Please enter a valid email address").max(120),
  password: z.string().min(6, "Password must be at least 6 characters").max(72),
  village: z.string().trim().min(2, "Please enter your village or location").max(60),
  district: z.string().trim().min(2, "Please select a district"),
  state: z.string().trim().min(2),
});

function AuthPage() {
  const { register, login } = useStore();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [mode, setMode] = useState<"signup" | "login">("signup");
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    village: "Ozar",
    district: "Nashik",
    state: "Maharashtra",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const set = (k: keyof typeof form, v: string) => setForm((f) => ({ ...f, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (loading) return; // Prevent duplicate submissions
    
    const payload = mode === "login" ? { ...form, name: form.name || "RuralPlan User" } : form;
    const parsed = schema.safeParse(payload);
    if (!parsed.success) {
      const map: Record<string, string> = {};
      for (const issue of parsed.error.issues) map[String(issue.path[0])] = issue.message;
      setErrors(map);
      return;
    }
    setErrors({});
    const { name, email, village, district, state } = parsed.data;
    
    setLoading(true);
    try {
      if (mode === "signup") {
        const registered = await register({ name, email, village, district, state }, parsed.data.password);
        if (registered) {
          toast.success(t("auth.accountCreatedSuccess"));
          navigate({ to: "/dashboard" });
        }
      } else {
        await login(email, parsed.data.password);
        toast.success(t("common.welcome"));
        navigate({ to: "/dashboard" });
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : t("common.error");
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function googleLogin() {
    const result = await lovable.auth.signInWithOAuth("google", { redirect_uri: window.location.origin });
    if (result.error) toast.error(result.error.message);
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-secondary/40 px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-6 flex items-center justify-center gap-2.5">
          <span className="flex size-10 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Sprout className="size-5" />
          </span>
          <span className="font-display text-xl font-semibold">RuralPlan</span>
        </div>

        <div className="surface-card p-6">
          <Tabs value={mode} onValueChange={(v) => setMode(v as "signup" | "login")}>
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signup">{t("auth.signUp")}</TabsTrigger>
              <TabsTrigger value="login">{t("auth.login")}</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "signup" && (
              <Field label={t("auth.name")} error={errors["name"]}>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={t("auth.yourFullName")}
                />
              </Field>
            )}
            <Field label={t("auth.email")} error={errors["email"]}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder={t("auth.youExample")}
              />
            </Field>
            <Field label={t("auth.password")} error={errors["password"]}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder={t("auth.atLeast6Chars")}
              />
            </Field>
            {mode === "signup" && (
              <>
                <Field label={t("auth.village")} error={errors["village"]}>
                  <Input
                    value={form.village}
                    onChange={(e) => set("village", e.target.value)}
                    placeholder={t("auth.villageOrTown")}
                  />
                </Field>
                <Field label={t("auth.district")} error={errors["district"]}>
                  <Select value={form.district} onValueChange={(v) => set("district", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder={t("auth.selectDistrict")} />
                    </SelectTrigger>
                    <SelectContent>
                      {MAHARASHTRA_DISTRICTS.map((d) => (
                        <SelectItem key={d} value={d}>
                          {d}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label={t("auth.state")} error={errors["state"]}>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
                </Field>
              </>
            )}

            <Button type="submit" size="lg" className="h-12 w-full" disabled={loading}>
              {loading ? (mode === "signup" ? t("auth.creatingAccount") : t("auth.signingIn")) : (mode === "signup" ? t("auth.createAccount") : t("auth.login"))}
            </Button>
            <Button type="button" variant="outline" className="h-12 w-full" onClick={googleLogin} disabled={loading}>
              {t("auth.continueWithGoogle")}
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          {t("auth.disclaimer")}
        </p>
      </div>
    </div>
  );
}
