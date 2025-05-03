import { renderMarkdown } from '@/utils/markdownUtils';

export function useMarkdownRenderer() {
  const renderMarkdown = (content: string): string => {
    return renderMarkdown(content);
  };

  return {
    renderMarkdown
  };
}
