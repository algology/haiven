"use client";

import { useState, useEffect } from "react";
import { AssistantRuntimeProvider } from "@assistant-ui/react";
import { useChatRuntime } from "@assistant-ui/react-ai-sdk";
import { ThreadList } from "@/components/assistant-ui/thread-list";
import { ChatGPT } from "@/components/assistant-ui/chatgpt";
import { ConfigPanel } from "@/components/assistant-ui/config-panel";

interface ValidatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
  description: string;
  category: "data-protection" | "content-safety" | "business-compliance";
}

interface DLPViolation {
  type: string;
  message: string;
  severity: "low" | "medium" | "high";
}

interface DLPErrorResponse {
  violations: DLPViolation[];
  message: string;
}

const DEFAULT_VALIDATORS: ValidatorConfig[] = [
  // Data Protection
  {
    id: "pii-detection",
    name: "PII Detection",
    enabled: true,
    type: "privacy",
    description:
      "Detects personal identifiable information like names, emails, and phone numbers",
    category: "data-protection",
  },
  {
    id: "sensitive-data",
    name: "Financial & Medical Data",
    enabled: true,
    type: "privacy",
    description:
      "Identifies sensitive financial and medical information (SSN, credit cards)",
    category: "data-protection",
  },
  {
    id: "code-secrets",
    name: "API Keys & Secrets",
    enabled: true,
    type: "security",
    description:
      "Prevents exposure of API keys, passwords, and authentication tokens",
    category: "data-protection",
  },

  // Content Safety
  {
    id: "toxic-language",
    name: "Toxic Language",
    enabled: false,
    type: "content",
    description: "Filters harmful, abusive, or inappropriate language",
    category: "content-safety",
  },
  {
    id: "profanity-filter",
    name: "Profanity Filter",
    enabled: false,
    type: "content",
    description: "Blocks profane and offensive language",
    category: "content-safety",
  },

  // Business Compliance
  {
    id: "competitor-check",
    name: "Competitor Mentions",
    enabled: false,
    type: "business",
    description: "Detects mentions of competitor companies or products",
    category: "business-compliance",
  },
];

export default function ChatPage() {
  const [validators, setValidators] =
    useState<ValidatorConfig[]>(DEFAULT_VALIDATORS);

  // Load validators from localStorage
  useEffect(() => {
    const saved = localStorage.getItem("haiven-validators");
    if (saved) {
      try {
        const parsedValidators = JSON.parse(saved);
        setValidators(parsedValidators);
      } catch (error) {
        console.error("Failed to parse saved validators:", error);
      }
    }
  }, []);

  // Listen for validator changes from ConfigPanel
  useEffect(() => {
    const handleValidatorsChange = (event: CustomEvent) => {
      console.log("Validators changed:", event.detail);
      setValidators(event.detail);
    };

    window.addEventListener(
      "validators-changed",
      handleValidatorsChange as EventListener
    );
    return () =>
      window.removeEventListener(
        "validators-changed",
        handleValidatorsChange as EventListener
      );
  }, []);

  const runtime = useChatRuntime({
    api: "/api/chat",
    body: {
      validators: validators,
    },
    onError: (error: Error) => {
      console.log("=== CHAT RUNTIME ERROR ===");
      console.log("Error message:", error.message);

      // Check if this is a DLP error
      const errorMessage = error.message || "";
      const isDLPError =
        errorMessage.includes("Message blocked by DLP policy") ||
        errorMessage.includes("violations") ||
        errorMessage.includes("PII Detection") ||
        errorMessage.includes("Status 400");

      if (isDLPError) {
        try {
          let errorData: DLPErrorResponse | null = null;

          // Try to parse the error message
          if (errorMessage.includes("Status 400: ")) {
            const jsonPart = errorMessage.split("Status 400: ")[1];
            errorData = JSON.parse(jsonPart);
          } else {
            const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              errorData = JSON.parse(jsonMatch[0]);
            }
          }

          // Fallback: create synthetic error data
          if (!errorData) {
            errorData = {
              violations: [
                {
                  type: "PII Detection",
                  message: "Personal identifiable information detected",
                  severity: "high" as const,
                },
              ],
              message:
                "Your message contains sensitive information and cannot be processed.",
            };
          }

          if (errorData && errorData.violations) {
            console.log("Emitting DLP error event:", errorData);

            // Emit a custom DLP error event
            const dlpEvent = new CustomEvent("dlp-error", {
              detail: {
                violations: errorData.violations || [],
                message: errorData.message,
              },
            });
            window.dispatchEvent(dlpEvent);

            // Don't log this as a regular error
            return;
          }
        } catch (parseError) {
          console.error("Failed to parse DLP error:", parseError);
        }
      }

      // For non-DLP errors, log them normally
      console.error("Chat runtime error:", error);
    },
    onStart: () => {
      // Clear DLP errors when user starts a new message
      console.log("Message started, dispatching message-submitted event");
      const event = new CustomEvent("message-submitted");
      window.dispatchEvent(event);
    },
  });

  return (
    <AssistantRuntimeProvider runtime={runtime}>
      <div className="flex h-screen bg-[#171717] p-4 gap-4">
        {/* Left Sidebar - Thread List */}
        <div className="w-[280px] flex-shrink-0">
          <ThreadList />
        </div>

        {/* Main Chat Area */}
        <div className="flex-1 flex flex-col">
          <ChatGPT />
        </div>

        {/* Right Sidebar - Config Panel */}
        <div className="w-[280px] flex-shrink-0">
          <ConfigPanel />
        </div>
      </div>
    </AssistantRuntimeProvider>
  );
}
