import { NextRequest, NextResponse } from "next/server";
import { spawn } from "child_process";
import process from "process";

interface ValidationRequest {
  text: string;
  enabled_validators: string[];
}

interface ValidationResponse {
  passed: boolean;
  original_text: string;
  sanitized_text?: string;
  violations: Array<{
    type: string;
    message: string;
    severity: "low" | "medium" | "high";
  }>;
  error?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: ValidationRequest = await request.json();
    const { text, enabled_validators } = body;

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log(`[Node.js Guardrails] Validating text: "${text}"`);
    console.log(`[Node.js Guardrails] Enabled validators:`, enabled_validators);

    // Call Guardrails via Python subprocess
    const result = await callGuardrailsPython(text, enabled_validators);

    console.log(`[Node.js Guardrails] Validation result:`, result);

    return NextResponse.json(result);
  } catch (error) {
    console.error("[Node.js Guardrails] Error:", error);
    return NextResponse.json(
      {
        error: "Validation failed",
        passed: false,
        original_text: "",
        violations: [
          {
            type: "System Error",
            message: `Internal validation error: ${
              error instanceof Error ? error.message : "Unknown error"
            }`,
            severity: "high" as const,
          },
        ],
      },
      { status: 500 }
    );
  }
}

async function callGuardrailsPython(
  text: string,
  enabledValidators: string[]
): Promise<ValidationResponse> {
  return new Promise((resolve, reject) => {
    // Create a Python script that uses Guardrails 0.4.2 API
    const pythonScript = `
import json
import sys

# Define variables first to avoid NameError in exception handlers
text = """${text.replace(/"/g, '\\"')}"""
enabled_validators = ${JSON.stringify(enabledValidators)}

try:
    from guardrails import Guard
    from guardrails.validators import PIIFilter, DetectSecrets
    
    violations = []
    should_block = False
    
    print(f"[Python] Validating: {text}", file=sys.stderr)
    print(f"[Python] Validators: {enabled_validators}", file=sys.stderr)
    
    # PII Detection
    if "PII Detection" in enabled_validators or "Sensitive Data" in enabled_validators:
        try:
            print("[Python] Creating PII guard...", file=sys.stderr)
            pii_guard = Guard()
            pii_guard.use(PIIFilter(pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "SSN", "CREDIT_CARD"]))
            
            print("[Python] Running PII validation...", file=sys.stderr)
            pii_result = pii_guard.validate(text)
            print(f"[Python] PII validation result: passed={pii_result.validation_passed}", file=sys.stderr)
            
            if not pii_result.validation_passed:
                violations.append({
                    "type": "PII Detection",
                    "message": "Personal identifiable information detected",
                    "severity": "high"
                })
                should_block = True
            
        except Exception as e:
            print(f"[Python] PII validation error: {e}", file=sys.stderr)
            violations.append({
                "type": "PII Detection",
                "message": f"PII validation error: {str(e)}",
                "severity": "high"
            })
            should_block = True
    
    # Code Secrets Detection
    if "Code Secrets" in enabled_validators:
        try:
            print("[Python] Creating secrets guard...", file=sys.stderr)
            secrets_guard = Guard()
            secrets_guard.use(DetectSecrets())
            
            print("[Python] Running secrets validation...", file=sys.stderr)
            secrets_result = secrets_guard.validate(text)
            print(f"[Python] Secrets validation result: passed={secrets_result.validation_passed}", file=sys.stderr)
            
            if not secrets_result.validation_passed:
                violations.append({
                    "type": "Code Secrets",
                    "message": "API keys or secrets detected",
                    "severity": "high"
                })
                should_block = True
            
        except Exception as e:
            print(f"[Python] Secrets validation error: {e}", file=sys.stderr)
            violations.append({
                "type": "Code Secrets",
                "message": f"Secrets validation error: {str(e)}",
                "severity": "high"
            })
            should_block = True
    
    result = {
        "passed": not should_block,
        "original_text": text,
        "sanitized_text": None,
        "violations": violations
    }
    
    print(json.dumps(result))
    
except ImportError as e:
    print(f"[Python] Guardrails import error: {e}", file=sys.stderr)
    result = {
        "passed": True,
        "original_text": text,
        "sanitized_text": None,
        "violations": [],
        "error": "Guardrails not available"
    }
    print(json.dumps(result))
    
except Exception as e:
    print(f"[Python] General error: {e}", file=sys.stderr)
    result = {
        "passed": False,
        "original_text": text,
        "sanitized_text": None,
        "violations": [{
            "type": "System Error",
            "message": f"Python validation error: {str(e)}",
            "severity": "high"
        }]
    }
    print(json.dumps(result))
`;

    const pythonProcess = spawn("/usr/bin/python3", ["-c", pythonScript], {
      stdio: ["pipe", "pipe", "pipe"],
      env: {
        ...process.env,
        PYTHONPATH:
          "/Users/alanagon/Library/Python/3.9/lib/python/site-packages:/Applications/Xcode.app/Contents/Developer/Library/Frameworks/Python3.framework/Versions/3.9/lib/python3.9/site-packages",
      },
    });

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      console.log("[Python stderr]", data.toString());
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(`[Python] Process exited with code ${code}`);
        console.error(`[Python] stderr: ${stderr}`);
        reject(new Error(`Python process failed with code ${code}`));
        return;
      }

      try {
        // Parse the JSON output from Python
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseError) {
        console.error("[Python] Failed to parse JSON output:", stdout);
        reject(new Error(`Failed to parse Python output: ${parseError}`));
      }
    });

    pythonProcess.on("error", (error) => {
      console.error("[Python] Process error:", error);
      reject(error);
    });
  });
}
