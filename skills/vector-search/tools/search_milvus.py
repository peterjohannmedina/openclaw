#!/usr/bin/env python3
"""
Milvus Vector Search Tool
Search Milvus collections using semantic similarity
"""

import argparse
import time
from typing import List, Optional
from pymilvus import connections, Collection, utility
from vector_base import (
    EmbeddingModel, SearchResult, load_config,
    SEARCH_COUNTER, SEARCH_LATENCY, tracer, setup_logging
)

logger = setup_logging()


class MilvusSearch:
    """Milvus vector search client"""
    
    def __init__(self, host: str = "localhost", port: int = 19530, timeout: int = 30):
        self.host = host
        self.port = port
        self.timeout = timeout
        self._connected = False
        self.embedder = EmbeddingModel()
    
    def connect(self):
        """Establish connection to Milvus"""
        if not self._connected:
            logger.info(f"Connecting to Milvus at {self.host}:{self.port}")
            connections.connect(
                alias="default",
                host=self.host,
                port=str(self.port),
                timeout=self.timeout
            )
            self._connected = True
    
    def list_collections(self) -> List[str]:
        """List all collections"""
        self.connect()
        return utility.list_collections()
    
    def search(
        self,
        collection_name: str,
        query: str,
        top_k: int = 5,
        embedding_field: str = "embedding",
        output_fields: Optional[List[str]] = None,
        filter_expr: Optional[str] = None
    ) -> List[SearchResult]:
        """Search collection by semantic similarity"""
        
        with tracer.start_as_current_span("milvus-search") as span:
            span.set_attribute("collection", collection_name)
            span.set_attribute("query_length", len(query))
            span.set_attribute("top_k", top_k)
            
            start_time = time.time()
            
            try:
                self.connect()
                
                # Load collection
                collection = Collection(collection_name)
                collection.load()
                
                # Generate query embedding
                query_embedding = self.embedder.encode([query])[0]
                
                # Prepare search parameters
                search_params = {
                    "metric_type": "COSINE",
                    "params": {"nprobe": 10}
                }
                
                # Execute search
                results = collection.search(
                    data=[query_embedding],
                    anns_field=embedding_field,
                    param=search_params,
                    limit=top_k,
                    expr=filter_expr,
                    output_fields=output_fields or ["*"]
                )
                
                # Convert to SearchResult objects
                search_results = []
                for hits in results:
                    for hit in hits:
                        search_results.append(SearchResult(
                            id=str(hit.id),
                            score=hit.score,
                            metadata=hit.entity.to_dict(),
                            text=hit.entity.get("text") if hasattr(hit, 'entity') else None
                        ))
                
                duration = time.time() - start_time
                SEARCH_LATENCY.labels(backend="milvus").observe(duration)
                SEARCH_COUNTER.labels(backend="milvus", collection=collection_name).inc()
                
                logger.info(
                    f"Milvus search completed",
                    collection=collection_name,
                    results=len(search_results),
                    duration_ms=int(duration * 1000)
                )
                
                return search_results
            
            except Exception as e:
                logger.error(f"Milvus search failed: {e}", collection=collection_name)
                span.set_attribute("error", str(e))
                raise
    
    def disconnect(self):
        """Close connection"""
        if self._connected:
            connections.disconnect("default")
            self._connected = False


def main():
    parser = argparse.ArgumentParser(description="Search Milvus collection")
    parser.add_argument("--host", default="192.168.1.220", help="Milvus host")
    parser.add_argument("--port", type=int, default=19530, help="Milvus port")
    parser.add_argument("--collection", required=True, help="Collection name")
    parser.add_argument("--query", required=True, help="Search query")
    parser.add_argument("--top-k", type=int, default=5, help="Number of results")
    parser.add_argument("--fields", help="Output fields (comma-separated)")
    parser.add_argument("--filter", help="Filter expression")
    parser.add_argument("--list-collections", action="store_true", help="List all collections")
    
    args = parser.parse_args()
    
    # Initialize search client
    search = MilvusSearch(host=args.host, port=args.port)
    
    try:
        if args.list_collections:
            collections = search.list_collections()
            print(f"Available collections: {', '.join(collections)}")
            return
        
        # Execute search
        output_fields = args.fields.split(",") if args.fields else None
        results = search.search(
            collection_name=args.collection,
            query=args.query,
            top_k=args.top_k,
            output_fields=output_fields,
            filter_expr=args.filter
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
    
    finally:
        search.disconnect()


if __name__ == "__main__":
    main()
