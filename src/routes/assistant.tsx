import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Send, Sparkles } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useStore } from "@/lib/ruralplan/store";
import { SUGGESTED_QUESTIONS, assistantReply } from "@/lib/ruralplan/assistant";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "RuralPlan Assistant — Production Help" },
      {
        name: "description",
        content:
          "Ask the RuralPlan Assistant how much to produce, when to produce and how much raw material you need, answered from your own data.",
      },
      { property: "og:title", content: "RuralPlan Assistant — Production Help" },
      {
        property: "og:description",
        content: "A production planning assistant that answers using the data in your account.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: AssistantPage,
});

interface Message {
  id: number;
  role: "user" | "assistant";
  text: string;
}

function AssistantPage() {
  const { products, materials, sales, production, settings } = useStore();
  const idRef = useRef(1);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "Namaskar! I am the RuralPlan Assistant. I can help you decide how much to produce, when to produce, and whether your raw material and stock are enough. All answers use the data entered in your RuralPlan account.",
    },
  ]);
  const [input, setInput] = useState("");

  const send = (text: string) => {
    const question = text.trim();
    if (!question) return;
    const reply = assistantReply(question, {
      products,
      materials,
      sales,
      production,
      safetyStockPercent: settings.safetyStockPercent,
      district: settings.district,
      village: settings.village,
    });
    setMessages((m) => [
      ...m,
      { id: idRef.current++, role: "user", text: question },
      { id: idRef.current++, role: "assistant", text: reply },
    ]);
    setInput("");
  };

  return (
    <AppShell>
      <PageHeader
        title="RuralPlan Assistant"
        description="Ask questions about production planning. The assistant only uses your own data and does not use live market information."
      />

      <div className="surface-card flex h-[70vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {messages.map((m) => (
            <div
              key={m.id}
              className={
                m.role === "user"
                  ? "ml-auto max-w-[85%] rounded-2xl bg-primary px-4 py-3 text-sm text-primary-foreground"
                  : "max-w-[90%] rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground"
              }
            >
              {m.role === "assistant" && (
                <span className="mb-1 flex items-center gap-1.5 text-xs font-semibold text-primary">
                  <Sparkles className="size-3.5" /> RuralPlan Assistant
                </span>
              )}
              {m.text}
            </div>
          ))}
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary"
              >
                {q}
              </button>
            ))}
          </div>
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              send(input);
            }}
          >
            <Input
              className="h-12"
              value={input}
              maxLength={300}
              onChange={(e) => setInput(e.target.value)}
              placeholder="e.g. How much should I produce this week?"
            />
            <Button type="submit" size="lg" className="h-12" aria-label="Send question">
              <Send className="size-5" />
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
