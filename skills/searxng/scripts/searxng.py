#!/usr/bin/env python3
"""
SearXNG Skill - Web search via local SearXNG instance

Replacement for built-in tools.web.search (disabled in v2026.2.15).
This skill provides persistent, crash-resistant web search without external APIs.
"""

import json
import sys
import urllib.request
import urllib.parse
import socket
from typing import List, Dict, Optional, Any, Union


class SearxngSkill:
    """
    Skill for querying a local SearXNG metasearch engine.
    
    This skill replaces the built-in web search that was removed in OpenClaw v2026.2.15.
    It connects to a self-hosted SearXNG instance and requires no API keys.
    
    Usage:
        skill = SearxngSkill()
        results = skill.search("query", limit=10)
        # or use the module-level convenience function:
        results = web_search("query", limit=10)
    """
    
    DEFAULT_URL = "http://192.168.1.210:8080"
    DEFAULT_TIMEOUT = 20
    MAX_RETRIES = 2
    
    def __init__(self, base_url: str = None, timeout: int = None):
        """
        Initialize the SearXNG skill.
        
        Args:
            base_url: Optional custom SearXNG URL (defaults to local instance)
            timeout: Request timeout in seconds (default: 20)
        """
        self.base_url = (base_url or self.DEFAULT_URL).rstrip('/')
        self.search_url = f"{self.base_url}/search"
        self.timeout = timeout or self.DEFAULT_TIMEOUT
        self._last_error = None
    
    def search(self, query: str, limit: int = 10) -> List[Dict[str, Any]]:
        """
        Search the local SearXNG instance for a given query.
        
        This is the primary search method - robust, with retry logic and
        graceful degradation. Never raises exceptions; returns error dicts instead.
        
        Args:
            query: The search query string
            limit: Maximum number of results to return (default: 10, max: 50)
            
        Returns:
            List of result dictionaries with keys:
            - title: Result title
            - url: Result URL
            - content: Content snippet
            - engine: Source search engine
            - score: Relevance score
            
            On error, returns a list with a single dict containing:
            - error: Error message string
            - error_type: Category of error (connection, timeout, parse, empty)
        """
        # Validate input
        if not query or not isinstance(query, str):
            return [{"error": "Invalid query: must be non-empty string", "error_type": "invalid_input"}]
        
        query = query.strip()
        if not query:
            return [{"error": "Empty query provided", "error_type": "invalid_input"}]
        
        # Cap limit to reasonable range
        limit = max(1, min(int(limit), 50))
        
        # Build POST data
        data = urllib.parse.urlencode({
            "q": query,
            "format": "json",
            "safesearch": "0"
        }).encode('utf-8')
        
        # Attempt search with retry logic
        last_exception = None
        for attempt in range(1, self.MAX_RETRIES + 1):
            try:
                result = self._execute_search(data, limit)
                self._last_error = None
                return result
            except (urllib.error.URLError, socket.timeout, TimeoutError) as e:
                last_exception = e
                self._last_error = f"Attempt {attempt} failed: {e}"
                if attempt < self.MAX_RETRIES:
                    continue  # Retry on connection/timeout errors
                # Fall through to error handling on final attempt
        
        # All retries exhausted - return structured error
        error_msg = str(last_exception) if last_exception else "Unknown error"
        error_type = "timeout" if "timeout" in error_msg.lower() else "connection"
        
        return [{
            "error": f"SearXNG search failed after {self.MAX_RETRIES} attempts: {error_msg}",
            "error_type": error_type,
            "url": self.base_url
        }]
    
    def _execute_search(self, data: bytes, limit: int) -> List[Dict[str, Any]]:
        """
        Execute a single search request (internal method).
        
        Args:
            data: URL-encoded POST data
            limit: Maximum results to return
            
        Returns:
            Parsed search results
            
        Raises:
            Various urllib errors on failure
        """
        req = urllib.request.Request(
            self.search_url,
            data=data,
            headers={
                'Content-Type': 'application/x-www-form-urlencoded',
                'Accept': 'application/json',
                'User-Agent': 'OpenClaw-SearxngSkill/1.0'
            },
            method='POST'
        )
        
        with urllib.request.urlopen(req, timeout=self.timeout) as response:
            if response.getcode() != 200:
                raise urllib.error.HTTPError(
                    self.search_url, response.getcode(), 
                    f"Unexpected status: {response.getcode()}", None, None
                )
            response_data = json.loads(response.read().decode('utf-8'))
        
        results = response_data.get("results", [])
        
        if not results:
            return [{"error": "No results found", "error_type": "empty"}]
        
        parsed_results = []
        for item in results[:limit]:
            parsed_results.append({
                "title": item.get("title", "No title"),
                "url": item.get("url", "No URL"),
                "content": item.get("content", "No snippet"),
                "engine": item.get("engine", "unknown"),
                "score": item.get("score", 0.0)
            })
        
        return parsed_results
    
    def health_check(self, detailed: bool = False) -> Dict[str, Any]:
        """
        Check if the SearXNG server is reachable and healthy.
        
        Args:
            detailed: If True, include additional server info if available
            
        Returns:
            Dict with keys:
            - status: "ok" or "error"
            - url: The SearXNG URL being checked
            - latency_ms: Response time in milliseconds (if ok)
            - http_status: HTTP status code (if ok)
            - error: Error message (if error)
            - version: SearXNG version (if detailed and available)
        """
        import time
        
        result = {
            "status": "error",
            "url": self.base_url,
        }
        
        try:
            start = time.time()
            req = urllib.request.Request(
                f"{self.base_url}/healthz" if detailed else self.base_url,
                method='GET',
                headers={'Accept': 'text/html, application/json', 'User-Agent': 'OpenClaw-HealthCheck/1.0'}
            )
            
            with urllib.request.urlopen(req, timeout=self.timeout) as response:
                latency_ms = round((time.time() - start) * 1000)
                result.update({
                    "status": "ok",
                    "latency_ms": latency_ms,
                    "http_status": response.getcode()
                })
                
                # Try to extract version if detailed mode
                if detailed and response.getcode() == 200:
                    try:
                        content = response.read().decode('utf-8')
                        # Look for version in meta generator tag
                        if 'searxng/' in content.lower():
                            import re
                            version_match = re.search(r'searxng/([\d.]+[+a-f0-9]*)', content, re.I)
                            if version_match:
                                result["version"] = version_match.group(1)
                    except:
                        pass
                        
        except urllib.error.URLError as e:
            result["error"] = f"Connection failed: {e.reason if hasattr(e, 'reason') else e}"
        except urllib.error.HTTPError as e:
            # Some SearXNG instances return 404 on /healthz but are still up
            if e.code == 404:
                result.update({"status": "ok", "http_status": 404, "note": "Health endpoint not found, but server reachable"})
            else:
                result["error"] = f"HTTP {e.code}: {e.reason}"
        except socket.timeout:
            result["error"] = f"Connection timeout after {self.timeout}s"
        except Exception as e:
            result["error"] = f"Unexpected error: {e}"
        
        return result
    
    def is_healthy(self) -> bool:
        """
        Quick health check returning boolean status.
        
        Returns:
            True if SearXNG is reachable, False otherwise
        """
        return self.health_check()["status"] == "ok"
    
    def get_last_error(self) -> Optional[str]:
        """Get the last error message, if any."""
        return self._last_error


