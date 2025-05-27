import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Use Node.js runtime for better compatibility
export const runtime = "nodejs";
export const maxDuration = 30;

// Validator configuration interface
interface ValidatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: "privacy" | "security";
}

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

// API-based validation function
async function validateTextViaAPI(
  text: string,
  enabledValidators: ValidatorConfig[]
) {
  const validatorNames = enabledValidators.map((v) => v.name);

  console.log("Validating text with API:", text);
  console.log("Enabled validators:", validatorNames);

  try {
    // In production, use the current domain; in development, use localhost
    const baseUrl = process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";

    const response = await fetch(`${baseUrl}/api/python-validate`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        text,
        enabled_validators: validatorNames,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Validation API error response:", errorText);

      // If we're in development and the Python API is not available, use fallback
      if (!process.env.VERCEL_URL && response.status === 404) {
        console.log(
          "Python API not available in development, using fallback validation"
        );
        return validateTextFallback(text, enabledValidators);
      }

      throw new Error(
        `Validation API failed with status ${response.status}: ${errorText}`
      );
    }

    const result = await response.json();
    console.log("Validation API result:", result);

    return {
      passed: result.passed,
      originalText: result.original_text,
      sanitizedText: result.sanitized_text,
      violations: result.violations || [],
    };
  } catch (error) {
    console.error("Validation API call error:", error);

    // If we're in development and can't reach the Python API, use fallback
    if (!process.env.VERCEL_URL) {
      console.log("Using fallback validation for development");
      return validateTextFallback(text, enabledValidators);
    }

    throw error;
  }
}

// Fallback validation for development
function validateTextFallback(
  text: string,
  enabledValidators: ValidatorConfig[]
) {
  const violations: any[] = [];

  // Simple regex-based PII detection for development
  if (
    enabledValidators.some(
      (v) => v.name === "PII Detection" || v.name === "Sensitive Data"
    )
  ) {
    const piiPatterns = [
      /\b[A-Za-z]+ [A-Za-z]+\b/, // Names like "John Smith"
      /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/, // Email addresses
      /\b\d{3}-\d{2}-\d{4}\b/, // SSN format
      /\b\d{4}[- ]?\d{4}[- ]?\d{4}[- ]?\d{4}\b/, // Credit card format
    ];

    for (const pattern of piiPatterns) {
      if (pattern.test(text)) {
        violations.push({
          type: "PII Detection",
          message: "Personal identifiable information detected",
          severity: "high",
        });
        break;
      }
    }
  }

  // Simple API key detection for development
  if (enabledValidators.some((v) => v.name === "Code Secrets")) {
    const secretPatterns = [
      /sk-[a-zA-Z0-9]{32,}/, // OpenAI API keys
      /AIza[0-9A-Za-z\\-_]{35}/, // Google API keys
      /AKIA[0-9A-Z]{16}/, // AWS Access Key
    ];

    for (const pattern of secretPatterns) {
      if (pattern.test(text)) {
        violations.push({
          type: "Code Secrets",
          message: "API keys or secrets detected",
          severity: "high",
        });
        break;
      }
    }
  }

  return {
    passed: violations.length === 0,
    originalText: text,
    sanitizedText: null,
    violations: violations,
  };
}

// Helper function to extract text from message content
function extractTextFromContent(content: any): string {
  if (typeof content === "string") {
    return content;
  }

  if (Array.isArray(content)) {
    // Extract text from array of content objects
    return content
      .filter((item) => item.type === "text")
      .map((item) => item.text)
      .join(" ");
  }

  // If it's an object with text property
  if (content && typeof content === "object" && content.text) {
    return content.text;
  }

  // Fallback: convert to string
  return String(content);
}

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

        // Validate the user's message via API
        const validation = await validateTextViaAPI(
          extractTextFromContent(lastMessage.content),
          enabledValidators
        );

        console.log("Validation result:", validation);

        // If validation fails, return an error response
        if (!validation.passed) {
          const violationTypes = validation.violations
            .map((v: any) => v.message)
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

          // Reconstruct the content in the same format it was received
          if (typeof lastMessage.content === "string") {
            messages[messages.length - 1] = {
              ...lastMessage,
              content: validation.sanitizedText,
            };
          } else if (Array.isArray(lastMessage.content)) {
            // Update the text content in the array
            const updatedContent = lastMessage.content.map((item: any) =>
              item.type === "text"
                ? { ...item, text: validation.sanitizedText }
                : item
            );
            messages[messages.length - 1] = {
              ...lastMessage,
              content: updatedContent,
            };
          } else {
            // Fallback: replace with sanitized text as string
            messages[messages.length - 1] = {
              ...lastMessage,
              content: validation.sanitizedText,
            };
          }
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
