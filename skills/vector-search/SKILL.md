---
name: vector-search
description: Query vector databases (Milvus, Qdrant, ChromaDB) for semantic search and RAG operations. Integrates with sentence-transformers for local embeddings.
homepage: https://github.com/openclaw/openclaw
metadata:
  openclaw:
    emoji: "🔍"
    requires:
      packages: ["pymilvus>=2.6.0", "qdrant-client>=1.17.0", "chromadb>=1.5.0", "sentence-transformers>=5.0.0"]
    tags: ["vector-search", "rag", "embeddings", "semantic-search"]
---

# vector-search

Query vector databases and perform semantic search using local or cloud embeddings.

## Quick Start

### Basic Vector Search

```bash
# Search Milvus collection
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_milvus.py \
  --host 192.168.1.203 \
  --collection documents \
  --query "How do I configure OpenClaw?"

# Search Qdrant collection
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_qdrant.py \
  --host 192.168.1.203 \
  --collection knowledge_base \
  --query "vector database setup"

# Local ChromaDB search
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_chromadb.py \
  --db-path ~/.openclaw/chromadb \
  --collection docs \
  --query "MCP server configuration"
```

### Generate Embeddings

```bash
# Generate embeddings using sentence-transformers
python3 ~/.openclaw/workspace/skills/vector-search/tools/embed.py \
  --text "Sample text to embed" \
  --model all-MiniLM-L6-v2

# Batch embed documents
python3 ~/.openclaw/workspace/skills/vector-search/tools/embed.py \
  --file documents.txt \
  --model all-mpnet-base-v2 \
  --output embeddings.npy
```

## Features

- **Multi-backend support**: Milvus, Qdrant, ChromaDB
- **Local embeddings**: sentence-transformers (no API calls)
- **Connection pooling**: Reusable connections for performance
- **Observability**: Prometheus metrics + OpenTelemetry tracing
- **Error handling**: Graceful fallbacks and retry logic

## Configuration

### Connection Settings

Create `~/.openclaw/workspace/skills/vector-search/config.json`:

```json
{
  "milvus": {
    "host": "192.168.1.203",
    "port": 19530,
    "timeout": 30
  },
  "qdrant": {
    "host": "192.168.1.203",
    "port": 6333,
    "timeout": 30
  },
  "chromadb": {
    "path": "~/.openclaw/chromadb",
    "persist": true
  },
  "embeddings": {
    "model": "all-MiniLM-L6-v2",
    "device": "cpu",
    "cache_folder": "~/.cache/huggingface"
  }
}
```

### Embedding Models

Available sentence-transformer models:

| Model | Size | Speed | Quality |
|-------|------|-------|---------|
| all-MiniLM-L6-v2 | 80MB | Fast | Good |
| all-mpnet-base-v2 | 420MB | Medium | Better |
| multi-qa-mpnet-base-dot-v1 | 420MB | Medium | Best for Q&A |

## Use Cases

### 1. Semantic Document Search

Search your Obsidian vault, documentation, or knowledge base:

```python
from vector_search import search_semantic

results = search_semantic(
    query="How to deploy MCP servers?",
    collection="obsidian_vault",
    backend="qdrant",
    top_k=5
)
```

### 2. RAG Pipeline

Build retrieval-augmented generation workflows:

```python
from vector_search import rag_pipeline

context = rag_pipeline(
    query="Explain OpenClaw architecture",
    collection="docs",
    llm_model="claude-sonnet-4"
)
```

### 3. Duplicate Detection

Find similar documents:

```python
from vector_search import find_duplicates

duplicates = find_duplicates(
    collection="documents",
    threshold=0.95
)
```

## Integration with OpenClaw

### MCP Tool Registration

Tools are automatically discoverable via `mcporter`:

```bash
mcporter list vector-search
mcporter call vector-search.search query="test"
```

### Observability

Metrics exposed for Prometheus:

```
vector_search_queries_total
vector_search_latency_seconds
vector_search_cache_hits_total
embedding_generation_total
```

Distributed tracing via OpenTelemetry:

```python
# Automatic span creation for searches
with tracer.start_as_current_span("vector-search") as span:
    span.set_attribute("collection", collection_name)
    span.set_attribute("query_length", len(query))
```

## Troubleshooting

### Connection Issues

```bash
# Test Milvus connection
python3 -c "from pymilvus import connections; connections.connect('default', host='192.168.1.203', port=19530); print('OK')"

# Test Qdrant connection
python3 -c "from qdrant_client import QdrantClient; client = QdrantClient(host='192.168.1.203', port=6333); print(client.get_collections())"

# Test ChromaDB
python3 -c "import chromadb; client = chromadb.PersistentClient(path='~/.openclaw/chromadb'); print(client.list_collections())"
```

### Embedding Model Download

Models are downloaded from Hugging Face on first use:

```bash
# Pre-download models
python3 -c "from sentence_transformers import SentenceTransformer; SentenceTransformer('all-MiniLM-L6-v2')"
```

## Notes

- Vector search works without GPU (uses CPU for embeddings)
- First query downloads embedding model (~80-420 MB)
- ChromaDB persists locally, others require running servers
- Supports both sync and async operations

## References

- [Milvus Documentation](https://milvus.io/docs)
- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [ChromaDB Documentation](https://docs.trychroma.com/)
- [sentence-transformers](https://www.sbert.net/)
