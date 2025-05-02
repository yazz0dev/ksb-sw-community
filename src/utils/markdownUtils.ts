import { marked } from 'marked';
import DOMPurify from 'dompurify';

export async function renderMarkdown(content: string): Promise<string> {
  const rendered = await marked(content || '');
  return DOMPurify.sanitize(rendered);
}

export function renderMarkdownSync(content: string): string {
  return DOMPurify.sanitize(marked.parse(content || ''));
}
