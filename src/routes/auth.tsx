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
  const [mode, setMode] = useState<"signup" | "login">("signup");
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
    try {
      if (mode === "signup") {
        const confirmed = await register({ name, email, village, district, state }, parsed.data.password);
        if (!confirmed) {
          toast.success("Account created. Check your email to confirm, then log in.");
          setMode("login");
          return;
        }
      } else {
        await login(email, parsed.data.password);
      }
      toast.success(mode === "signup" ? "Account created" : "Welcome back");
      navigate({ to: "/dashboard" });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to authenticate");
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
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
              <TabsTrigger value="login">Login</TabsTrigger>
            </TabsList>
          </Tabs>

          <form onSubmit={submit} className="mt-5 space-y-4">
            {mode === "signup" && (
              <Field label="Name" error={errors["name"]}>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Your full name"
                />
              </Field>
            )}
            <Field label="Email" error={errors["email"]}>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set("email", e.target.value)}
                placeholder="you@example.com"
              />
            </Field>
            <Field label="Password" error={errors["password"]}>
              <Input
                type="password"
                value={form.password}
                onChange={(e) => set("password", e.target.value)}
                placeholder="At least 6 characters"
              />
            </Field>
            {mode === "signup" && (
              <>
                <Field label="Village / Location" error={errors["village"]}>
                  <Input
                    value={form.village}
                    onChange={(e) => set("village", e.target.value)}
                    placeholder="Village or town"
                  />
                </Field>
                <Field label="District" error={errors["district"]}>
                  <Select value={form.district} onValueChange={(v) => set("district", v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select district" />
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
                <Field label="State" error={errors["state"]}>
                  <Input value={form.state} onChange={(e) => set("state", e.target.value)} />
                </Field>
              </>
            )}

            <Button type="submit" size="lg" className="h-12 w-full">
              {mode === "signup" ? "Create account" : "Login"}
            </Button>
            <Button type="button" variant="outline" className="h-12 w-full" onClick={googleLogin}>
              Continue with Google
            </Button>
          </form>
        </div>
        <p className="mt-4 text-center text-xs text-muted-foreground">
          Your products, sales, inventory and production history are stored securely in your account.
        </p>
      </div>
    </div>
  );
}
