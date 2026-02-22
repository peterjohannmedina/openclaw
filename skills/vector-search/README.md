# Vector Search MCP Skill

Integration of vector databases (Milvus, Qdrant, ChromaDB) with OpenClaw for semantic search and RAG operations.

## Installation Status

✅ **Python Dependencies Installed:**
- pymilvus 2.6.9
- qdrant-client 1.17.0  
- chromadb 1.5.1
- sentence-transformers 5.2.3
- PyTorch 2.10.0 (CPU mode)

## RAG Integration (Obsidian + Vector Search)

### Index Obsidian Vault
```bash
python3 tools/index_obsidian.py ~/path/to/vault --collection my_notes
```

### Query with RAG Pipeline
```bash
# Get formatted prompt with context
python3 tools/rag_pipeline.py "question about your notes" --limit 5 --format prompt

# Get JSON output
python3 tools/rag_pipeline.py "query" --format json
```

### Python Integration
```python
from tools.rag_pipeline import RAGPipeline

rag = RAGPipeline(collection_name="obsidian_vault")
result = rag.query("your question", limit=5)

# Access components
print(result['context'])   # Formatted context
print(result['prompt'])    # Full LLM prompt
print(result['results'])   # Raw search results
```

## Quick Start

### 1. Test ChromaDB (Embedded, No Server Required)

```bash
# Add some test documents
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_chromadb.py \
  --collection test \
  --add-documents \
    "OpenClaw is an AI agent workspace" \
    "Vector search enables semantic similarity" \
    "MCP servers provide tool integration"

# Search the collection
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_chromadb.py \
  --collection test \
  --query "What is OpenClaw?" \
  --top-k 3
```

### 2. Test Milvus (Requires Server @ 192.168.1.203:19530)

```bash
# List collections
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_milvus.py \
  --host 192.168.1.203 \
  --list-collections

# Search a collection
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_milvus.py \
  --host 192.168.1.203 \
  --collection docs \
  --query "How do I configure MCP servers?" \
  --top-k 5
```

### 3. Test Qdrant (Requires Server @ 192.168.1.203:6333)

```bash
# List collections
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_qdrant.py \
  --host 192.168.1.203 \
  --list-collections

# Search a collection
python3 ~/.openclaw/workspace/skills/vector-search/tools/search_qdrant.py \
  --host 192.168.1.203 \
  --collection knowledge_base \
  --query "vector database setup" \
  --top-k 5
```

## Architecture

```
~/.openclaw/workspace/skills/vector-search/
├── SKILL.md              # Skill definition
├── README.md             # This file
├── config.json           # Configuration
└── tools/
    ├── vector_base.py    # Shared utilities & embeddings
    ├── search_milvus.py  # Milvus search tool
    ├── search_qdrant.py  # Qdrant search tool
    └── search_chromadb.py # ChromaDB search tool
```

## Configuration

Edit `config.json` to customize:

```json
{
  "milvus": {
    "host": "192.168.1.203",
    "port": 19530
  },
  "qdrant": {
    "host": "192.168.1.203",
    "port": 6333
  },
  "chromadb": {
    "path": "~/.openclaw/chromadb"
  },
  "embeddings": {
    "model": "all-MiniLM-L6-v2",
    "device": "cpu"
  }
}
```

## Embedding Models

The skill uses sentence-transformers for local embeddings (no API calls):

| Model | Size | Speed | Use Case |
|-------|------|-------|----------|
| all-MiniLM-L6-v2 | 80MB | Fast | General purpose (default) |
| all-mpnet-base-v2 | 420MB | Medium | Higher quality |
| multi-qa-mpnet-base-dot-v1 | 420MB | Medium | Q&A optimized |

First use downloads the model (~80MB). Change in `config.json`.

## Integration with Obsidian MCP

The vector search tools can integrate with your existing Obsidian MCP server @ 192.168.1.203:3010/sse for semantic document search.

**Next Steps:**
1. Index Obsidian vault into ChromaDB/Qdrant
2. Build RAG pipeline using vault as knowledge base
3. Add semantic search to Obsidian MCP skill

## Observability

### Prometheus Metrics

Exposed metrics:
- `vector_search_queries_total{backend, collection}`
- `vector_search_latency_seconds{backend}`
- `embedding_generation_total{model}`

### Logs

Structured logs written to `/tmp/vector_search.log`:
- JSON format for easy parsing
- Session ID tracking
- 10 MB rotation, 30-day retention

## Troubleshooting

### ChromaDB

```bash
# Test ChromaDB directly
python3 -c "import chromadb; print(chromadb.PersistentClient(path='~/.openclaw/chromadb').heartbeat())"
```

### Milvus

```bash
# Test Milvus connection
python3 -c "from pymilvus import connections; connections.connect('default', host='192.168.1.203', port='19530'); print('Connected!')"
```

### Qdrant

```bash
# Test Qdrant connection
python3 -c "from qdrant_client import QdrantClient; client = QdrantClient(host='192.168.1.203', port=6333); print(client.get_collections())"
```

### Embedding Model

Model downloads from Hugging Face on first use. Check cache:

```bash
ls -lh ~/.cache/huggingface/hub/
```

## Examples

### RAG Pipeline

```python
from search_chromadb import ChromaDBSearch

# Initialize
search = ChromaDBSearch()

# Index documents
search.add_documents(
    collection_name="knowledge_base",
    documents=["Document 1", "Document 2", ...],
    metadatas=[{"source": "file1.md"}, {"source": "file2.md"}, ...]
)

# Retrieve context for RAG
results = search.search(
    collection_name="knowledge_base",
    query="How does OpenClaw work?",
    top_k=3
)

# Pass results to LLM as context
context = "\n\n".join([r.text for r in results])
```

## Status

✅ **ChromaDB:** Ready to use (embedded, no server)  
⏳ **Milvus:** Requires server deployment @ 192.168.1.203  
⏳ **Qdrant:** Requires server deployment @ 192.168.1.203  
✅ **Embeddings:** Working (sentence-transformers on CPU)  
✅ **Observability:** Prometheus + OpenTelemetry integrated

## Next Steps

1. Deploy Milvus/Qdrant servers (Ansible playbook available)
2. Index Obsidian vault for semantic search
3. Build MCP skill for RAG queries
4. Integrate with existing second-brain MCP server
