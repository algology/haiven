#!/usr/bin/env python3

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="Guardrails DLP API", version="1.0.0")

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001", "http://localhost:3002"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import Guardrails
try:
    from guardrails import Guard
    from guardrails.validators import PIIFilter, DetectSecrets
    GUARDRAILS_AVAILABLE = True
    logger.info("Guardrails AI loaded successfully")
except ImportError as e:
    GUARDRAILS_AVAILABLE = False
    logger.error(f"Failed to import Guardrails: {e}")

class ValidationRequest(BaseModel):
    text: str
    enabled_validators: List[str]

class Violation(BaseModel):
    type: str
    message: str
    severity: str

class ValidationResponse(BaseModel):
    passed: bool
    original_text: str
    sanitized_text: Optional[str] = None
    violations: List[Violation] = []
    error: Optional[str] = None

@app.get("/")
async def root():
    return {
        "message": "Guardrails DLP API",
        "version": "1.0.0",
        "guardrails_available": GUARDRAILS_AVAILABLE
    }

@app.get("/health")
async def health():
    return {
        "status": "healthy",
        "guardrails_available": GUARDRAILS_AVAILABLE
    }

@app.post("/validate", response_model=ValidationResponse)
async def validate_text(request: ValidationRequest):
    """Validate text using Guardrails AI validators"""
    
    if not GUARDRAILS_AVAILABLE:
        return ValidationResponse(
            passed=True,
            original_text=request.text,
            violations=[],
            error="Guardrails not available"
        )
    
    logger.info(f"Validating text: '{request.text}'")
    logger.info(f"Enabled validators: {request.enabled_validators}")
    
    violations = []
    should_block = False
    
    try:
        # PII Detection
        if "PII Detection" in request.enabled_validators or "Sensitive Data" in request.enabled_validators:
            try:
                logger.info("Running PII validation...")
                pii_guard = Guard()
                pii_guard.use(PIIFilter(pii_entities=["PERSON", "EMAIL_ADDRESS", "PHONE_NUMBER", "SSN", "CREDIT_CARD"]))
                
                pii_result = pii_guard.validate(request.text)
                logger.info(f"PII validation result: passed={pii_result.validation_passed}")
                
                if not pii_result.validation_passed:
                    violations.append(Violation(
                        type="PII Detection",
                        message="Personal identifiable information detected",
                        severity="high"
                    ))
                    should_block = True
                    
            except Exception as e:
                logger.error(f"PII validation error: {e}")
                violations.append(Violation(
                    type="PII Detection",
                    message=f"PII validation error: {str(e)}",
                    severity="high"
                ))
                should_block = True
        
        # Code Secrets Detection
        if "Code Secrets" in request.enabled_validators:
            try:
                logger.info("Running secrets validation...")
                secrets_guard = Guard()
                secrets_guard.use(DetectSecrets())
                
                secrets_result = secrets_guard.validate(request.text)
                logger.info(f"Secrets validation result: passed={secrets_result.validation_passed}")
                
                if not secrets_result.validation_passed:
                    violations.append(Violation(
                        type="Code Secrets",
                        message="API keys or secrets detected",
                        severity="high"
                    ))
                    should_block = True
                    
            except Exception as e:
                logger.error(f"Secrets validation error: {e}")
                violations.append(Violation(
                    type="Code Secrets",
                    message=f"Secrets validation error: {str(e)}",
                    severity="high"
                ))
                should_block = True
        
        return ValidationResponse(
            passed=not should_block,
            original_text=request.text,
            violations=violations
        )
        
    except Exception as e:
        logger.error(f"General validation error: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Validation failed: {str(e)}"
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000) 