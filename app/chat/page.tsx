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
      console.log("=== CHAT RUNTIME ERROR DEBUG ===");
      console.log("Error message:", error.message);
      console.log("Error type:", typeof error);
      console.log("Error object:", error);
      console.log("Error constructor:", error.constructor.name);
      console.log("Error stack:", error.stack);

      // Check if this is a DLP error - be more aggressive in detection
      const errorMessage = error.message || "";
      const isDLPError =
        errorMessage.includes("Message blocked by DLP policy") ||
        errorMessage.includes("violations") ||
        errorMessage.includes("PII Detection") ||
        errorMessage.includes("Personal identifiable information") ||
        errorMessage.includes("Status 400");

      console.log("Is DLP Error:", isDLPError);

      if (isDLPError) {
        try {
          // Try multiple parsing strategies
          let errorData: DLPErrorResponse | null = null;

          console.log("Attempting to parse DLP error...");

          // Strategy 1: Look for "Status 400: " prefix
          if (errorMessage.includes("Status 400: ")) {
            console.log("Using Strategy 1: Status 400 prefix");
            const jsonPart = errorMessage.split("Status 400: ")[1];
            console.log("JSON part:", jsonPart);
            errorData = JSON.parse(jsonPart);
          }
          // Strategy 2: Look for JSON object in the error message
          else {
            console.log("Using Strategy 2: JSON regex match");
            const jsonMatch = errorMessage.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              console.log("JSON match found:", jsonMatch[0]);
              errorData = JSON.parse(jsonMatch[0]);
            }
          }

          // Strategy 3: Try parsing the entire error message as JSON
          if (!errorData) {
            console.log("Using Strategy 3: Parse entire message");
            try {
              errorData = JSON.parse(errorMessage);
            } catch {
              console.log("Strategy 3 failed");
            }
          }

          // Strategy 4: Create a synthetic error if we detect DLP keywords but can't parse JSON
          if (!errorData && isDLPError) {
            console.log("Using Strategy 4: Synthetic error");
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
            console.log("Successfully parsed DLP error data:", errorData);

            // Emit a custom DLP error event
            const dlpEvent = new CustomEvent("dlp-error", {
              detail: {
                violations: errorData.violations || [],
                message: errorData.message,
              },
            });
            window.dispatchEvent(dlpEvent);

            // Prevent the error from propagating
            console.log("DLP error handled, preventing propagation");
            return;
          } else {
            console.log("No valid error data found");
          }
        } catch (parseError) {
          console.error("Failed to parse DLP error:", parseError);
          console.error("Original error message:", errorMessage);
        }
      }

      // For non-DLP errors, log them normally
      console.error("Chat runtime error (not handled as DLP):", error);
    },
    onFinish: () => {
      // Clear DLP errors when a message is successfully processed
      console.log(
        "Message finished processing, dispatching message-submitted event"
      );
      const event = new CustomEvent("message-submitted");
      window.dispatchEvent(event);
    },
  });

  // Global error handler for DLP errors that might escape the onError handler
  useEffect(() => {
    const handleGlobalError = (event: ErrorEvent) => {
      const error = event.error;
      const message = event.message || error?.message || "";

      console.log("=== GLOBAL ERROR HANDLER ===");
      console.log("Error message:", message);
      console.log("Error object:", error);

      // Check if this is a DLP error
      if (
        message.includes("Message blocked by DLP policy") ||
        message.includes("violations") ||
        message.includes("PII Detection") ||
        message.includes("Status 400")
      ) {
        console.log("Global handler caught DLP error");

        try {
          // Try to parse and emit DLP error
          let errorData: DLPErrorResponse | null = null;

          if (message.includes("Status 400: ")) {
            const jsonPart = message.split("Status 400: ")[1];
            errorData = JSON.parse(jsonPart);
          } else {
            const jsonMatch = message.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              errorData = JSON.parse(jsonMatch[0]);
            }
          }

          if (!errorData) {
            // Create synthetic error
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

          if (errorData) {
            const dlpEvent = new CustomEvent("dlp-error", {
              detail: {
                violations: errorData.violations || [],
                message: errorData.message,
              },
            });
            window.dispatchEvent(dlpEvent);

            // Prevent the error from showing in console
            event.preventDefault();
            console.log("Global DLP error handled and prevented");
          }
        } catch (parseError) {
          console.error(
            "Global handler failed to parse DLP error:",
            parseError
          );
        }
      }
    };

    window.addEventListener("error", handleGlobalError);
    return () => window.removeEventListener("error", handleGlobalError);
  }, []);

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
