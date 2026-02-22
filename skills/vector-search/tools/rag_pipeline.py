#!/usr/bin/env python3
"""
RAG Pipeline - Retrieval Augmented Generation
Combines vector search with LLM generation
"""

import os
import sys
import json
from pathlib import Path
from typing import List, Dict, Any, Optional
from loguru import logger

# Add parent directory to path
sys.path.insert(0, str(Path(__file__).parent))
from index_obsidian import ObsidianIndexer


class RAGPipeline:
    """Retrieval-Augmented Generation pipeline"""
    
    def __init__(
        self,
        collection_name: str = "obsidian_vault",
        model_name: str = "all-MiniLM-L6-v2",
        top_k: int = 5
    ):
        self.indexer = ObsidianIndexer(
            collection_name=collection_name,
            model_name=model_name
        )
        self.top_k = top_k
        logger.info(f"RAG pipeline initialized: collection={collection_name}, top_k={top_k}")
    
    def retrieve(self, query: str, limit: Optional[int] = None) -> List[Dict[str, Any]]:
        """Retrieve relevant documents"""
        limit = limit or self.top_k
        return self.indexer.search(query, limit=limit)
    
    def format_context(self, results: List[Dict[str, Any]]) -> str:
        """Format search results into LLM context"""
        if not results:
            return "No relevant context found."
        
        context_parts = []
        for i, result in enumerate(results, 1):
            source = result['metadata'].get('file_name', 'Unknown')
            text = result['text']
            score = result['score']
            
            context_parts.append(
                f"[{i}] Source: {source} (relevance: {score:.2f})\n{text}"
            )
        
        return "\n\n---\n\n".join(context_parts)
    
    def generate_prompt(self, query: str, context: str) -> str:
        """Generate prompt for LLM with retrieved context"""
        prompt = f"""You are an AI assistant with access to a knowledge base. Answer the user's question using the provided context. If the context doesn't contain relevant information, say so.

Context from knowledge base:
{context}

User question: {query}

Answer:"""
        return prompt
    
    def query(self, question: str, limit: Optional[int] = None) -> Dict[str, Any]:
        """
        Execute full RAG pipeline
        
        Returns:
            dict with keys: question, context, results, prompt
        """
        # Retrieve relevant documents
        results = self.retrieve(question, limit=limit)
        
        # Format context
        context = self.format_context(results)
        
        # Generate prompt
        prompt = self.generate_prompt(question, context)
        
        return {
            "question": question,
            "results": results,
            "context": context,
            "prompt": prompt,
            "metadata": {
                "num_results": len(results),
                "collection": self.indexer.collection_name
            }
        }
    
    def answer(self, question: str, llm_client=None, limit: Optional[int] = None) -> str:
        """
        Get answer to question using RAG
        
        Args:
            question: User's question
            llm_client: Optional LLM client (OpenAI, Anthropic, etc.)
            limit: Max number of documents to retrieve
        
        Returns:
            Generated answer (or prompt if no LLM client provided)
        """
        rag_output = self.query(question, limit=limit)
        
        if llm_client is None:
            logger.warning("No LLM client provided - returning prompt only")
            return rag_output['prompt']
        
        # Use LLM client to generate answer
        # This is a placeholder - integrate with your LLM client
        try:
            response = llm_client.generate(rag_output['prompt'])
            return response
        except Exception as e:
            logger.error(f"LLM generation failed: {e}")
            return rag_output['prompt']


def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="RAG Pipeline - Query Obsidian vault")
    parser.add_argument("query", help="Search query / question")
    parser.add_argument("--collection", default="obsidian_vault", help="ChromaDB collection")
    parser.add_argument("--limit", type=int, default=5, help="Number of results to retrieve")
    parser.add_argument("--format", choices=["json", "text", "prompt"], default="text", 
                       help="Output format")
    
    args = parser.parse_args()
    
    # Create RAG pipeline
    rag = RAGPipeline(collection_name=args.collection, top_k=args.limit)
    
    # Execute query
    result = rag.query(args.query, limit=args.limit)
    
    # Output
    if args.format == "json":
        print(json.dumps(result, indent=2))
    elif args.format == "prompt":
        print(result['prompt'])
    else:  # text
        print(f"Question: {result['question']}\n")
        print(f"Retrieved {result['metadata']['num_results']} documents:\n")
        
        for i, doc in enumerate(result['results'], 1):
            print(f"{i}. {doc['metadata']['file_name']} (score: {doc['score']:.3f})")
            print(f"   {doc['text'][:150]}...\n")
        
        print("\n" + "="*80)
        print("PROMPT FOR LLM:")
        print("="*80)
        print(result['prompt'])


if __name__ == "__main__":
    main()
