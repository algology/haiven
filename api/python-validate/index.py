# Version: 2.0 - Python Serverless Function (Node.js route removed)
from http.server import BaseHTTPRequestHandler
import json
import os
import re

# Set up Guardrails environment
os.environ.setdefault('GUARDRAILS_ENABLE_METRICS', 'true')
os.environ.setdefault('GUARDRAILS_ENABLE_REMOTE_INFERENCING', 'true')

# Import Guardrails
try:
    from guardrails.hub import DetectPII  # type: ignore
    import guardrails as gd  # type: ignore
    GUARDRAILS_AVAILABLE = True
    print("[Guardrails] Successfully imported Guardrails AI 0.4.2")
except ImportError as e:
    print(f"[Guardrails] Import error: {e}")
    GUARDRAILS_AVAILABLE = False

class handler(BaseHTTPRequestHandler):
    def _set_cors_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Cache-Control", "no-cache")
    
    def do_OPTIONS(self):
        self.send_response(200)
        self._set_cors_headers()
        self.end_headers()
    
    def do_GET(self):
        # Add a health check endpoint
        self.send_response(200)
        self.send_header("Content-type", "application/json")
        self._set_cors_headers()
        self.end_headers()
        health_response = {
            "status": "healthy",
            "service": "Guardrails DLP Validation",
            "guardrails_available": GUARDRAILS_AVAILABLE
        }
        self.wfile.write(json.dumps(health_response).encode("utf-8"))
    
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
                print("[Guardrails Python] Using fallback validation patterns...")
                result = validate_with_fallback_patterns(text, enabled_validators)
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

def validate_with_fallback_patterns(text, enabled_validators):
    """
    Fallback validation using regex patterns when Guardrails AI is not available
    """
    violations = []
    should_block = False
    
    print(f"[Fallback] Validating text with fallback patterns: {enabled_validators}")
    
    # PII Detection fallback patterns
    if "PII Detection" in enabled_validators:
        pii_patterns = [
            (r'\b[A-Z][a-z]{2,}\s+[A-Z][a-z]{2,}(?:\s+[A-Z][a-z]{2,})?\b', "Personal name detected"),  # More specific name pattern (3+ chars each)
            (r'\b\d{1,5}\s+[A-Za-z\s]+(?:street|st|avenue|ave|road|rd|drive|dr|lane|ln|terrace|way|place|pl|boulevard|blvd)\b', "Street address detected"),  # Address pattern
            (r'\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b', "Email address detected"),  # Email pattern
            (r'\b(?:\+?1[-.\s]?)?\(?[0-9]{3}\)?[-.\s]?[0-9]{3}[-.\s]?[0-9]{4}\b', "Phone number detected"),  # Phone pattern
        ]
        
        # Skip common greeting words that aren't names
        common_greetings = ["hello world", "good morning", "good afternoon", "good evening", "thank you"]
        text_lower = text.lower()
        
        # Don't flag common greetings as names
        is_common_greeting = any(greeting in text_lower for greeting in common_greetings)
        
        for pattern, message in pii_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                # Additional check for name pattern to avoid false positives
                if "Personal name detected" in message and is_common_greeting:
                    print(f"[Fallback] Skipping name detection for common greeting")
                    continue
                    
                print(f"[Fallback] PII pattern matched: {message}")
                violations.append({
                    "type": "PII Detection",
                    "message": "Personal identifiable information detected",
                    "severity": "high"
                })
                should_block = True
                break  # Stop at first match
    
    # Financial & Medical Data fallback patterns
    if "Financial & Medical Data" in enabled_validators:
        financial_patterns = [
            (r'\b\d{3}-\d{2}-\d{4}\b', "SSN pattern detected"),  # SSN pattern
            (r'\b\d{4}[\s-]?\d{4}[\s-]?\d{4}[\s-]?\d{4}\b', "Credit card pattern detected"),  # Credit card pattern
        ]
        
        for pattern, message in financial_patterns:
            if re.search(pattern, text):
                print(f"[Fallback] Financial pattern matched: {message}")
                violations.append({
                    "type": "Sensitive Data",
                    "message": "Sensitive financial or medical information detected",
                    "severity": "high"
                })
                should_block = True
                break
    
    # API Keys & Secrets fallback patterns
    if "API Keys & Secrets" in enabled_validators:
        secret_patterns = [
            (r'(?:api[_-]?key|secret[_-]?key|access[_-]?token)[\s:=]+[A-Za-z0-9+/]{20,}', "API key pattern detected"),  # API key pattern
            (r'[A-Za-z0-9+/]{40,}={0,2}', "Base64 encoded secret pattern detected"),  # Base64 pattern
        ]
        
        for pattern, message in secret_patterns:
            if re.search(pattern, text, re.IGNORECASE):
                print(f"[Fallback] Secret pattern matched: {message}")
                violations.append({
                    "type": "Code Secrets",
                    "message": "API keys or secrets detected",
                    "severity": "high"
                })
                should_block = True
                break
    
    print(f"[Fallback] Validation complete. Should block: {should_block}, Violations: {len(violations)}")
    
    return {
        "passed": not should_block,
        "original_text": text,
        "sanitized_text": None,
        "violations": violations
    }

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
                # Create Guard with DetectPII validator
                guard = gd.Guard().use(DetectPII, pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER"], on_fail="exception")
                
                print("[Guardrails] Running PII validation...")
                try:
                    result = guard.parse(llm_output=text)
                    print(f"[Guardrails] PII validation result: passed=True")
                    # If parse succeeds without exception, no PII was detected
                except Exception as validation_error:
                    print(f"[Guardrails] PII validation result: passed=False - {validation_error}")
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
                # Create Guard with DetectPII validator for sensitive financial/medical data
                guard = gd.Guard().use(DetectPII, pii_entities=["US_SSN", "CREDIT_DEBIT_CARD_NUMBER", "MEDICAL_LICENSE"], on_fail="exception")
                
                print("[Guardrails] Running sensitive data validation...")
                try:
                    result = guard.parse(llm_output=text)
                    print(f"[Guardrails] Sensitive data validation result: passed=True")
                    # If parse succeeds without exception, no sensitive data was detected
                except Exception as validation_error:
                    print(f"[Guardrails] Sensitive data validation result: passed=False - {validation_error}")
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
                from guardrails.validators import DetectSecrets  # type: ignore
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
            print("[Guardrails] Toxic Language validation - temporarily disabled (requires setup)")

        # Profanity Filter
        if "Profanity Filter" in enabled_validators:
            print("[Guardrails] Profanity Filter validation - temporarily disabled (requires setup)")

        # Competitor Mentions Detection
        if "Competitor Mentions" in enabled_validators:
            print("[Guardrails] Competitor Mentions validation - temporarily disabled (requires setup)")

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