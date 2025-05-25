🛡️ safe.llm
safe.llm is a Python framework that aggregates responses from multiple Large Language Models (LLMs) into a single, coherent output while enforcing strict data leakage prevention and output validation using Guardrails AI.

🚀 Overview
In the era of generative AI, combining outputs from various LLMs can enhance response quality and reliability. However, this integration poses challenges, especially concerning data privacy and output consistency. safe.llm addresses these challenges by:

Aggregating responses from multiple LLMs

Validating and sanitizing outputs to prevent data leakage

Ensuring outputs adhere to predefined schemas and safety standards

🔧 Features

1. Multi-LLM Integration
   Leverage the capabilities of various LLMs (e.g., OpenAI, Anthropic, HuggingFace, Cohere) by integrating their outputs into a unified response. This approach harnesses the unique strengths of each model to produce more accurate and comprehensive answers.

2. Data Leakage Prevention
   Utilize Guardrails AI's advanced validators to detect and prevent the exposure of Personally Identifiable Information (PII) and other sensitive data in real-time, ensuring compliance with data protection regulations.

3. Output Validation and Formatting
   Ensure that all LLM outputs conform to specified formats and schemas, reducing the risk of unexpected or malformed responses. This includes enforcing JSON structures, value types, and content constraints.

4. Customizable Guardrails
   Tailor the validation process by selecting from a library of pre-built validators or creating custom ones to meet specific application requirements.

5. Asynchronous Processing
   Support for asynchronous operations allows for efficient handling of multiple LLM responses, improving performance and scalability.

🛠️ Installation
To get started, install the required packages:

bash
Copy
Edit
pip install guardrails-ai
📈 Usage
Here's a basic example of how to integrate multiple LLM outputs and apply Guardrails AI for validation:

python
Copy
Edit
import asyncio
from guardrails import Guard
from guardrails.hub import DetectPII

# Initialize Guard with desired validators

guard = Guard().use(DetectPII(pii_entities=["EMAIL_ADDRESS", "PHONE_NUMBER"], on_fail="exception"))

async def get_llm_responses(prompt): # Replace with actual asynchronous calls to your chosen LLMs
response1 = await call_openai(prompt)
response2 = await call_anthropic(prompt)
return [response1, response2]

async def main():
prompt = "Provide a summary of the latest financial news."
responses = await get_llm_responses(prompt)
combined_response = " ".join(responses)

    # Validate the combined response
    validated_response = guard.validate(combined_response)
    print(validated_response)

asyncio.run(main())
Note: Replace call_openai and call_anthropic with your actual asynchronous functions to fetch responses from the respective LLMs.

📚 Documentation
For detailed information on available validators and advanced configurations, refer to the Guardrails AI Documentation.

🤝 Contributing
Contributions are welcome! Please submit issues and pull requests via the GitHub repository.

📄 License
This project is licensed under the Apache 2.0 License, allowing for flexible use and distribution.
