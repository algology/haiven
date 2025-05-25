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
  {
    id: "pii-detection",
    name: "PII Detection",
    enabled: true,
    type: "privacy",
  },
  {
    id: "sensitive-data",
    name: "Sensitive Data",
    enabled: true,
    type: "privacy",
  },
  {
    id: "code-secrets",
    name: "Code Secrets",
    enabled: false,
    type: "security",
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
    const handleStorageChange = () => {
      const saved = localStorage.getItem("haiven-validators");
      if (saved) {
        try {
          const parsedValidators = JSON.parse(saved);
          setValidators(parsedValidators);
        } catch (error) {
          console.error("Failed to parse saved validators:", error);
        }
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  const runtime = useChatRuntime({
    api: "/api/chat",
    body: {
      validators: validators,
    },
    onError: (error: Error) => {
      // Check if this is a DLP error
      if (
        error.message &&
        error.message.includes("Message blocked by DLP policy")
      ) {
        try {
          // Try to parse the error response
          const errorData: DLPErrorResponse = JSON.parse(
            error.message.split("Status 400: ")[1]
          );

          // Emit a custom DLP error event
          const dlpEvent = new CustomEvent("dlp-error", {
            detail: {
              violations: errorData.violations || [],
              message: errorData.message,
            },
          });
          window.dispatchEvent(dlpEvent);

          // Prevent the error from propagating
          return;
        } catch (parseError) {
          console.error("Failed to parse DLP error:", parseError);
        }
      }

      // For non-DLP errors, log them normally
      console.error("Chat runtime error:", error);
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
