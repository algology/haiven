export interface ValidatorConfig {
  id: string;
  name: string;
  enabled: boolean;
  type: string;
}

export interface ValidationResult {
  passed: boolean;
  originalText: string;
  sanitizedText?: string;
  violations: Array<{
    type: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
}

class SimpleGuardrailsService {
  private initialized = false;

  async initialize() {
    if (this.initialized) return;

    try {
      console.log("Initializing simple Guardrails service...");
      // Just mark as initialized for now
      this.initialized = true;
      console.log("Simple Guardrails service initialized");
    } catch (error) {
      console.error("Failed to initialize simple Guardrails service:", error);
      throw error;
    }
  }

  async validateText(
    text: string,
    enabledValidators: ValidatorConfig[]
  ): Promise<ValidationResult> {
    if (!this.initialized) {
      await this.initialize();
    }

    console.log("Validating text:", text);
    console.log(
      "Enabled validators:",
      enabledValidators.map((v) => v.name)
    );

    try {
      // Dynamic import of Guardrails AI
      const { Guard, Validators } = await import("@guardrails-ai/core");

      console.log("Guardrails AI imported successfully");

      // Test with just PII detection for now
      const piiValidator = enabledValidators.find(
        (v) => v.id === "pii-detection" && v.enabled
      );

      if (piiValidator) {
        console.log("Creating PII guard...");

        const piiGuard = await Guard.fromString(
          [
            await Validators.PIIFilter(
              ["EMAIL_ADDRESS", "PHONE_NUMBER"],
              "fix"
            ),
          ],
          {
            description: "Detect PII",
            prompt: "Check for PII",
          }
        );

        console.log("PII guard created, parsing text...");
        const result = await piiGuard.parse(text);
        console.log("Parse result:", result);

        if (!result.validationPassed) {
          return {
            passed: false,
            originalText: text,
            sanitizedText: result.validatedOutput,
            violations: [
              {
                type: "PII Detection",
                message: "PII detected in message",
                severity: "high",
              },
            ],
          };
        }

        return {
          passed: true,
          originalText: text,
          sanitizedText:
            result.validatedOutput !== text
              ? result.validatedOutput
              : undefined,
          violations: [],
        };
      }

      // If no PII validator enabled, just pass through
      return {
        passed: true,
        originalText: text,
        violations: [],
      };
    } catch (error) {
      console.error("Error in validateText:", error);
      throw error;
    }
  }
}

export const simpleGuardrailsService = new SimpleGuardrailsService();
