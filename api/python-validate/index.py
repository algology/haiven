from http.server import BaseHTTPRequestHandler
import json
import os

# Set up Guardrails environment
os.environ.setdefault('GUARDRAILS_ENABLE_METRICS', 'true')
os.environ.setdefault('GUARDRAILS_ENABLE_REMOTE_INFERENCING', 'true')

# Import Guardrails
try:
    from guardrails.validators import PIIFilter
    import re
    GUARDRAILS_AVAILABLE = True
    print("[Guardrails] Successfully imported Guardrails AI 0.4.2")
except ImportError as e:
    print(f"[Guardrails] Import error: {e}")
    GUARDRAILS_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_POST(self):
        content_length = int(self.headers.get("Content-Length", 0))
        if content_length == 0:
            self.send_response(400)
            self.send_header("Content-type", "application/json")
            self._set_cors_headers()
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
                self._set_cors_headers()
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
            self._set_cors_headers()
            self.end_headers()
            self.wfile.write(json.dumps(result).encode("utf-8"))

        except Exception as e:
            print(f"[Guardrails Python] Error: {e}")
            import traceback
            traceback.print_exc()
            
            self.send_response(500)
            self.send_header("Content-type", "application/json")
            self._set_cors_headers()
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
    Use actual Guardrails AI 0.4.2 to validate the text
    """
    violations = []
    should_block = False

    try:
        print(f"[Guardrails] Starting validation with validators: {enabled_validators}")
        
        # PII Detection - only run if specifically enabled
        if "PII Detection" in enabled_validators:
            try:
                print("[Guardrails] Creating PII filter...")
                pii_filter = PIIFilter(pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER"])
                
                print("[Guardrails] Running PII validation...")
                result = pii_filter.validate(text, {})
                print(f"[Guardrails] PII validation result: {result}")
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Guardrails] PII validation result: passed=True")
                else:
                    print(f"[Guardrails] PII validation result: passed=False")
                    violations.append({
                        "type": "PII Detection",
                        "message": "Personal identifiable information detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Guardrails] PII validation error: {e}")
                violations.append({
                    "type": "PII Detection",
                    "message": "Personal identifiable information detected",
                    "severity": "high"
                })
                should_block = True
        
        # Financial & Medical Data Detection - separate from PII, focuses on financial/medical data
        if "Financial & Medical Data" in enabled_validators:
            try:
                print("[Guardrails] Creating sensitive data filter...")
                sensitive_filter = PIIFilter(pii_entities=["SSN", "CREDIT_CARD", "MEDICAL_LICENSE"])
                
                print("[Guardrails] Running sensitive data validation...")
                result = sensitive_filter.validate(text, {})
                print(f"[Guardrails] Sensitive data validation result: {result}")
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Guardrails] Sensitive data validation result: passed=True")
                else:
                    print(f"[Guardrails] Sensitive data validation result: passed=False")
                    violations.append({
                        "type": "Sensitive Data",
                        "message": "Sensitive financial or medical information detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Guardrails] Sensitive data validation error: {e}")
                violations.append({
                    "type": "Sensitive Data", 
                    "message": "Sensitive financial or medical information detected",
                    "severity": "high"
                })
                should_block = True

        # API Keys & Secrets Detection using Guardrails DetectSecrets validator
        if "API Keys & Secrets" in enabled_validators:
            try:
                print("[Guardrails] Creating secrets detection filter...")
                from guardrails.validators import DetectSecrets
                secrets_filter = DetectSecrets()
                
                print("[Guardrails] Running secrets validation...")
                result = secrets_filter.validate(text, {})
                print(f"[Guardrails] Secrets validation result: {result}")
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Guardrails] Secrets validation result: passed=True")
                else:
                    print(f"[Guardrails] Secrets validation result: passed=False")
                    violations.append({
                        "type": "Code Secrets",
                        "message": "API keys or secrets detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Guardrails] Code secrets validation error: {e}")
                violations.append({
                    "type": "Code Secrets",
                    "message": "API keys or secrets detected",
                    "severity": "high"
                })
                should_block = True

        # Toxic Language Detection
        if "Toxic Language" in enabled_validators:
            try:
                print("[Guardrails] Creating toxic language filter...")
                from guardrails.validators import ToxicLanguage
                toxic_filter = ToxicLanguage()
                
                print("[Guardrails] Running toxic language validation...")
                result = toxic_filter.validate(text, {})
                print(f"[Guardrails] Toxic language validation result: {result}")
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Guardrails] Toxic language validation result: passed=True")
                else:
                    print(f"[Guardrails] Toxic language validation result: passed=False")
                    violations.append({
                        "type": "Toxic Language",
                        "message": "Harmful or abusive language detected",
                        "severity": "high"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Guardrails] Toxic language validation error: {e}")
                violations.append({
                    "type": "Toxic Language",
                    "message": "Harmful or abusive language detected",
                    "severity": "high"
                })
                should_block = True

        # Profanity Filter
        if "Profanity Filter" in enabled_validators:
            try:
                print("[Guardrails] Creating profanity filter...")
                from guardrails.validators import IsProfanityFree
                profanity_filter = IsProfanityFree()
                
                print("[Guardrails] Running profanity validation...")
                result = profanity_filter.validate(text, {})
                print(f"[Guardrails] Profanity validation result: {result}")
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Guardrails] Profanity validation result: passed=True")
                else:
                    print(f"[Guardrails] Profanity validation result: passed=False")
                    violations.append({
                        "type": "Profanity Filter",
                        "message": "Profane or offensive language detected",
                        "severity": "medium"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Guardrails] Profanity validation error: {e}")
                violations.append({
                    "type": "Profanity Filter",
                    "message": "Profane or offensive language detected",
                    "severity": "medium"
                })
                should_block = True

        # Competitor Mentions Detection
        if "Competitor Mentions" in enabled_validators:
            try:
                print("[Guardrails] Creating competitor check filter...")
                from guardrails.validators import CompetitorCheck
                # Note: CompetitorCheck typically requires configuration with competitor names
                # For demo purposes, we'll use a basic configuration
                competitor_filter = CompetitorCheck(competitors=["OpenAI", "Anthropic", "Google", "Microsoft", "Amazon"])
                
                print("[Guardrails] Running competitor check validation...")
                result = competitor_filter.validate(text, {})
                print(f"[Guardrails] Competitor check validation result: {result}")
                
                # Check if validation passed
                if hasattr(result, 'outcome') and result.outcome == 'pass':
                    print(f"[Guardrails] Competitor check validation result: passed=True")
                else:
                    print(f"[Guardrails] Competitor check validation result: passed=False")
                    violations.append({
                        "type": "Competitor Mentions",
                        "message": "Competitor company or product mentioned",
                        "severity": "medium"
                    })
                    should_block = True
                
            except Exception as e:
                print(f"[Guardrails] Competitor check validation error: {e}")
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