#!/usr/bin/env python3
"""
Qdrant Vector Search Tool
Search Qdrant collections using semantic similarity
"""

import argparse
import time
from typing import List, Optional
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct, Filter
from vector_base import (
    EmbeddingModel, SearchResult, load_config,
    SEARCH_COUNTER, SEARCH_LATENCY, tracer, setup_logging
)

logger = setup_logging()


class QdrantSearch:
    """Qdrant vector search client"""
    
    def __init__(self, host: str = "localhost", port: int = 6333):
        self.client = QdrantClient(host=host, port=port)
        self.embedder = EmbeddingModel()
        logger.info(f"Connected to Qdrant at {host}:{port}")
    
    def list_collections(self) -> List[str]:
        """List all collections"""
        collections = self.client.get_collections()
        return [c.name for c in collections.collections]
    
    def collection_info(self, collection_name: str):
        """Get collection metadata"""
        return self.client.get_collection(collection_name)
    
    def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        score_threshold: Optional[float] = None,
        filter_conditions: Optional[dict] = None
    ) -> List[SearchResult]:
        """Search collection by semantic similarity"""
        
        with tracer.start_as_current_span("qdrant-search") as span:
            span.set_attribute("collection", collection_name)
            span.set_attribute("query_length", len(query))
            span.set_attribute("top_k", top_k)
            
            start_time = time.time()
            
            try:
                # Generate query embedding
                query_embedding = self.embedder.encode([query])[0]
                
                # Build filter if provided
                query_filter = None
                if filter_conditions:
                    query_filter = Filter(**filter_conditions)
                
                # Execute search
                results = self.client.search(
                    collection_name=collection_name,
                    query_vector=query_embedding,
                    limit=top_k,
                    score_threshold=score_threshold,
                    query_filter=query_filter,
                    with_payload=True
                )
                
                # Convert to SearchResult objects
                search_results = []
                for hit in results:
                    search_results.append(SearchResult(
                        id=str(hit.id),
                        score=hit.score,
                        metadata=hit.payload or {},
                        text=hit.payload.get("text") if hit.payload else None
                    ))
                
                duration = time.time() - start_time
                SEARCH_LATENCY.labels(backend="qdrant").observe(duration)
                SEARCH_COUNTER.labels(backend="qdrant", collection=collection_name).inc()
                
                logger.info(
                    f"Qdrant search completed",
                    collection=collection_name,
                    results=len(search_results),
                    duration_ms=int(duration * 1000)
                )
                
                return search_results
            
            except Exception as e:
                logger.error(f"Qdrant search failed: {e}", collection=collection_name)
                span.set_attribute("error", str(e))
                raise


def main():
    parser = argparse.ArgumentParser(description="Search Qdrant collection")
    parser.add_argument("--host", default="192.168.1.220", help="Qdrant host")
    parser.add_argument("--port", type=int, default=6333, help="Qdrant port")
    parser.add_argument("--collection", required=True, help="Collection name")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results")
    parser.add_argument("--threshold", type=float, help="Minimum score threshold")
    parser.add_argument("--list-collections", action="store_true", help="List all collections")
    parser.add_argument("--info", action="store_true", help="Show collection info")
    
    args = parser.parse_args()
    
    # Initialize search client
    search = QdrantSearch(host=args.host, port=args.port)
    
    if args.list_collections:
        collections = search.list_collections()
        print(f"Available collections: {', '.join(collections)}")
        return
    
    if args.info:
        info = search.collection_info(args.collection)
        print(f"\n=== Collection Info: {args.collection} ===")
        print(f"Vectors: {info.vectors_count}")
        print(f"Points: {info.points_count}")
        print(f"Status: {info.status}")
        return
    
    # Execute search
    results = search.search(
        collection_name=args.collection,
        query=args.query,
        top_k=args.top_k,
        score_threshold=args.threshold
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
