import fetch from "node-fetch";

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

export async function searchWeb(query: string): Promise<string> {
  const encodedQuery = encodeURIComponent(query);
  const url = `https://html.duckduckgo.com/html/?q=${encodedQuery}`;
  
  try {
    const res = await fetch(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
      }
    });
    
    if (!res.ok) {
      return `Search failed with status ${res.status}`;
    }
    
    const html = await res.text();
    const regex = /class="result__snippet"[^>]*>([\s\S]*?)<\/a>/g;
    let match;
    const snippets: string[] = [];
    
    while ((match = regex.exec(html)) !== null && snippets.length < 5) {
      const clean = match[1].replace(/<[^>]*>/g, "").trim();
      snippets.push(decodeHtmlEntities(clean));
    }
    
    if (snippets.length === 0) {
      return "No relevant search results found.";
    }
    
    return snippets.map((s, idx) => `[Result ${idx + 1}] ${s}`).join("\n");
  } catch (err) {
    console.error("[web-search] Error performing search:", err);
    return "Failed to fetch live search results due to network issue.";
  }
}
