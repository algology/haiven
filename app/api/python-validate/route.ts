import { spawn } from "child_process";
import { NextRequest, NextResponse } from "next/server";

// This route is only for development - in production, Vercel routes to the Python serverless function
export async function POST(request: NextRequest) {
  // Only allow this in development
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json(
      { error: "This endpoint is only available in development" },
      { status: 404 }
    );
  }

  try {
    const { text, enabled_validators } = await request.json();

    if (!text) {
      return NextResponse.json({ error: "No text provided" }, { status: 400 });
    }

    console.log(`[Node.js Guardrails] Validating text: "${text}"`);
    console.log(
      `[Node.js Guardrails] Enabled validators: ${JSON.stringify(
        enabled_validators
      )}`
    );

    const result = await validateWithPythonSubprocess(text, enabled_validators);

    console.log(
      `[Node.js Guardrails] Validation result: ${JSON.stringify(result)}`
    );

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
            severity: "high",
          },
        ],
      },
      { status: 500 }
    );
  }
}

async function validateWithPythonSubprocess(
  text: string,
  enabledValidators: string[]
): Promise<any> {
  return new Promise((resolve, reject) => {
    const pythonScript = `
import sys
import json
import os

# Set up Guardrails environment
os.environ.setdefault('GUARDRAILS_ENABLE_METRICS', 'true')
os.environ.setdefault('GUARDRAILS_ENABLE_REMOTE_INFERENCING', 'true')

try:
    from guardrails.validators import PIIFilter
    
    def validate_text(text, enabled_validators):
        violations = []
        should_block = False
        
        print(f"[Python] Validating: {text}", file=sys.stderr)
        print(f"[Python] Validators: {enabled_validators}", file=sys.stderr)
        
        # PII Detection - only run if specifically enabled
        if "PII Detection" in enabled_validators:
            try:
                print("[Python] Creating PII filter...", file=sys.stderr)
                pii_filter = PIIFilter(pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER"])
                
                print("[Python] Running PII validation...", file=sys.stderr)
                result = pii_filter.validate(text, {})
                print(f"[Python] PII validation result: {result}", file=sys.stderr)
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Python] PII validation result: passed=True", file=sys.stderr)
                else:
                    print(f"[Python] PII validation result: passed=False", file=sys.stderr)
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
                    "message": "Personal identifiable information detected",
                    "severity": "high"
                })
                should_block = True
        
        # Financial & Medical Data Detection - separate from PII, focuses on financial/medical data
        if "Financial & Medical Data" in enabled_validators:
            try:
                print("[Python] Creating sensitive data filter...", file=sys.stderr)
                sensitive_filter = PIIFilter(pii_entities=["SSN", "CREDIT_CARD", "MEDICAL_LICENSE"])
                
                print("[Python] Running sensitive data validation...", file=sys.stderr)
                result = sensitive_filter.validate(text, {})
                print(f"[Python] Sensitive data validation result: {result}", file=sys.stderr)
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Python] Sensitive data validation result: passed=True", file=sys.stderr)
                else:
                    print(f"[Python] Sensitive data validation result: passed=False", file=sys.stderr)
                    violations.append({
                        "type": "Sensitive Data",
                        "message": "Sensitive financial or medical information detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Python] Sensitive data validation error: {e}", file=sys.stderr)
                violations.append({
                    "type": "Sensitive Data", 
                    "message": "Sensitive financial or medical information detected",
                    "severity": "high"
                })
                should_block = True
        
        # API Keys & Secrets Detection using Guardrails DetectSecrets validator
        if "API Keys & Secrets" in enabled_validators:
            try:
                print("[Python] Creating secrets detection filter...", file=sys.stderr)
                from guardrails.validators import DetectSecrets
                secrets_filter = DetectSecrets()
                
                print("[Python] Running secrets validation...", file=sys.stderr)
                result = secrets_filter.validate(text, {})
                print(f"[Python] Secrets validation result: {result}", file=sys.stderr)
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Python] Secrets validation result: passed=True", file=sys.stderr)
                else:
                    print(f"[Python] Secrets validation result: passed=False", file=sys.stderr)
                    violations.append({
                        "type": "Code Secrets",
                        "message": "API keys or secrets detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Python] Code secrets validation error: {e}", file=sys.stderr)
                violations.append({
                    "type": "Code Secrets",
                    "message": "API keys or secrets detected",
                    "severity": "high"
                })
                should_block = True
        
        # Toxic Language Detection
        if "Toxic Language" in enabled_validators:
            try:
                print("[Python] Creating toxic language filter...", file=sys.stderr)
                from guardrails.validators import ToxicLanguage
                toxic_filter = ToxicLanguage()
                
                print("[Python] Running toxic language validation...", file=sys.stderr)
                result = toxic_filter.validate(text, {})
                print(f"[Python] Toxic language validation result: {result}", file=sys.stderr)
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Python] Toxic language validation result: passed=True", file=sys.stderr)
                else:
                    print(f"[Python] Toxic language validation result: passed=False", file=sys.stderr)
                    violations.append({
                        "type": "Toxic Language",
                        "message": "Harmful or abusive language detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Python] Toxic language validation error: {e}", file=sys.stderr)
                violations.append({
                    "type": "Toxic Language",
                    "message": "Harmful or abusive language detected",
                    "severity": "high"
                })
                should_block = True
        
        # Profanity Filter
        if "Profanity Filter" in enabled_validators:
            try:
                print("[Python] Creating profanity filter...", file=sys.stderr)
                from guardrails.validators import IsProfanityFree
                profanity_filter = IsProfanityFree()
                
                print("[Python] Running profanity validation...", file=sys.stderr)
                result = profanity_filter.validate(text, {})
                print(f"[Python] Profanity validation result: {result}", file=sys.stderr)
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Python] Profanity validation result: passed=True", file=sys.stderr)
                else:
                    print(f"[Python] Profanity validation result: passed=False", file=sys.stderr)
                    violations.append({
                        "type": "Profanity Filter",
                        "message": "Profane or offensive language detected",
                        "severity": "medium"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Python] Profanity validation error: {e}", file=sys.stderr)
                violations.append({
                    "type": "Profanity Filter",
                    "message": "Profane or offensive language detected",
                    "severity": "medium"
                })
                should_block = True
        
        # Competitor Mentions Detection
        if "Competitor Mentions" in enabled_validators:
            try:
                print("[Python] Creating competitor check filter...", file=sys.stderr)
                from guardrails.validators import CompetitorCheck
                # Note: CompetitorCheck typically requires configuration with competitor names
                # For demo purposes, we'll use a basic configuration
                competitor_filter = CompetitorCheck(competitors=["OpenAI", "Anthropic", "Google", "Microsoft", "Amazon"])
                
                print("[Python] Running competitor check validation...", file=sys.stderr)
                result = competitor_filter.validate(text, {})
                print(f"[Python] Competitor check validation result: {result}", file=sys.stderr)
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Python] Competitor check validation result: passed=True", file=sys.stderr)
                else:
                    print(f"[Python] Competitor check validation result: passed=False", file=sys.stderr)
                    violations.append({
                        "type": "Competitor Mentions",
                        "message": "Competitor company or product mentioned",
                        "severity": "medium"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Python] Competitor check validation error: {e}", file=sys.stderr)
                violations.append({
                    "type": "Competitor Mentions",
                    "message": "Competitor company or product mentioned",
                    "severity": "medium"
                })
                should_block = True
        
        return {
            "passed": not should_block,
            "original_text": text,
            "sanitized_text": None,
            "violations": violations
        }
    
    # Read input from command line arguments
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Missing arguments"}))
        sys.exit(1)
    
    text = sys.argv[1]
    enabled_validators = json.loads(sys.argv[2])
    
    result = validate_text(text, enabled_validators)
    print(json.dumps(result))
    
except Exception as e:
    print(json.dumps({
        "passed": False,
        "original_text": text if 'text' in locals() else "",
        "sanitized_text": None,
        "violations": [{
            "type": "System Error",
            "message": f"Guardrails error: {str(e)}",
            "severity": "high"
        }]
    }))
    sys.exit(1)
`;

    // Use the correct Python path and set PYTHONPATH
    const pythonPath =
      "/Applications/Xcode.app/Contents/Developer/usr/bin/python3";
    const env = {
      ...process.env,
      PYTHONPATH: "/Users/alanagon/Library/Python/3.9/lib/python/site-packages",
    };

    const pythonProcess = spawn(
      pythonPath,
      ["-c", pythonScript, text, JSON.stringify(enabledValidators)],
      {
        env,
        stdio: ["pipe", "pipe", "pipe"],
      }
    );

    let stdout = "";
    let stderr = "";

    pythonProcess.stdout.on("data", (data) => {
      stdout += data.toString();
    });

    pythonProcess.stderr.on("data", (data) => {
      stderr += data.toString();
      console.log(`[Python stderr] ${data.toString().trim()}`);
    });

    pythonProcess.on("close", (code) => {
      if (code !== 0) {
        console.error(
          `[Node.js Guardrails] Python process exited with code ${code}`
        );
        console.error(`[Node.js Guardrails] stderr: ${stderr}`);
        reject(new Error(`Python validation failed with exit code ${code}`));
        return;
      }

      try {
        const result = JSON.parse(stdout.trim());
        resolve(result);
      } catch (parseError) {
        console.error(
          `[Node.js Guardrails] Failed to parse Python output: ${stdout}`
        );
        reject(new Error(`Failed to parse Python output: ${parseError}`));
      }
    });

    pythonProcess.on("error", (error) => {
      console.error(`[Node.js Guardrails] Python process error: ${error}`);
      reject(error);
    });
  });
}
