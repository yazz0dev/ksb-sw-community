// src/composables/useMarkdownRenderer.ts
import { marked } from 'marked';
import DOMPurify from 'dompurify';


export function useMarkdownRenderer() {

  /**
   * Renders a Markdown string to safe HTML asynchronously.
   * @param content The Markdown string to render.
   * @returns A Promise that resolves with the sanitized HTML string.
   */
  const renderMarkdown = async (content: string): Promise<string> => {
    // Handle empty or null input gracefully
    if (!content) {
      return '';
    }

    try {
      // 1. Convert markdown to raw HTML.
      // Use await because marked() can return a Promise.
      const rawHtml: string = await marked(content);

      // 2. Sanitize the generated HTML to prevent XSS attacks.
      // Ensure DOMPurify runs in a browser-like environment if using SSR.
      const cleanHtml: string = DOMPurify.sanitize(rawHtml);

      // 3. Return the safe HTML.
      return cleanHtml;
    } catch (error) {
      console.error("Markdown rendering failed:", error);
      // Provide a user-friendly error message within safe HTML
      return '<p class="text-danger">Error rendering content.</p>';
    }
  };

  // Return the rendering function (and potentially others in the future)
  return {
    renderMarkdown
  };
}