# Ollama Local Inference Setup - pvet630

**Server:** pvet630 @ 192.168.1.242  
**Service:** Ollama v0.15.6  
**Endpoint:** http://192.168.1.242:11434

---

## Network Configuration

### Ollama Service
- **Listen Address:** 0.0.0.0:11434 (network accessible)
- **Protocol:** HTTP/REST API
- **Status:** ✅ Active and accessible

### Firewall
- Port 11434 exposed for LAN access
- Accessible from OpenClaw instances on network

---

## Available Models

### Primary Models
1. **llama3.3:70b-instruct-q4_K_M**
   - Size: ~40GB
   - Hardware: NVIDIA RTX 3090 (24GB VRAM)
   - Use case: General instruction following, complex reasoning
   - Context: 128K tokens

### Recommended Additional Models
2. **mistral:7b-instruct**
   - Hardware: Can run on RTX 3060 (12GB)
   - Use case: Fast general-purpose tasks
   
3. **codellama:70b**
   - Hardware: RTX 3090
   - Use case: Specialized coding and development

4. **llama3.1:8b-instruct**
   - Hardware: RTX 3060
   - Use case: Balanced general purpose

---

## OpenClaw Integration

### Provider Configuration

Add to `config.yaml`:

```yaml
models:
  providers:
    ollama-pvet630:
      type: ollama
      baseUrl: http://192.168.1.242:11434
      models:
        - llama3.3:70b-instruct-q4_K_M
        - mistral:7b-instruct
        - codellama:70b
        - llama3.1:8b-instruct
```

### Usage in OpenClaw

```yaml
agents:
  defaults:
    model:
      primary: "ollama-pvet630/llama3.3:70b-instruct-q4_K_M"
      fallbacks:
        - "google/gemini-2.5-flash"
```

Or specify per-session:
```bash
# Use local Ollama for coding tasks
--model ollama-pvet630/codellama:70b

# Use smaller model for quick tasks
--model ollama-pvet630/mistral:7b-instruct
```

---

## API Usage

### Direct API Call (Testing)
```bash
curl http://192.168.1.242:11434/api/generate \
  -d '{
    "model": "llama3.3:70b-instruct-q4_K_M",
    "prompt": "Test prompt",
    "stream": false
  }'
```

### Chat API
```bash
curl http://192.168.1.242:11434/api/chat \
  -d '{
    "model": "llama3.3:70b-instruct-q4_K_M",
    "messages": [
      {"role": "user", "content": "Hello!"}
    ]
  }'
```

### List Available Models
```bash
curl http://192.168.1.242:11434/api/tags
```

---

## Local VM Usage (Within pvet630)

### Pull Models
```bash
ssh rm@192.168.1.242
ollama pull llama3.3:70b-instruct-q4_K_M
ollama pull mistral:7b-instruct
ollama pull codellama:70b
```

### Run Interactive Session
```bash
ollama run llama3.3:70b-instruct-q4_K_M
```

### Run as Service
```bash
systemctl status ollama
systemctl restart ollama  # if needed
```

---

## Performance Characteristics

### llama3.3:70b-instruct-q4_K_M
- **VRAM Usage:** ~24GB (full utilization of 3090)
- **Inference Speed:** ~10-15 tokens/sec (depending on prompt)
- **Quality:** High - 70B parameter model with 4-bit quantization

### Network Latency
- **LAN Access:** <5ms typical
- **Response Time:** Depends on prompt length and generation length
- **Concurrent Requests:** Limited by GPU availability

---

## Monitoring & Maintenance

### Health Check
```bash
curl -s http://192.168.1.242:11434/api/tags | jq '.models[] | {name, size}'
```

### GPU Monitoring (on pvet630)
```bash
ssh rm@192.168.1.242 'nvidia-smi'
```

### Service Logs
```bash
ssh rm@192.168.1.242 'journalctl -u ollama -f'
```

---

## Troubleshooting

### Connection Issues
1. Verify Ollama is running: `curl http://192.168.1.242:11434/api/tags`
2. Check firewall: Ensure port 11434 is open
3. Check service status: `systemctl status ollama`

### Performance Issues
1. Monitor GPU usage: `nvidia-smi`
2. Check concurrent requests
3. Consider using smaller models for parallel workloads

### Model Loading Issues
1. Verify model is pulled: `ollama list`
2. Check disk space and VRAM availability
3. Restart service if needed: `systemctl restart ollama`

---

## Architecture Benefits

✅ **Network Accessible:** Any OpenClaw instance on LAN can use these models  
✅ **GPU Acceleration:** Full RTX 3090 24GB + RTX 3060 12GB available  
✅ **Cost Savings:** No API costs for local inference  
✅ **Privacy:** All data stays on local network  
✅ **Fallback Ready:** Can failover to cloud models if needed  

---

**Last Updated:** 2026-02-21  
**Documentation:** OpenClaw Infrastructure
