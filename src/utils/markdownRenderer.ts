/**
 * Simple markdown renderer for basic formatting
 * Converts markdown syntax to HTML with Tailwind CSS classes
 */
export const renderMarkdown = (text: string): string => {
  if (!text) return text;
  
  return text
    // Headers
    .replace(/^### (.*$)/gm, '<h3 class="text-base font-semibold text-blue-900 mb-2">$1</h3>')
    .replace(/^## (.*$)/gm, '<h2 class="text-lg font-semibold text-blue-900 mb-2">$1</h2>')
    .replace(/^# (.*$)/gm, '<h1 class="text-xl font-bold text-blue-900 mb-3">$1</h1>')
    // Bold text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic text
    .replace(/\*(.*?)\*/g, '<em class="italic">$1</em>')
    // Code blocks
    .replace(/`(.*?)`/g, '<code class="bg-blue-100 px-1 rounded text-xs font-mono">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br>');
};
