import { spawn } from "child_process";
import path from "path";

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

class PythonGuardrailsService {
  private pythonPath: string;
  private scriptPath: string;

  constructor() {
    // Use the system Python where Guardrails is installed
    this.pythonPath = "/usr/bin/python3";
    this.scriptPath = path.join(
      process.cwd(),
      "scripts",
      "validate_balanced.py"
    );
  }

  async validateText(
    text: string | any,
    enabledValidators: ValidatorConfig[]
  ): Promise<ValidationResult> {
    // Extract text from message content (handle both string and array formats)
    let messageText: string;
    if (typeof text === "string") {
      messageText = text;
    } else if (Array.isArray(text)) {
      // Handle array format like [{ type: 'text', text: 'testing' }]
      messageText = text
        .filter((item) => item.type === "text")
        .map((item) => item.text)
        .join(" ");
    } else if (text && typeof text === "object" && text.text) {
      // Handle single object format like { type: 'text', text: 'testing' }
      messageText = text.text;
    } else {
      messageText = String(text);
    }

    console.log("Validating text with Python Guardrails:", messageText);
    console.log(
      "Enabled validators:",
      enabledValidators.map((v) => v.name)
    );

    // Check which validators are enabled
    const piiEnabled = enabledValidators.some(
      (v) =>
        (v.id === "pii-detection" || v.id === "sensitive-data") && v.enabled
    );
    const secretsEnabled = enabledValidators.some(
      (v) => v.id === "code-secrets" && v.enabled
    );

    // If no validators are enabled, just pass through
    if (!piiEnabled && !secretsEnabled) {
      return {
        passed: true,
        originalText: messageText,
        violations: [],
      };
    }

    try {
      const result = await this.callPythonScript(
        messageText,
        piiEnabled,
        secretsEnabled
      );
      console.log("Python validation result:", result);

      return {
        passed: result.passed,
        originalText: result.original_text,
        sanitizedText: result.sanitized_text,
        violations: result.violations || [],
      };
    } catch (error) {
      console.error("Python validation error:", error);
      throw error;
    }
  }

  private callPythonScript(
    text: string,
    checkPii: boolean,
    checkSecrets: boolean
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      // Build arguments for the script
      const args = [this.scriptPath, text];
      if (checkPii) args.push("pii");
      if (checkSecrets) args.push("secrets");

      const python = spawn(this.pythonPath, args);

      let stdout = "";
      let stderr = "";

      python.stdout.on("data", (data) => {
        stdout += data.toString();
      });

      python.stderr.on("data", (data) => {
        stderr += data.toString();
      });

      python.on("close", (code) => {
        if (code !== 0) {
          console.error("Python script stderr:", stderr);
          reject(
            new Error(`Python script failed with code ${code}: ${stderr}`)
          );
          return;
        }

        try {
          const result = JSON.parse(stdout.trim());
          if (result.error) {
            reject(new Error(result.error));
            return;
          }
          resolve(result);
        } catch (parseError) {
          reject(new Error(`Failed to parse Python output: ${stdout}`));
        }
      });

      python.on("error", (error) => {
        reject(new Error(`Failed to start Python process: ${error.message}`));
      });
    });
  }
}

export const pythonGuardrailsService = new PythonGuardrailsService();
