import { marked } from 'marked';

/**
 * Converts raw markdown string to HTML that Tiptap can understand.
 * This is used to properly render AI-generated notes in the editor.
 */
export function markdownToHtml(markdown: string): string {
  if (!markdown) return '';

  // If content already looks like HTML (has tags), return as-is
  if (markdown.trim().startsWith('<') && markdown.includes('</')) {
    return markdown;
  }

  // Configure marked for clean output
  marked.setOptions({
    gfm: true,        // GitHub Flavored Markdown (tables, strikethrough, etc.)
    breaks: true,      // Convert \n to <br>
  });

  const html = marked.parse(markdown);
  
  // marked.parse can return string | Promise<string>, but in sync mode it returns string
  if (typeof html === 'string') {
    return html;
  }
  
  return markdown;
}

/**
 * Detects whether a string is raw markdown (not HTML).
 * Used to decide if we need to convert before loading into the editor.
 */
export function isMarkdown(content: string): boolean {
  if (!content) return false;
  
  const markdownPatterns = [
    /^#{1,6}\s/m,          // Headings: ## Title
    /^\*\s/m,              // Unordered list: * item
    /^-\s/m,               // Unordered list: - item
    /^\d+\.\s/m,           // Ordered list: 1. item
    /\*\*[^*]+\*\*/,       // Bold: **text**
    /\|.*\|.*\|/,          // Tables: | col | col |
    /^>\s/m,               // Blockquotes: > text
    /```[\s\S]*```/,       // Code blocks
  ];

  const htmlCheck = content.trim().startsWith('<') && content.includes('</');
  if (htmlCheck) return false;

  return markdownPatterns.some(pattern => pattern.test(content));
}
