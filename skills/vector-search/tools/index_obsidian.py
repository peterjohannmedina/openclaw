#!/usr/bin/env python3
"""
Index Obsidian Vault into ChromaDB
Connects to second-brain MCP server and indexes markdown files
"""

import os
import sys
import json
import requests
from pathlib import Path
from typing import List, Dict, Any
import chromadb
from chromadb.config import Settings
from sentence_transformers import SentenceTransformer
from loguru import logger

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))
from vector_base import EmbeddingModel

class ObsidianIndexer:
    """Index Obsidian vault into ChromaDB"""
    
    def __init__(
        self,
        mcp_url: str = "http://192.168.1.203:3010",
        chroma_path: str = "~/.openclaw/data/chromadb",
        collection_name: str = "obsidian_vault",
        model_name: str = "all-MiniLM-L6-v2"
    ):
        self.mcp_url = mcp_url
        self.chroma_path = Path(chroma_path).expanduser()
        self.collection_name = collection_name
        
        # Initialize embedding model
        self.embedder = EmbeddingModel()
        self.embedder.load_model(model_name)
        
        # Initialize ChromaDB client
        self.chroma_path.mkdir(parents=True, exist_ok=True)
        self.client = chromadb.PersistentClient(
            path=str(self.chroma_path),
            settings=Settings(anonymized_telemetry=False)
        )
        
        # Get or create collection
        self.collection = self.client.get_or_create_collection(
            name=collection_name,
            metadata={"source": "obsidian_mcp", "indexed_by": "openclaw"}
        )
        
        logger.info(f"Initialized indexer: collection={collection_name}, model={model_name}")
    
    def fetch_vault_files(self) -> List[Dict[str, Any]]:
        """Fetch markdown files from Obsidian via MCP server"""
        # For now, use file system approach
        # TODO: Implement MCP client to fetch via second-brain API
        logger.warning("Direct MCP fetch not implemented yet - using file system")
        return []
    
    def index_markdown_file(self, filepath: Path, content: str) -> None:
        """Index a single markdown file"""
        # Split into chunks (simple paragraph splitting)
        chunks = self._chunk_text(content)
        
        if not chunks:
            logger.warning(f"No chunks extracted from {filepath}")
            return
        
        # Generate embeddings
        embeddings = self.embedder.encode(chunks)
        
        # Prepare metadata
        ids = [f"{filepath.stem}_{i}" for i in range(len(chunks))]
        metadatas = [
            {
                "source": str(filepath),
                "chunk_index": i,
                "total_chunks": len(chunks),
                "file_name": filepath.name
            }
            for i in range(len(chunks))
        ]
        
        # Add to collection
        self.collection.add(
            ids=ids,
            embeddings=embeddings,  # Already a list from encode()
            documents=chunks,
            metadatas=metadatas
        )
        
        logger.info(f"Indexed {filepath.name}: {len(chunks)} chunks")
    
    def index_directory(self, vault_path: Path) -> Dict[str, Any]:
        """Index all markdown files in a directory"""
        vault_path = Path(vault_path).expanduser()
        
        if not vault_path.exists():
            raise FileNotFoundError(f"Vault path not found: {vault_path}")
        
        # Find all markdown files
        md_files = list(vault_path.rglob("*.md"))
        
        logger.info(f"Found {len(md_files)} markdown files in {vault_path}")
        
        indexed_count = 0
        chunk_count = 0
        
        for md_file in md_files:
            try:
                content = md_file.read_text(encoding='utf-8')
                chunks_before = self.collection.count()
                self.index_markdown_file(md_file, content)
                chunks_after = self.collection.count()
                
                indexed_count += 1
                chunk_count += (chunks_after - chunks_before)
                
            except Exception as e:
                logger.error(f"Failed to index {md_file}: {e}")
        
        stats = {
            "files_indexed": indexed_count,
            "total_files": len(md_files),
            "chunks_created": chunk_count,
            "collection_size": self.collection.count()
        }
        
        logger.info(f"Indexing complete: {stats}")
        return stats
    
    def _chunk_text(self, text: str, chunk_size: int = 512) -> List[str]:
        """Split text into chunks by paragraphs"""
        # Split by double newlines (paragraphs)
        paragraphs = [p.strip() for p in text.split('\n\n') if p.strip()]
        
        chunks = []
        current_chunk = []
        current_length = 0
        
        for para in paragraphs:
            para_length = len(para.split())
            
            if current_length + para_length > chunk_size and current_chunk:
                chunks.append('\n\n'.join(current_chunk))
                current_chunk = [para]
                current_length = para_length
            else:
                current_chunk.append(para)
                current_length += para_length
        
        # Add remaining chunk
        if current_chunk:
            chunks.append('\n\n'.join(current_chunk))
        
        return chunks
    
    def search(self, query: str, limit: int = 5) -> List[Dict[str, Any]]:
        """Search indexed vault"""
        query_embedding = self.embedder.encode([query])[0]
        
        results = self.collection.query(
            query_embeddings=[query_embedding],  # Already a list
            n_results=limit,
            include=["documents", "metadatas", "distances"]
        )
        
        # Format results
        formatted = []
        for i in range(len(results['ids'][0])):
            formatted.append({
                "id": results['ids'][0][i],
                "text": results['documents'][0][i],
                "metadata": results['metadatas'][0][i],
                "score": 1.0 - results['distances'][0][i]  # Convert distance to similarity
            })
        
        return formatted


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Index Obsidian vault into ChromaDB")
    parser.add_argument("vault_path", help="Path to Obsidian vault directory")
    parser.add_argument("--collection", default="obsidian_vault", help="ChromaDB collection name")
    parser.add_argument("--model", default="all-MiniLM-L6-v2", help="Embedding model")
    parser.add_argument("--search", help="Test search query after indexing")
    parser.add_argument("--limit", type=int, default=5, help="Search result limit")
    
    args = parser.parse_args()
    
    # Index vault
    indexer = ObsidianIndexer(
        collection_name=args.collection,
        model_name=args.model
    )
    
    stats = indexer.index_directory(args.vault_path)
    
    print(json.dumps(stats, indent=2))
    
    # Test search if requested
    if args.search:
        print(f"\nSearching for: {args.search}")
        results = indexer.search(args.search, limit=args.limit)
        
        for i, result in enumerate(results, 1):
            print(f"\n{i}. {result['metadata']['file_name']} (score: {result['score']:.3f})")
            print(f"   {result['text'][:200]}...")


if __name__ == "__main__":
    main()
