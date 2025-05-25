#!/usr/bin/env python3
import sys
import json
import warnings
warnings.filterwarnings("ignore")

try:
    from guardrails import Guard
    from guardrails.validators import PIIFilter, DetectSecrets
    
    def validate_balanced(text, check_pii=True, check_secrets=True):
        violations = []
        sanitized_text = text
        overall_passed = True
        
        # PII Detection - Focus on truly sensitive information
        if check_pii:
            try:
                # More conservative PII types - focus on truly sensitive data
                pii_types = [
                    # Personal identifiers (specific patterns)
                    "EMAIL_ADDRESS",    # Email addresses
                    "EMAIL",           # Alternative email format
                    "PHONE_NUMBER",    # Phone numbers
                    "US_SSN",          # Social Security Numbers
                    "US_ITIN",         # Individual Taxpayer Identification Number
                    "US_PASSPORT",     # US Passport numbers
                    "US_DRIVER_LICENSE", # Driver's license numbers
                    
                    # Financial information
                    "CREDIT_CARD",     # Credit card numbers
                    "US_BANK_NUMBER",  # Bank account numbers
                    "IBAN_CODE",       # International bank account numbers
                    "CRYPTO",          # Cryptocurrency addresses
                    
                    # Specific location information (addresses, not general places)
                    "IP_ADDRESS",      # IP addresses
                    
                    # Medical and government IDs
                    "MEDICAL_LICENSE", # Medical license numbers
                    "UK_NHS",          # UK National Health Service numbers
                    "AU_MEDICARE",     # Australian Medicare numbers
                    "AU_ABN",          # Australian Business Numbers
                    "AU_ACN",          # Australian Company Numbers
                    "AU_TFN",          # Australian Tax File Numbers
                    "IN_AADHAAR",      # Indian Aadhaar numbers
                    "IN_PAN",          # Indian PAN numbers
                    "IN_VEHICLE_REGISTRATION", # Indian vehicle registration
                    "SG_NRIC_FIN",     # Singapore NRIC/FIN numbers
                ]
                
                pii_guard = Guard.from_string(
                    validators=[PIIFilter(pii_entities=pii_types, pii_action="fix")],
                    description="Detect sensitive PII"
                )
                
                pii_result = pii_guard.parse(sanitized_text)
                if not pii_result.validation_passed:
                    overall_passed = False
                    violations.append({
                        "type": "PII Detection",
                        "message": "Sensitive personal information detected",
                        "severity": "high"
                    })
                
                # Use sanitized text for further processing
                if pii_result.validated_output != sanitized_text:
                    sanitized_text = pii_result.validated_output
                    
            except Exception as e:
                # If PII detection fails, continue but note the error
                violations.append({
                    "type": "PII Detection Error",
                    "message": f"PII detection failed: {str(e)}",
                    "severity": "medium"
                })
        
        # Secrets Detection
        if check_secrets:
            try:
                secrets_guard = Guard.from_string(
                    validators=[DetectSecrets(redact_mode="fix")],
                    description="Detect secrets and API keys"
                )
                
                secrets_result = secrets_guard.parse(text)  # Use original text for secrets
                if not secrets_result.validation_passed:
                    overall_passed = False
                    violations.append({
                        "type": "Secrets Detection",
                        "message": "API keys or secrets detected",
                        "severity": "high"
                    })
                    
            except Exception as e:
                # If secrets detection fails, continue but note the error
                violations.append({
                    "type": "Secrets Detection Error",
                    "message": f"Secrets detection failed: {str(e)}",
                    "severity": "medium"
                })
        
        return {
            "passed": overall_passed,
            "original_text": text,
            "sanitized_text": sanitized_text if sanitized_text != text else None,
            "violations": violations
        }
    
    if __name__ == "__main__":
        if len(sys.argv) < 2:
            print(json.dumps({"error": "Usage: python validate_balanced.py '<text_to_validate>' [pii] [secrets]"}))
            sys.exit(1)
        
        text = sys.argv[1]
        check_pii = len(sys.argv) <= 2 or "pii" in sys.argv[2:]
        check_secrets = len(sys.argv) <= 2 or "secrets" in sys.argv[2:]
        
        result = validate_balanced(text, check_pii, check_secrets)
        print(json.dumps(result))
        
except ImportError as e:
    print(json.dumps({
        "error": f"Import failed: {str(e)}",
        "passed": False,
        "original_text": sys.argv[1] if len(sys.argv) > 1 else "",
        "violations": [
            {
                "type": "System Error",
                "message": f"Import error: {str(e)}",
                "severity": "high"
            }
        ]
    }))
    sys.exit(1)
except Exception as e:
    print(json.dumps({
        "error": f"Validation failed: {str(e)}",
        "passed": False,
        "original_text": sys.argv[1] if len(sys.argv) > 1 else "",
        "violations": [
            {
                "type": "System Error",
                "message": f"Validation system error: {str(e)}",
                "severity": "high"
            }
        ]
    }))
    sys.exit(1) 