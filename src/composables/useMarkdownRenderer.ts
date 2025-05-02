import { renderMarkdownSync } from '@/utils/markdownUtils';

export function useMarkdownRenderer() {
  const renderMarkdown = (content: string): string => {
    return renderMarkdownSync(content);
  };

  return {
    renderMarkdown
  };
}
