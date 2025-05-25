#!/usr/bin/env python3
import sys
import json
import warnings
warnings.filterwarnings("ignore")

try:
    from guardrails import Guard
    from guardrails.validators import PIIFilter
    
    def validate_pii(text, pii_types=None):
        if pii_types is None:
            # Comprehensive list of PII entities
            pii_types = [
                # Personal identifiers
                "PERSON",           # Names
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
                
                # Location information
                "LOCATION",        # Addresses, places
                "IP_ADDRESS",      # IP addresses
                "URL",             # URLs that might contain personal info
                
                # Organizational information
                "ORGANIZATION",    # Company names, organizations
                
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
                
                # Other sensitive data
                "AGE",             # Age information
                "DATE_TIME",       # Dates and times that might be personal
                "ID",              # Generic ID numbers
                "NRP",             # National Registration Numbers
            ]
        
        # Create a guard with comprehensive PII filter
        guard = Guard.from_string(
            validators=[PIIFilter(pii_entities=pii_types, pii_action="fix")],
            description="Detect and sanitize comprehensive PII in text"
        )
        
        # Validate the text
        result = guard.parse(text)
        
        return {
            "passed": result.validation_passed,
            "original_text": text,
            "sanitized_text": result.validated_output if result.validated_output != text else None,
            "violations": [] if result.validation_passed else [
                {
                    "type": "PII Detection",
                    "message": "PII detected in message",
                    "severity": "high"
                }
            ]
        }
    
    if __name__ == "__main__":
        if len(sys.argv) != 2:
            print(json.dumps({"error": "Usage: python validate_pii.py '<text_to_validate>'"}))
            sys.exit(1)
        
        text = sys.argv[1]
        result = validate_pii(text)
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