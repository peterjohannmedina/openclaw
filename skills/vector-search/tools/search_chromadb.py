#!/usr/bin/env python3
"""
ChromaDB Vector Search Tool
Search ChromaDB collections (embedded vector store)
"""

import argparse
import time
from pathlib import Path
from typing import List, Optional
import chromadb
from chromadb.config import Settings
from vector_base import (
    EmbeddingModel, SearchResult, load_config,
    SEARCH_COUNTER, SEARCH_LATENCY, tracer, setup_logging
)

logger = setup_logging()


class ChromaDBSearch:
    """ChromaDB vector search client (embedded)"""
    
    def __init__(self, db_path: Optional[str] = None):
        if db_path is None:
            db_path = str(Path.home() / ".openclaw/chromadb")
        
        self.db_path = Path(db_path)
        self.db_path.mkdir(parents=True, exist_ok=True)
        
        self.client = chromadb.PersistentClient(
            path=str(self.db_path),
            settings=Settings(anonymized_telemetry=False)
        )
        
        self.embedder = EmbeddingModel()
        logger.info(f"ChromaDB initialized at {self.db_path}")
    
    def list_collections(self) -> List[str]:
        """List all collections"""
        collections = self.client.list_collections()
        return [c.name for c in collections]
    
    def create_collection(self, name: str, metadata: Optional[dict] = None):
        """Create new collection"""
        return self.client.create_collection(name=name, metadata=metadata)
    
    def get_collection(self, name: str):
        """Get existing collection"""
        return self.client.get_collection(name=name)
    
    def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        where: Optional[dict] = None,
        where_document: Optional[dict] = None
    ) -> List[SearchResult]:
        """Search collection by semantic similarity"""
        
        with tracer.start_as_current_span("chromadb-search") as span:
            span.set_attribute("collection", collection_name)
            span.set_attribute("query_length", len(query))
            span.set_attribute("top_k", top_k)
            
            start_time = time.time()
            
            try:
                # Get collection
                collection = self.client.get_collection(name=collection_name)
                
                # Generate query embedding
                query_embedding = self.embedder.encode([query])[0]
                
                # Execute search
                results = collection.query(
                    query_embeddings=[query_embedding],
                    n_results=top_k,
                    where=where,
                    where_document=where_document,
                    include=["metadatas", "documents", "distances"]
                )
                
                # Convert to SearchResult objects
                search_results = []
                if results['ids'] and results['ids'][0]:
                    for i, doc_id in enumerate(results['ids'][0]):
                        # ChromaDB returns distances, convert to similarity score
                        distance = results['distances'][0][i]
                        score = 1.0 / (1.0 + distance)  # Convert distance to similarity
                        
                        search_results.append(SearchResult(
                            id=str(doc_id),
                            score=score,
                            metadata=results['metadatas'][0][i] if results['metadatas'][0] else {},
                            text=results['documents'][0][i] if results['documents'][0] else None
                        ))
                
                duration = time.time() - start_time
                SEARCH_LATENCY.labels(backend="chromadb").observe(duration)
                SEARCH_COUNTER.labels(backend="chromadb", collection=collection_name).inc()
                
                logger.info(
                    f"ChromaDB search completed",
                    collection=collection_name,
                    results=len(search_results),
                    duration_ms=int(duration * 1000)
                )
                
                return search_results
            
            except Exception as e:
                logger.error(f"ChromaDB search failed: {e}", collection=collection_name)
                span.set_attribute("error", str(e))
                raise
    
    def add_documents(
        self,
        collection_name: str,
        documents: List[str],
        ids: Optional[List[str]] = None,
        metadatas: Optional[List[dict]] = None
    ):
        """Add documents to collection"""
        collection = self.client.get_or_create_collection(name=collection_name)
        
        # Generate embeddings
        embeddings = self.embedder.encode(documents)
        
        # Auto-generate IDs if not provided
        if ids is None:
            import uuid
            ids = [str(uuid.uuid4()) for _ in documents]
        
        collection.add(
            documents=documents,
            embeddings=embeddings,
            ids=ids,
            metadatas=metadatas
        )
        
        logger.info(f"Added {len(documents)} documents to {collection_name}")


def main():
    parser = argparse.ArgumentParser(description="Search ChromaDB collection")
    parser.add_argument("--db-path", help="ChromaDB database path")
    parser.add_argument("--collection", required=True, help="Collection name")
    parser.add_argument("--query", help="Search query")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results")
    parser.add_argument("--list-collections", action="store_true", help="List all collections")
    parser.add_argument("--add-documents", nargs="+", help="Add documents to collection")
    
    args = parser.parse_args()
    
    # Initialize search client
    search = ChromaDBSearch(db_path=args.db_path)
    
    if args.list_collections:
        collections = search.list_collections()
        print(f"Available collections: {', '.join(collections)}")
        return
    
    if args.add_documents:
        search.add_documents(
            collection_name=args.collection,
            documents=args.add_documents
        )
        print(f"✅ Added {len(args.add_documents)} documents to {args.collection}")
        return
    
    if not args.query:
        print("Error: --query required for search")
        return
    
    # Execute search
    results = search.search(
        collection_name=args.collection,
        query=args.query,
        top_k=args.top_k
    )
    
    # Display results
    print(f"\n=== Search Results ({len(results)}) ===\n")
    for i, result in enumerate(results, 1):
        print(f"{i}. Score: {result.score:.4f} | ID: {result.id}")
        if result.text:
            print(f"   Text: {result.text[:200]}...")
        if result.metadata:
            print(f"   Metadata: {result.metadata}")
        print()


if __name__ == "__main__":
    main()
