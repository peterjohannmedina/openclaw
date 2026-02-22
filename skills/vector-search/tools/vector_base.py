#!/usr/bin/env python3
"""
Vector Search Base Module
Shared utilities for vector database operations
"""

import json
import os
from pathlib import Path
from typing import List, Optional, Dict, Any
from dataclasses import dataclass
from sentence_transformers import SentenceTransformer
from loguru import logger
from prometheus_client import Counter, Histogram
from opentelemetry import trace

# Prometheus metrics
SEARCH_COUNTER = Counter(
    'vector_search_queries_total',
    'Total vector search queries',
    ['backend', 'collection']
)
SEARCH_LATENCY = Histogram(
    'vector_search_latency_seconds',
    'Vector search query latency',
    ['backend']
)
EMBEDDING_COUNTER = Counter(
    'embedding_generation_total',
    'Total embeddings generated',
    ['model']
)

# OpenTelemetry tracer
tracer = trace.get_tracer(__name__)


@dataclass
class SearchResult:
    """Vector search result"""
    id: str
    score: float
    metadata: Dict[str, Any]
    text: Optional[str] = None


class EmbeddingModel:
    """Manages sentence-transformer embedding models"""
    
    _instance = None
    _model = None
    _model_name = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance
    
    def load_model(self, model_name: str = "all-MiniLM-L6-v2", device: str = "cpu"):
        """Load or reuse embedding model"""
        if self._model is None or self._model_name != model_name:
            logger.info(f"Loading embedding model: {model_name}")
            self._model = SentenceTransformer(model_name, device=device)
            self._model_name = model_name
        return self._model
    
    def encode(self, texts: List[str], **kwargs) -> List[List[float]]:
        """Generate embeddings"""
        if self._model is None:
            self.load_model()
        
        with tracer.start_as_current_span("embedding-generation") as span:
            span.set_attribute("model", self._model_name)
            span.set_attribute("text_count", len(texts))
            
            embeddings = self._model.encode(texts, **kwargs)
            EMBEDDING_COUNTER.labels(model=self._model_name).inc(len(texts))
            
            return embeddings.tolist()


def load_config(config_path: Optional[str] = None) -> Dict[str, Any]:
    """Load vector search configuration"""
    if config_path is None:
        config_path = Path.home() / ".openclaw/workspace/skills/vector-search/config.json"
    
    if not Path(config_path).exists():
        logger.warning(f"Config not found: {config_path}, using defaults")
        return get_default_config()
    
    with open(config_path) as f:
        return json.load(f)


def get_default_config() -> Dict[str, Any]:
    """Default configuration"""
    return {
        "milvus": {
            "host": "192.168.1.220",
            "port": 19530,
            "timeout": 30
        },
        "qdrant": {
            "host": "192.168.1.220",
            "port": 6333,
            "timeout": 30
        },
        "chromadb": {
            "path": str(Path.home() / ".openclaw/chromadb"),
            "persist": True
        },
        "embeddings": {
            "model": "all-MiniLM-L6-v2",
            "device": "cpu",
            "cache_folder": str(Path.home() / ".cache/huggingface")
        }
    }


def normalize_scores(results: List[SearchResult], method: str = "minmax") -> List[SearchResult]:
    """Normalize similarity scores to 0-1 range"""
    if not results:
        return results
    
    scores = [r.score for r in results]
    
    if method == "minmax":
        min_score = min(scores)
        max_score = max(scores)
        if max_score == min_score:
            return results
        
        for r in results:
            r.score = (r.score - min_score) / (max_score - min_score)
    
    return results


def filter_by_threshold(results: List[SearchResult], threshold: float = 0.5) -> List[SearchResult]:
    """Filter results by similarity threshold"""
    return [r for r in results if r.score >= threshold]


def setup_logging(session_id: Optional[str] = None):
    """Configure structured logging with session tracking"""
    logger.remove()
    
    log_format = (
        "<green>{time:YYYY-MM-DD HH:mm:ss}</green> | "
        "<level>{level: <8}</level> | "
        "<cyan>session={extra[session_id]}</cyan> | "
        "{message}"
    )
    
    logger.add(
        "/tmp/vector_search.log",
        format=log_format,
        rotation="10 MB",
        retention="30 days",
        serialize=True
    )
    
    if session_id:
        return logger.bind(session_id=session_id)
    return logger.bind(session_id="unknown")


if __name__ == "__main__":
    # Test embedding generation
    print("=== Testing Embedding Model ===")
    embedder = EmbeddingModel()
    embedder.load_model()
    
    texts = ["Hello world", "Test embedding"]
    embeddings = embedder.encode(texts)
    
    print(f"Generated {len(embeddings)} embeddings")
    print(f"Embedding dimension: {len(embeddings[0])}")
    print("✅ Embedding model working!")
