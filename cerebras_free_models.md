# Cerebras Free/Preview Models

This document contains information about free/preview LLM models available on the Cerebras platform, along with Python code snippets for making inference calls using the OpenAI library.

---

## Qwen 3 235B Instruct

- **Model ID:** `qwen-3-235b-a22b-instruct-2507`
- **Details:** This is a preview model and should not be used in production.
- **Limitations:** May be discontinued with short notice.

### Python Code Snippet

```python
import openai

client = openai.OpenAI(
    api_key="YOUR_CEREBRAS_API_KEY",
    base_url="https://api.cerebras.ai/v1",
)

chat_completion = client.chat.completions.create(
    model="qwen-3-235b-a22b-instruct-2507",
    messages=[
        {
            "role": "user",
            "content": "Hello, who are you?",
        }
    ],
    max_tokens=128,
)

print(chat_completion.choices[0].message.content)
```

---

## Z.ai GLM 4.7

- **Model ID:** `zai-glm-4.7`
- **Details:** This is a preview model and should not be used in production.
- **Limitations:** May be discontinued with short notice.

### Python Code Snippet

```python
import openai

client = openai.OpenAI(
    api_key="YOUR_CEREBRAS_API_KEY",
    base_url="https://api.cerebras.ai/v1",
)

chat_completion = client.chat.completions.create(
    model="zai-glm-4.7",
    messages=[
        {
            "role": "user",
            "content": "Hello, who are you?",
        }
    ],
    max_tokens=128,
)

print(chat_completion.choices[0].message.content)
```
