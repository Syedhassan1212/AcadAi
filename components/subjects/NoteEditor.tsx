'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import { BubbleMenu, FloatingMenu } from '@tiptap/react/menus';
import StarterKit from '@tiptap/starter-kit';
import { ResizableImage } from '@/lib/tiptap/ResizableImage';
import { Placeholder } from '@tiptap/extension-placeholder';
import { Link } from '@tiptap/extension-link';
import { Typography } from '@tiptap/extension-typography';
import { TaskList } from '@tiptap/extension-task-list';
import { TaskItem } from '@tiptap/extension-task-item';
import { Table } from '@tiptap/extension-table';
import { TableRow } from '@tiptap/extension-table-row';
import { TableCell } from '@tiptap/extension-table-cell';
import { TableHeader } from '@tiptap/extension-table-header';
import { useEffect, useRef } from 'react';
import { markdownToHtml, isMarkdown } from '@/lib/utils/markdown';

interface NoteEditorProps {
  content: string;
  onChange: (html: string) => void;
  onImageUpload: (file: File) => Promise<string | null>;
  placeholder?: string;
}

export default function NoteEditor({ content, onChange, onImageUpload, placeholder }: NoteEditorProps) {
  const lastContentRef = useRef<string>('');

  // Convert markdown to HTML if needed before giving to editor
  const resolveContent = (raw: string): string => {
    if (!raw) return '';
    if (isMarkdown(raw)) {
      return markdownToHtml(raw);
    }
    return raw;
  };

  const editor = useEditor({
    extensions: [
      StarterKit,
      ResizableImage.configure({
        allowBase64: true,
        HTMLAttributes: {
          class: 'note-image shadow-sm transition-all',
        },
      }),
      Placeholder.configure({
        placeholder: placeholder || "Type '/' for commands...",
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: {
          class: 'text-primary hover:underline cursor-pointer',
        },
      }),
      Typography,
      TaskList,
      TaskItem.configure({ nested: true }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: resolveContent(content),
    editorProps: {
      attributes: {
        class: 'note-editor-prose focus:outline-none max-w-none min-h-[400px] leading-relaxed px-1',
      },
      handlePaste: (view, event) => {
        const items = event.clipboardData?.items;
        if (items) {
          for (let i = 0; i < items.length; i++) {
            if (items[i].type.indexOf('image') !== -1) {
              const file = items[i].getAsFile();
              if (file) {
                onImageUpload(file).then(url => {
                  if (url) {
                    view.dispatch(view.state.tr.replaceSelectionWith(
                      view.state.schema.nodes.image.create({ src: url })
                    ));
                  }
                });
                return true;
              }
            }
          }
        }
        return false;
      },
      handleDrop: (view, event, _slice, moved) => {
        if (!moved && event.dataTransfer && event.dataTransfer.files && event.dataTransfer.files[0]) {
          const file = event.dataTransfer.files[0];
          if (file.type.indexOf('image') !== -1) {
            onImageUpload(file).then(url => {
              if (url) {
                const { schema } = view.state;
                const coordinates = view.posAtCoords({ left: event.clientX, top: event.clientY });
                const node = schema.nodes.image.create({ src: url });
                const transaction = view.state.tr.insert(coordinates?.pos || view.state.selection.from, node);
                view.dispatch(transaction);
              }
            });
            return true;
          }
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) => {
      const html = e.getHTML();
      lastContentRef.current = html;
      onChange(html);
    },
    immediatelyRender: false,
  });

  // Keep content in sync when switching notes
  useEffect(() => {
    if (editor && content !== lastContentRef.current) {
      const resolved = resolveContent(content);
      editor.commands.setContent(resolved);
      lastContentRef.current = content;
    }
  }, [content, editor]);

  if (!editor) return null;

  const addImage = async () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.onchange = async () => {
      const file = input.files?.[0];
      if (file) {
        const url = await onImageUpload(file);
        if (url) {
          editor.chain().focus().setImage({ src: url }).run();
        }
      }
    };
    input.click();
  };

  return (
    <div className="relative group/editor">
      {/* Notion-style Bubble Menu (Formatting) */}
      <BubbleMenu editor={editor} className="flex bg-surface-container border border-outline-variant/20 rounded-lg shadow-xl overflow-hidden">
        <button
          onClick={() => editor.chain().focus().toggleBold().run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('bold') ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[18px]">format_bold</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleItalic().run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('italic') ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[18px]">format_italic</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleStrike().run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('strike') ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[18px]">strikethrough_s</span>
        </button>
        <div className="w-px bg-outline-variant/20" />
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('heading', { level: 1 }) ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="text-sm font-black">H1</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('heading', { level: 2 }) ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="text-sm font-black">H2</span>
        </button>
        <div className="w-px bg-outline-variant/20" />
        <button
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('bulletList') ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[18px]">format_list_bulleted</span>
        </button>
        <button
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          className={`p-2 hover:bg-surface-container-high transition-colors ${editor.isActive('blockquote') ? 'text-primary' : 'text-on-surface-variant'}`}
        >
          <span className="material-symbols-outlined text-[18px]">format_quote</span>
        </button>
      </BubbleMenu>

      {/* Notion-style Floating Menu (Commands) */}
      <FloatingMenu editor={editor} className="flex flex-col bg-surface-container border border-outline-variant/20 rounded-xl shadow-2xl p-2 min-w-[220px] animate-in fade-in zoom-in duration-200">
        <p className="text-[10px] text-on-surface-variant/50 uppercase font-black tracking-widest px-3 py-1.5">Blocks</p>
        {[
          { label: 'Heading 1', icon: 'format_h1', color: 'red', action: () => editor.chain().focus().toggleHeading({ level: 1 }).run() },
          { label: 'Heading 2', icon: 'format_h2', color: 'orange', action: () => editor.chain().focus().toggleHeading({ level: 2 }).run() },
          { label: 'Heading 3', icon: 'format_h3', color: 'yellow', action: () => editor.chain().focus().toggleHeading({ level: 3 }).run() },
          { label: 'Bullet List', icon: 'format_list_bulleted', color: 'blue', action: () => editor.chain().focus().toggleBulletList().run() },
          { label: 'Numbered List', icon: 'format_list_numbered', color: 'cyan', action: () => editor.chain().focus().toggleOrderedList().run() },
          { label: 'To-do List', icon: 'task_alt', color: 'primary', action: () => editor.chain().focus().toggleTaskList().run() },
          { label: 'Blockquote', icon: 'format_quote', color: 'purple', action: () => editor.chain().focus().toggleBlockquote().run() },
          { label: 'Code Block', icon: 'code', color: 'green', action: () => editor.chain().focus().toggleCodeBlock().run() },
          { label: 'Table', icon: 'table', color: 'teal', action: () => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
          { label: 'Image', icon: 'image', color: 'emerald', action: addImage },
        ].map(item => (
          <button
            key={item.label}
            onClick={item.action}
            className="flex items-center gap-3 px-3 py-2 hover:bg-surface-container-high rounded-lg text-left transition-colors"
          >
            <div className={`w-8 h-8 rounded-lg bg-${item.color}-400/10 flex items-center justify-center`}>
              <span className={`material-symbols-outlined text-${item.color}-400 text-[18px]`}>{item.icon}</span>
            </div>
            <span className="text-xs font-semibold text-on-surface">{item.label}</span>
          </button>
        ))}
      </FloatingMenu>

      <EditorContent editor={editor} id="notion-editor-canvas" />
    </div>
  );
}