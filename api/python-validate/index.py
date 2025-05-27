from http.server import BaseHTTPRequestHandler
import json
import os

# Set up Guardrails environment
os.environ.setdefault('GUARDRAILS_ENABLE_METRICS', 'true')
os.environ.setdefault('GUARDRAILS_ENABLE_REMOTE_INFERENCING', 'true')

# Import Guardrails
try:
    from guardrails import Guard, OnFailAction
    from guardrails.hub import DetectPII, DetectSecrets
    GUARDRAILS_AVAILABLE = True
    print("[Guardrails] Successfully imported Guardrails AI")
except ImportError as e:
    print(f"[Guardrails] Import error: {e}")
    GUARDRAILS_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_response(400)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps({"error": "No data received"}).encode("utf-8"))
            return

        post_data = self.rfile.read(content_length)
        
        try:
            data = json.loads(post_data.decode("utf-8"))
            text = data.get("text", "")
            enabled_validators = data.get("enabled_validators", [])
            
            if not text:
                self.send_response(400)
                self.send_header("Content-type", "application/json")
                self.end_headers()
                self.wfile.write(json.dumps({"error": "No text provided"}).encode("utf-8"))
                return

            print(f"[Guardrails Python] Validating text: '{text}'")
            print(f"[Guardrails Python] Enabled validators: {enabled_validators}")
            print(f"[Guardrails Python] Guardrails available: {GUARDRAILS_AVAILABLE}")

            if not GUARDRAILS_AVAILABLE:
                # Fallback response if Guardrails is not available
                result = {
                    "passed": True,
                    "original_text": text,
                    "sanitized_text": None,
                    "violations": [],
                    "error": "Guardrails not available - using fallback"
                }
            else:
                result = validate_with_guardrails(text, enabled_validators)

            print(f"[Guardrails Python] Validation result: {result}")

            self.send_response(200)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            print(f"[Guardrails Python] Error: {e}")
            import traceback
            traceback.print_exc()
            
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self.end_headers()
            error_response = {
                "error": "Validation failed",
                "passed": False,
                "original_text": "",
                "violations": [{
                    "type": "System Error",
                    "message": f"Internal validation error: {str(e)}",
                    "severity": "high"
                }]
            }
            self.wfile.write(json.dumps(error_response).encode("utf-8"))

def validate_with_guardrails(text, enabled_validators):
    """
    Use actual Guardrails AI to validate the text
    """
    violations = []
    sanitized_text = text
    should_block = False

    try:
        print(f"[Guardrails] Starting validation with validators: {enabled_validators}")
        
        # PII Detection using Guardrails Hub
        if "PII Detection" in enabled_validators or "Sensitive Data" in enabled_validators:
            try:
                print("[Guardrails] Creating PII detection guard...")
                # Create a guard with PII detection
                pii_guard = Guard().use(
                    DetectPII,
                    pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "SSN", "CREDIT_CARD"],
                    on_fail=OnFailAction.EXCEPTION
                )
                
                print("[Guardrails] Running PII validation...")
                # Validate the text
                pii_result = pii_guard.validate(text)
                
                # If we get here, validation passed
                print(f"[Guardrails] PII validation passed")
                
            except Exception as pii_error:
                print(f"[Guardrails] PII validation failed: {pii_error}")
                violations.append({
                    "type": "PII Detection",
                    "message": "Personal identifiable information detected",
                    "severity": "high"
                })
                should_block = True

        # Code Secrets Detection using Guardrails Hub
        if "Code Secrets" in enabled_validators:
            try:
                print("[Guardrails] Creating secrets detection guard...")
                # Create a guard with secrets detection
                secrets_guard = Guard().use(
                    DetectSecrets,
                    on_fail=OnFailAction.EXCEPTION
                )
                
                print("[Guardrails] Running secrets validation...")
                # Validate the text
                secrets_result = secrets_guard.validate(text)
                
                # If we get here, validation passed
                print(f"[Guardrails] Secrets validation passed")
                
            except Exception as secrets_error:
                print(f"[Guardrails] Secrets validation failed: {secrets_error}")
                violations.append({
                    "type": "Code Secrets",
                    "message": "API keys or secrets detected",
                    "severity": "high"
                })
                should_block = True

        return {
            "passed": not should_block,
            "original_text": text,
            "sanitized_text": sanitized_text if sanitized_text != text else None,
            "violations": violations
        }

    except Exception as e:
        print(f"[Guardrails] General validation error: {e}")
        import traceback
        traceback.print_exc()
        
        return {
            "passed": False,
            "original_text": text,
            "sanitized_text": None,
            "violations": [{
                "type": "System Error",
                "message": f"Guardrails validation error: {str(e)}",
                "severity": "high"
            }]
        } 