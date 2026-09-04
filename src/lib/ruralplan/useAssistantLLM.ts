import { useState, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useStore } from "./store";
import { assistantReply } from "./assistant";

export interface AssistantMessage {
  role: "user" | "assistant";
  content: string;
}

export interface UseAssistantLLMReturn {
  messages: AssistantMessage[];
  loading: boolean;
  error: string | null;
  sendMessage: (message: string, language: "en" | "hi" | "mr") => Promise<void>;
  clearError: () => void;
  clearMessages: () => void;
  isUsingFallback?: boolean;
}

export function useAssistantLLM(): UseAssistantLLMReturn {
  const [messages, setMessages] = useState<AssistantMessage[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isUsingFallback, setIsUsingFallback] = useState(false);
  const conversationRef = useRef<AssistantMessage[]>([]);
  const { products, materials, sales, settings } = useStore();

  const sendMessage = useCallback(
    async (userMessage: string, language: "en" | "hi" | "mr") => {
      if (!userMessage.trim()) return;

      try {
        setError(null);
        setLoading(true);
        setIsUsingFallback(false);

        // Add user message to UI using functional state update
        setMessages((prev) => {
          const updatedMessages = [
            ...prev,
            { role: "user" as const, content: userMessage },
          ];
          conversationRef.current = updatedMessages;
          return updatedMessages;
        });

        // Get auth token
        const {
          data: { session },
        } = await supabase.auth.getSession();
        if (!session) {
          throw new Error("Not authenticated");
        }

        // Try calling edge function
        let assistantMessage: string | null = null;
        let llmError: Error | null = null;

        try {
          const response = await fetch(
            `${supabase.supabaseUrl}/functions/v1/assistant`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${session.access_token}`,
              },
              body: JSON.stringify({
                userMessage,
                language,
                conversationHistory: conversationRef.current.slice(-4), // Last 4 messages
              }),
            }
          );

          if (!response.ok) {
            let errorMessage = `API error: ${response.statusText}`;
            try {
              const errorData = await response.json();
              errorMessage = errorData.error || errorMessage;
            } catch (e) {
              // If response body is not JSON, use status text
            }

            // Provide context about what might be wrong
            if (response.status === 404) {
              errorMessage = "Edge function not deployed. Using fallback assistant.";
            } else if (response.status === 401 || response.status === 403) {
              errorMessage = "Authentication failed. Check OpenAI API key configuration. Using fallback assistant.";
            }

            llmError = new Error(errorMessage);
            throw llmError;
          }

          const data = await response.json();
          assistantMessage = data.response;
        } catch (err) {
          // LLM failed, use fallback
          const fallbackResponse = assistantReply(userMessage, {
            products,
            materials,
            sales,
            production: [],
            safetyStockPercent: settings.safetyStockPercent,
            district: settings.district,
            village: settings.village,
          });

          assistantMessage = fallbackResponse;
          setIsUsingFallback(true);
          setError(
            err instanceof Error
              ? err.message + " (Using offline assistant)"
              : "Using offline assistant"
          );
        }

        // Add assistant response using functional state update
        setMessages((prev) => {
          const finalMessages = [
            ...prev,
            { role: "assistant" as const, content: assistantMessage || "I couldn't generate a response." },
          ];
          conversationRef.current = finalMessages;
          return finalMessages;
        });
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : "Unknown error occurred";
        setError(errorMessage);
        console.error("Assistant error:", err);
      } finally {
        setLoading(false);
      }
    },
    [products, materials, sales, settings]
  );

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    conversationRef.current = [];
  }, []);

  return {
    messages,
    loading,
    error,
    sendMessage,
    clearError,
    clearMessages,
    isUsingFallback,
  };
}
