import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";
import {
  pythonGuardrailsService,
  ValidatorConfig,
} from "@/lib/guardrails-python";

// Use Node.js runtime to support child_process
export const runtime = "nodejs";
export const maxDuration = 30;

// Default validators configuration
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

export async function POST(req: Request) {
  try {
    const { messages, system, tools, validators } = await req.json();

    // Use provided validators or fall back to defaults
    const activeValidators = validators || DEFAULT_VALIDATORS;
    const enabledValidators = activeValidators.filter(
      (v: ValidatorConfig) => v.enabled
    );

    // Get the latest user message for validation
    const lastMessage = messages[messages.length - 1];

    if (
      lastMessage &&
      lastMessage.role === "user" &&
      enabledValidators.length > 0
    ) {
      try {
        console.log("Validating user message before sending to OpenAI...");

        // Validate the user's message
        const validation = await pythonGuardrailsService.validateText(
          lastMessage.content,
          enabledValidators
        );

        console.log("Validation result:", validation);

        // If validation fails, return an error response
        if (!validation.passed) {
          const violationTypes = validation.violations
            .map((v) => v.message)
            .join(", ");

          return new Response(
            JSON.stringify({
              error: "Message blocked by DLP policy",
              violations: validation.violations,
              message: `Sorry, your message contains sensitive information (${violationTypes}) and cannot be processed. Please remove any personal information and try again.`,
            }),
            {
              status: 400,
              headers: { "Content-Type": "application/json" },
            }
          );
        }

        // If validation passed but text was sanitized, use the sanitized version
        if (validation.sanitizedText) {
          console.log("Using sanitized text for OpenAI");
          messages[messages.length - 1] = {
            ...lastMessage,
            content: validation.sanitizedText,
          };
        }
      } catch (error) {
        console.error("Validation error:", error);
        // Return error instead of continuing
        return new Response(
          JSON.stringify({
            error: "DLP validation failed",
            message:
              "Unable to validate message for sensitive content. Please try again.",
            details: error instanceof Error ? error.message : "Unknown error",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          }
        );
      }
    }

    console.log("Sending validated message to OpenAI...");

    const result = streamText({
      model: openai("gpt-4o"),
      messages,
      toolCallStreaming: true,
      system:
        system ||
        "You are Haiven, an AI assistant focused on data security and privacy. You help users while ensuring their sensitive information is protected.",
      tools: tools || {},
    });

    return result.toDataStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response(
      JSON.stringify({
        error: "Chat API failed",
        message: "An error occurred while processing your request.",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}
