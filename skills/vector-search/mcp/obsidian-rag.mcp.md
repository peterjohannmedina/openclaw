# Obsidian RAG MCP Skill

**Name:** obsidian-rag  
**Purpose:** Retrieval-Augmented Generation over Obsidian vault  
**Type:** Python tool

## Tools

### rag_query
Query Obsidian vault using semantic search + context generation

**Input Schema:**
```json
{
  "query": "string (required) - Question or search query",
  "limit": "integer (optional, default 5) - Max documents to retrieve",
  "format": "string (optional, default 'text') - Output format: json|text|prompt"
}
```

**Output:**
```json
{
  "question": "original query",
  "results": [
    {
      "id": "file_chunk_id",
      "text": "chunk content",
      "metadata": {"file_name": "note.md", "chunk_index": 0},
      "score": 0.85
    }
  ],
  "context": "formatted context for LLM",
  "prompt": "full prompt with context",
  "metadata": {"num_results": 5, "collection": "obsidian_vault"}
}
```

**Command:**
```bash
python3 ~/.openclaw/workspace/skills/vector-search/tools/rag_pipeline.py "$query" --limit $limit --format $format
```

### index_vault
Index Obsidian vault into ChromaDB

**Input Schema:**
```json
{
  "vault_path": "string (required) - Path to Obsidian vault",
  "collection": "string (optional, default 'obsidian_vault') - Collection name",
  "model": "string (optional, default 'all-MiniLM-L6-v2') - Embedding model"
}
```

**Output:**
```json
{
  "files_indexed": 150,
  "total_files": 150,
  "chunks_created": 2340,
  "collection_size": 2340
}
```

**Command:**
```bash
python3 ~/.openclaw/workspace/skills/vector-search/tools/index_obsidian.py "$vault_path" --collection "$collection" --model "$model"
```

## Configuration

**ChromaDB Storage:** `~/.openclaw/data/chromadb`  
**Default Collection:** `obsidian_vault`  
**Embedding Model:** `all-MiniLM-L6-v2` (384 dimensions, fast)

## Usage Examples

### Index vault
```bash
python3 ~/.openclaw/workspace/skills/vector-search/tools/index_obsidian.py \
  ~/Documents/ObsidianVault \
  --collection my_notes
```

### Query vault (RAG)
```bash
python3 ~/.openclaw/workspace/skills/vector-search/tools/rag_pipeline.py \
  "What are my notes about machine learning?" \
  --limit 5 \
  --format prompt
```

### From Python
```python
from skills.vector_search.tools.rag_pipeline import RAGPipeline

rag = RAGPipeline(collection_name="obsidian_vault")

# Get formatted context + prompt
result = rag.query("How do I deploy with Ansible?")
print(result['prompt'])

# Or with LLM integration
answer = rag.answer("What's in my AI research notes?", llm_client=my_llm)
print(answer)
```

## Integration with OpenClaw

This skill can be used in agent workflows:

1. **Auto-index on vault changes:** Use file watcher to trigger re-indexing
2. **RAG in conversations:** Query vault when user asks questions
3. **Context injection:** Automatically retrieve relevant notes for context

## Prerequisites

- ChromaDB installed (`pip install chromadb`)
- sentence-transformers installed (`pip install sentence-transformers`)
- Obsidian vault accessible on local filesystem

## Notes

- First indexing takes time (proportional to vault size)
- Embeddings cached in ChromaDB for fast retrieval
- Re-indexing overwrites existing chunks (idempotent by file+chunk_index)
- GPU acceleration available if torch + Intel Arc configured
