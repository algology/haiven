# Guardrails DLP API

A FastAPI service that provides data loss prevention (DLP) validation using Guardrails AI.

## Setup

1. **Install dependencies:**

   ```bash
   pip install -r requirements.txt
   ```

2. **Run the service:**

   ```bash
   python main.py
   ```

   Or with uvicorn directly:

   ```bash
   uvicorn main:app --host 0.0.0.0 --port 8000 --reload
   ```

3. **Test the service:**
   ```bash
   curl http://localhost:8000/health
   ```

## API Endpoints

### `GET /`

Returns basic API information.

### `GET /health`

Health check endpoint.

### `POST /validate`

Validates text using Guardrails AI validators.

**Request:**

```json
{
  "text": "My name is John Smith",
  "enabled_validators": ["PII Detection"]
}
```

**Response:**

```json
{
  "passed": false,
  "original_text": "My name is John Smith",
  "sanitized_text": null,
  "violations": [
    {
      "type": "PII Detection",
      "message": "Personal identifiable information detected",
      "severity": "high"
    }
  ]
}
```

## Available Validators

- **PII Detection**: Detects personal identifiable information (names, emails, phone numbers, SSN, credit cards)
- **Code Secrets**: Detects API keys and secrets in code

## Development

The service runs on `http://localhost:8000` by default and includes:

- CORS support for frontend integration
- Comprehensive logging
- Error handling
- Pydantic models for request/response validation
