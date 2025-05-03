import { marked } from 'marked';
import DOMPurify from 'dompurify';

// This async function was likely correct already
export async function renderMarkdown(content: string): Promise<string> {
  const rendered = await marked(content || ''); // marked() is inherently async
  return DOMPurify.sanitize(rendered);
}

// FIX: Make this function async as well to handle potential Promise from marked.parse
export async function renderMarkdownPotentialSync(content: string): Promise<string> {
  // Await the result of marked.parse, just in case it returns a Promise
  const parsedContent = await marked.parse(content || '');
  // Now parsedContent is guaranteed to be a string before sanitizing
  return DOMPurify.sanitize(parsedContent);
}