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

class GuardrailsService {
  private guards: Map<string, any> = new Map();
  private initialized = false;
  private Guard: any = null;
  private Validators: any = null;

  async initialize() {
    if (this.initialized) return;

    try {
      console.log("Initializing Guardrails service...");

      // Dynamic import to handle ES module
      const guardrailsCore = await import("@guardrails-ai/core");
      this.Guard = guardrailsCore.Guard;
      this.Validators = guardrailsCore.Validators;

      // Initialize PII Detection Guard
      const piiGuard = await this.Guard.fromString(
        [
          await this.Validators.PIIFilter(
            ["EMAIL_ADDRESS", "PHONE_NUMBER", "US_SSN", "CREDIT_CARD"],
            "fix"
          ),
        ],
        {
          description: "Detect and sanitize PII in text",
          prompt: "Check for personally identifiable information",
        }
      );
      this.guards.set("pii-detection", piiGuard);

      // Initialize Sensitive Data Guard
      const sensitiveGuard = await this.Guard.fromString(
        [
          await this.Validators.PIIFilter(
            [
              "US_BANK_NUMBER",
              "US_PASSPORT",
              "US_DRIVER_LICENSE",
              "MEDICAL_LICENSE",
              "CRYPTO",
            ],
            "fix"
          ),
        ],
        {
          description: "Detect sensitive financial and personal data",
          prompt: "Check for sensitive data",
        }
      );
      this.guards.set("sensitive-data", sensitiveGuard);

      // Initialize Secrets Detection Guard
      const secretsGuard = await this.Guard.fromString(
        [await this.Validators.DetectSecrets("fix")],
        {
          description: "Detect secrets and API keys in text",
          prompt: "Check for secrets and API keys",
        }
      );
      this.guards.set("code-secrets", secretsGuard);

      this.initialized = true;
      console.log("Guardrails service initialized successfully");
    } catch (error) {
      console.error("Failed to initialize Guardrails service:", error);
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

    const violations: Array<{
      type: string;
      message: string;
      severity: "low" | "medium" | "high";
    }> = [];

    let sanitizedText = text;
    let overallPassed = true;

    // Run each enabled validator
    for (const validator of enabledValidators) {
      if (!validator.enabled) continue;

      const guardKey = this.getGuardKey(validator.id);
      const guard = this.guards.get(guardKey);

      if (!guard) {
        console.warn(`Guard not found for validator: ${validator.id}`);
        continue;
      }

      try {
        const result = (await guard.parse(sanitizedText)) as any;

        if (!result.validationPassed) {
          overallPassed = false;
          violations.push({
            type: validator.name,
            message: `${validator.name} violation detected`,
            severity: this.getSeverity(validator.id),
          });
        }

        // Use the sanitized output if available
        if (
          result.validatedOutput &&
          result.validatedOutput !== sanitizedText
        ) {
          sanitizedText = result.validatedOutput;
        }
      } catch (error) {
        console.error(`Error running validator ${validator.id}:`, error);
        throw error; // Re-throw to let the API handle it
      }
    }

    return {
      passed: overallPassed,
      originalText: text,
      sanitizedText: sanitizedText !== text ? sanitizedText : undefined,
      violations,
    };
  }

  private getGuardKey(validatorId: string): string {
    switch (validatorId) {
      case "pii-detection":
        return "pii-detection";
      case "sensitive-data":
        return "sensitive-data";
      case "code-secrets":
        return "code-secrets";
      default:
        return validatorId;
    }
  }

  private getSeverity(validatorId: string): "low" | "medium" | "high" {
    switch (validatorId) {
      case "pii-detection":
        return "high";
      case "sensitive-data":
        return "high";
      case "code-secrets":
        return "medium";
      default:
        return "medium";
    }
  }

  async cleanup() {
    // Cleanup resources if needed
    this.guards.clear();
    this.initialized = false;
  }
}

// Export singleton instance
export const guardrailsService = new GuardrailsService();
