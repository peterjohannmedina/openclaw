#!/usr/bin/env python3
"""
Web Search Wrapper - Always Use SearXNG
Replaces expensive Brave API with free local SearXNG
"""

import sys
import os

# Add skills to path
sys.path.insert(0, os.path.expanduser('~/.openclaw/workspace/skills/searxng/scripts'))

from searxng import web_search as searxng_search

def web_search(query: str, count: int = 10, **kwargs):
    """
    Drop-in replacement for built-in web_search that uses SearXNG
    
    Args:
        query: Search query string
        count: Number of results (default 10)
        **kwargs: Additional arguments (ignored for compatibility)
    
    Returns:
        List of search results from SearXNG
    """
    return searxng_search(query, limit=count)

if __name__ == "__main__":
    # CLI usage
    import json
    if len(sys.argv) < 2:
        print("Usage: web_search_wrapper.py 'search query' [count]")
        sys.exit(1)
    
    query = sys.argv[1]
    count = int(sys.argv[2]) if len(sys.argv) > 2 else 10
    
    results = web_search(query, count)
    print(json.dumps(results, indent=2))
