#!/usr/bin/env python3

import sys
import json
import os

# Set up Guardrails environment
os.environ.setdefault('GUARDRAILS_ENABLE_METRICS', 'true')
os.environ.setdefault('GUARDRAILS_ENABLE_REMOTE_INFERENCING', 'true')

try:
    from guardrails.validators import PIIFilter
    
    def test_pii_detection(text):
        print(f"Testing PII detection on: {text}", file=sys.stderr)
        
        try:
            # Create PII filter directly with required entities
            pii_filter = PIIFilter(pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER"])
            
            # Validate the text directly
            result = pii_filter.validate(text, {})
            print(f"PII validation result: {result}", file=sys.stderr)
            
            # Check if validation passed
            if hasattr(result, 'outcome') and result.outcome == 'pass':
                return True
            else:
                return False
            
        except Exception as e:
            print(f"PII validation failed: {e}", file=sys.stderr)
            return False
    
    # Test with command line argument
    if len(sys.argv) > 1:
        text = sys.argv[1]
    else:
        text = "My name is John Smith"
    
    passed = test_pii_detection(text)
    
    result = {
        "passed": passed,
        "original_text": text,
        "sanitized_text": None,
        "violations": [] if passed else [{
            "type": "PII Detection",
            "message": "Personal identifiable information detected",
            "severity": "high"
        }]
    }
    
    print(json.dumps(result))
    
except Exception as e:
    print(f"Error: {e}", file=sys.stderr)
    error_result = {
        "passed": False,
        "original_text": "",
        "sanitized_text": None,
        "violations": [{
            "type": "System Error",
            "message": f"Guardrails error: {str(e)}",
            "severity": "high"
        }]
    }
    print(json.dumps(error_result))
    sys.exit(1) 