import { marked } from 'marked';
import DOMPurify from 'dompurify';


// FIX: Simplified to one async function, removed renderMarkdownPotentialSync
export async function renderMarkdown(content: string): Promise<string> {
  if (!content) {
    return ''; // Return empty string for empty input
  }
  try {
    // FIX: Always await marked() as it can return a Promise
    const rawHtml: string = await marked(content);
    // Sanitize the HTML to prevent XSS attacks
    return DOMPurify.sanitize(rawHtml);
  } catch (error) {
    console.error("Markdown rendering failed:", error);
    // Return an error message or safe fallback HTML
    return '<p class="text-danger">Error rendering content.</p>';
  }
}