# Module-level convenience function for simple usage
def web_search(query: str, limit: int = 10, base_url: str = None) -> List[Dict[str, Any]]:
    """
    Perform a web search using the local SearXNG instance.
    
    This is a convenience function for quick searches without instantiating
    the skill class. For repeated searches, use SearxngSkill directly.
    
    Args:
        query: Search query string
        limit: Maximum results (default: 10)
        base_url: Optional custom SearXNG URL
        
    Returns:
        List of search result dictionaries, or error dict on failure
        
    Example:
        >>> results = web_search("python tutorials", limit=5)
        >>> for r in results:
        ...     print(f"{r['title']}: {r['url']}")
    """
    skill = SearxngSkill(base_url=base_url)
    return skill.search(query, limit=limit)
    
    def health_check(self) -> Dict[str, Any]:
        """
        Check if the SearXNG server is reachable.
        
        Returns:
            Dict with 'status' (ok/error), 'url', and optional 'error' message
        """
        try:
            req = urllib.request.Request(
                self.base_url,
                method='GET',
                headers={'Accept': 'text/html'}
            )
            
            with urllib.request.urlopen(req, timeout=self.TIMEOUT) as response:
                return {
                    "status": "ok",
                    "url": self.base_url,
                    "http_status": response.getcode()
                }
        except Exception as e:
            return {
                "status": "error",
                "url": self.base_url,
                "error": str(e)
            }


def main():
    """CLI entry point for direct script execution."""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="SearXNG Skill - Web search without API keys",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
This skill replaces the built-in tools.web.search (disabled in v2026.2.15).
It connects to a local SearXNG instance at 192.168.1.210:8080.

Examples:
  # Search for something
  python searxng.py "python tutorials" --limit 5

  # Check if SearXNG is reachable
  python searxng.py --health-check

  # Detailed health check with latency
  python searxng.py --health-check --detailed

  # Use a different SearXNG instance
  python searxng.py "query" --url http://searxng.example.com:8080
        """
    )
    
    parser.add_argument(
        "query",
        nargs="?",
        help="Search query string"
    )
    parser.add_argument(
        "--limit",
        type=int,
        default=10,
        help="Maximum number of results (default: 10, max: 50)"
    )
    parser.add_argument(
        "--health-check",
        action="store_true",
        help="Check SearXNG server health"
    )
    parser.add_argument(
        "--detailed",
        action="store_true",
        help="Include detailed info in health check"
    )
    parser.add_argument(
        "--url",
        default=None,
        help="Custom SearXNG URL (default: http://192.168.1.210:8080)"
    )
    parser.add_argument(
        "--timeout",
        type=int,
        default=20,
        help="Request timeout in seconds (default: 20)"
    )
    
    args = parser.parse_args()
    
    skill = SearxngSkill(base_url=args.url, timeout=args.timeout)
    
    if args.health_check:
        result = skill.health_check(detailed=args.detailed)
        print(json.dumps(result, indent=2))
        sys.exit(0 if result["status"] == "ok" else 1)
    
    if not args.query:
        parser.print_help()
        sys.exit(1)
    
    results = skill.search(args.query, limit=args.limit)
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
