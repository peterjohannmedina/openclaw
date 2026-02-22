---
name: searxng-browser-search
description: Perform web searches using a local SearxNG instance via the browser. Use this skill when the user explicitly requests to search using SearxNG, or when previous web_search attempts fail and a browser-based search is required. The SearxNG instance is expected to be available at http://192.168.1.210:8080.
---

# SearxNG Browser Search

## Overview

This skill enables performing web searches through a local SearxNG instance using the browser tool. This is particularly useful for leveraging a self-hosted search aggregator or when standard `web_search` is unavailable or encounters issues.

## How to Use

To perform a search using the SearxNG instance at `http://192.168.1.210:8080`:

1.  **Open the SearxNG instance in the browser:**
    ```python
    print(default_api.browser(action="open", targetUrl="http://192.168.1.210:8080"))
    ```

2.  **Take a snapshot to identify the search input field and search button:**
    ```python
    print(default_api.browser(action="snapshot", selector="body", level="info"))
    ```
    *Look for the `ref` associated with the search input field (e.g., `e123`) and the search button (e.g., `e456`). If the `ref` is not clear, use `selector` with CSS selectors to pinpoint the elements.*

3.  **Type your query into the search field and submit:**
    *Replace `e123` with the actual `ref` of the search input field and `e456` with the `ref` of the search button, or use appropriate CSS selectors.*
    ```python
    print(default_api.browser(action="act", request=BrowserRequest(kind="type", ref="e123", text="YOUR_SEARCH_QUERY")))
    print(default_api.browser(action="act", request=BrowserRequest(kind="click", ref="e456")))
    ```
    *Alternatively, if the input field submission automatically triggers the search on Enter, you can omit the click on the button:*
    ```python
    print(default_api.browser(action="act", request=BrowserRequest(kind="type", ref="e123", text="YOUR_SEARCH_QUERY", submit=True)))
    ```

4.  **After submitting the search, take another snapshot to view the results:**
    ```python
    print(default_api.browser(action="snapshot", selector="body", level="info"))
    ```
    *You can then analyze the snapshot to extract relevant information.*

---
