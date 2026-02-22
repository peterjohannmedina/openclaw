# Ollama Local Inference - Quick Reference

## Connection Details
```bash
Server: pvet630
IP: 192.168.1.242
Port: 11434
Endpoint: http://192.168.1.242:11434
```

## OpenClaw Usage

### Direct Model Reference
```bash
# Use in OpenClaw commands
--model ollama-pvet630/llama3.3:70b-instruct-q4_K_M
--model ollama-pvet630/codellama:70b
--model ollama-pvet630/mistral:7b-instruct
```

### Set as Primary
```yaml
# In config.yaml
agents:
  defaults:
    model:
      primary: "ollama-pvet630/llama3.3:70b-instruct-q4_K_M"
      fallbacks:
        - "google/gemini-2.5-flash"
```

## Available Models

| Model | Size | GPU | Use Case |
|-------|------|-----|----------|
| llama3.3:70b-instruct-q4_K_M | ~40GB | RTX 3090 (24GB) | Complex reasoning, instruction following |
| codellama:70b | ~40GB | RTX 3090 | Specialized coding tasks |
| mistral:7b-instruct | ~4GB | RTX 3060 (12GB) | Fast general-purpose |
| llama3.1:8b-instruct | ~5GB | RTX 3060 | Balanced general purpose |

## Quick Commands

### Health Check
```bash
curl http://192.168.1.242:11434/api/tags
```

### Test Generation
```bash
curl http://192.168.1.242:11434/api/generate \
  -d '{"model": "llama3.3:70b-instruct-q4_K_M", "prompt": "Hello", "stream": false}'
```

### Chat API
```bash
curl http://192.168.1.242:11434/api/chat \
  -d '{
    "model": "llama3.3:70b-instruct-q4_K_M",
    "messages": [{"role": "user", "content": "Test"}]
  }'
```

## Benefits

✅ **Zero API Costs** - No external API fees  
✅ **Full Privacy** - Data never leaves local network  
✅ **GPU Accelerated** - 24GB + 12GB VRAM available  
✅ **Network Accessible** - Available to all OpenClaw instances  
✅ **Automatic Fallback** - Cloud models available if local fails

## Documentation

- Full Setup: `docs/ollama-inference-setup.md`
- Infrastructure: See AGENTS.md → Infrastructure Architecture → Local Inference
