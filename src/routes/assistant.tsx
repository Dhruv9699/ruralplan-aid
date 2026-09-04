import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Send, Sparkles, AlertCircle, Loader } from "lucide-react";
import { AppShell, PageHeader } from "@/components/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTranslation } from "@/i18n/useTranslation";
import { SUGGESTED_QUESTIONS } from "@/lib/ruralplan/assistant";
import { useAssistantLLM } from "@/lib/ruralplan/useAssistantLLM";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "RuralPlan Assistant — Production Help" },
      {
        name: "description",
        content:
          "Ask the RuralPlan AI Assistant how much to produce, when to produce and how much raw material you need, answered from your own data.",
      },
      { property: "og:title", content: "RuralPlan Assistant — Production Help" },
      {
        property: "og:description",
        content: "An AI production planning assistant that answers using the data in your account.",
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
  const { t } = useTranslation();
  const { language } = useTranslation();
  const { messages: llmMessages, loading, error, sendMessage, clearError } = useAssistantLLM();
  
  const idRef = useRef(1);
  const [displayMessages, setDisplayMessages] = useState<Message[]>([
    {
      id: 0,
      role: "assistant",
      text: "नमस्कार! I am the RuralPlan Assistant. I can help you decide how much to produce, when to produce, and whether your raw material and stock are enough. All answers use the data entered in your RuralPlan account.",
    },
  ]);
  const [input, setInput] = useState("");

  // Sync llmMessages with displayMessages when assistant response arrives
  const lastLLMMessage = llmMessages[llmMessages.length - 1];
  const lastDisplayMessage = displayMessages[displayMessages.length - 1];
  
  if (
    lastLLMMessage &&
    lastLLMMessage.role === "assistant" &&
    (!lastDisplayMessage || lastDisplayMessage.role === "user")
  ) {
    setDisplayMessages((m) => [
      ...m,
      {
        id: idRef.current++,
        role: "assistant",
        text: lastLLMMessage.content,
      },
    ]);
  }

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;

    const userMsg: Message = {
      id: idRef.current++,
      role: "user",
      text: question,
    };

    setDisplayMessages((m) => [...m, userMsg]);
    setInput("");
    clearError();

    // Send message and let the effect above handle response display
    await sendMessage(question, language as "en" | "hi" | "mr");
  };

  return (
    <AppShell>
      <PageHeader
        title={t("assistant.title")}
        description={t("navigation.assistant")}
      />

      <div className="surface-card flex h-[70vh] flex-col overflow-hidden">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {displayMessages.map((m) => (
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
                  <Sparkles className="size-3.5" /> {t("assistant.title")}
                </span>
              )}
              <p className="whitespace-pre-wrap">{m.text}</p>
            </div>
          ))}

          {/* Loading indicator */}
          {loading && (
            <div className="max-w-[90%] rounded-2xl bg-secondary px-4 py-3 text-sm text-secondary-foreground">
              <div className="flex items-center gap-2">
                <Loader className="size-4 animate-spin" />
                <span>{t("common.loading")}</span>
              </div>
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="max-w-[90%] rounded-2xl bg-destructive/20 border border-destructive px-4 py-3 text-sm text-destructive">
              <div className="flex items-start gap-2">
                <AlertCircle className="size-4 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">Error</p>
                  <p>{error}</p>
                  <button
                    onClick={clearError}
                    className="mt-2 text-xs underline hover:no-underline"
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="border-t border-border p-3 sm:p-4">
          <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
            {SUGGESTED_QUESTIONS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => send(q)}
                disabled={loading}
                className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-secondary disabled:opacity-50 disabled:cursor-not-allowed"
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
              placeholder={t("assistant.messageHint")}
              disabled={loading}
            />
            <Button
              type="submit"
              size="lg"
              className="h-12"
              aria-label={t("assistant.send")}
              disabled={loading}
            >
              <Send className="size-5" />
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
}
