---
name: searxng
description: A skill to interact with a self-hosted SearXNG search aggregator.
metadata:
  base_url: "http://192.168.1.202"
---

### Tools

#### `search(query, categories, language)`
Performs a search using the SearXNG instance.

````js
async function search(query, categories = 'general', language = 'en') {
  if (!query) {
    return { error: 'A search query is required.' };
  }
  
  const url = `${metadata.base_url}/search?q=${encodeURIComponent(query)}&categories=${categories}&language=${language}&format=json`;
  
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `HTTP error! status: ${response.status}` };
    }
    const data = await response.json();
    
    // Simplify the results to the most useful parts
    const results = data.results.slice(0, 10).map(r => ({
      title: r.title,
      url: r.url,
      snippet: r.content,
      engine: r.engine
    }));
    
    return { results };
  } catch (e) {
    return { error: e.message };
  }
}
````

#### `get_engines()`
Retrieves the list of configured search engines from the SearXNG instance.

````js
async function get_engines() {
  const url = `${metadata.base_url}/config`; // The /config endpoint often has engine info
  
  try {
    // This is a bit of a hack since there isn't a clean "list engines" API.
    // We fetch the HTML config page and scrape the engine names.
    const response = await fetch(url);
    if (!response.ok) {
      return { error: `HTTP error! status: ${response.status}` };
    }
    const html = await response.text();
    
    // Use a regex to find all the engine names from the checkboxes on the page
    const engine_regex = /<label for="engine_([^"]+)">/g;
    const engines = [...html.matchAll(engine_regex)].map(match => match[1]);
    
    if (engines.length === 0) {
      return { error: 'Could not parse engines from config page. The page structure might have changed.' };
    }
    
    return { engines };
  } catch (e) {
    return { error: e.message };
  }
}
````
