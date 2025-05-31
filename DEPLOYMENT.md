# Production Deployment Guide

## Overview

This application uses a hybrid architecture with Next.js for the frontend and Python serverless functions for data validation using Guardrails AI.

## Architecture

```
Frontend (Next.js) → Chat API → Python Validation → OpenAI GPT-4
```

### Components:

1. **Next.js Frontend** (`app/page.tsx`, `app/chat/`)
2. **Chat API** (`app/api/chat/route.ts`) - Orchestrates validation and LLM calls
3. **Python Validation Service** (`api/python-validate/index.py`) - Guardrails AI validation
4. **OpenAI Integration** - Processes validated messages

## Deployment Steps

### 1. Environment Variables

Set these environment variables in your Vercel dashboard:

```bash
# Required
OPENAI_API_KEY=your_openai_api_key_here

# Optional (automatically set by Vercel)
VERCEL_URL=your-app.vercel.app
NODE_ENV=production

# Guardrails Configuration
GUARDRAILS_ENABLE_METRICS=true
GUARDRAILS_ENABLE_REMOTE_INFERENCING=true
```

### 2. Vercel Configuration

The `vercel.json` file is configured to:

- Deploy Python function as serverless function
- Handle CORS headers
- Route `/api/python-validate` to the Python function

### 3. Python Dependencies

The Python function uses these dependencies (see `api/python-validate/requirements.txt`):

- `guardrails-ai==0.4.2`
- `pydantic>=2.0.0`
- `requests>=2.28.0`

### 4. Validation Flow

1. User sends message to `/api/chat`
2. Chat API extracts text content
3. Calls `/api/python-validate` with enabled validators
4. Python function runs Guardrails AI validation
5. Returns validation result (pass/fail + violations)
6. Chat API either blocks message or sends to OpenAI

## Validators Available

- **PII Detection**: Names, emails, phone numbers
- **Sensitive Data**: SSNs, credit cards, medical info
- **Code Secrets**: API keys, tokens, passwords
- **Toxic Language**: Harmful or abusive content
- **Profanity Filter**: Offensive language
- **Competitor Mentions**: Competitor company names

## Troubleshooting

### 401 Authentication Error

If you see a 401 error, it's likely due to:

1. **Vercel Deployment Protection**: Check your Vercel project settings
2. **Missing Environment Variables**: Ensure OPENAI_API_KEY is set
3. **CORS Issues**: The Python function includes proper CORS headers

### Python Function Not Working

1. Check Vercel function logs in the dashboard
2. Verify `guardrails-ai` is installing correctly
3. Test the health endpoint: `GET /api/python-validate`

### Development vs Production

- **Development**: Uses Node.js subprocess to run Python validation
- **Production**: Uses Vercel serverless Python function

## Testing

### Health Check

```bash
curl https://your-app.vercel.app/api/python-validate
```

### Validation Test

```bash
curl -X POST https://your-app.vercel.app/api/python-validate \
  -H "Content-Type: application/json" \
  -d '{"text": "My email is john@example.com", "enabled_validators": ["PII Detection"]}'
```

## Security Considerations

1. **Data Privacy**: All validation happens server-side
2. **No Data Storage**: Text is validated and discarded
3. **Sanitization**: Sensitive data can be automatically removed
4. **Configurable Validators**: Enable only needed validation rules

## Performance

- **Cold Start**: ~2-3 seconds for Python function initialization
- **Warm Requests**: ~200-500ms for validation
- **Concurrent Requests**: Vercel handles scaling automatically

## Monitoring

Monitor your deployment through:

1. Vercel Dashboard - Function logs and metrics
2. OpenAI Usage Dashboard - API usage tracking
3. Application logs - Validation results and errors
