import React from 'react';
import type { Editor } from '@tiptap/react';
import {
  Bold,
  Italic,
  Underline as UnderlineIcon,
  Strikethrough,
  Heading1,
  Heading2,
  Heading3,
  Pilcrow,
  List,
  ListOrdered,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Quote,
  Undo2,
  Redo2,
} from 'lucide-react';
import clsx from 'clsx';

interface DocumentToolbarProps {
  editor: Editor | null;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({ editor }) => {
  if (!editor) {
    return null;
  }

  return (
    <div className="h-11 bg-artemis-950/90 border-b border-slate-800 px-4 flex items-center gap-1 shrink-0 overflow-x-auto no-scrollbar select-none z-10">
      {/* Undo / Redo */}
      <button
        type="button"
        onClick={() => editor.chain().focus().undo().run()}
        disabled={!editor.can().undo()}
        title="Undo (Ctrl+Z)"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
      >
        <Undo2 className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().redo().run()}
        disabled={!editor.can().redo()}
        title="Redo (Ctrl+Y)"
        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors mr-1"
      >
        <Redo2 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-slate-800 mx-1" />

      {/* Hierarchy / Paragraph & Headings */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setParagraph().run()}
        title="Normal Text"
        className={clsx(
          'p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium',
          editor.isActive('paragraph')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Pilcrow className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        title="Heading 1"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('heading', { level: 1 })
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Heading1 className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading 2"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('heading', { level: 2 })
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Heading2 className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
        title="Heading 3"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('heading', { level: 3 })
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Heading3 className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-slate-800 mx-1" />

      {/* Formatting: Bold, Italic, Underline, Strike */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold (Ctrl+B)"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('bold')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Bold className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic (Ctrl+I)"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('italic')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Italic className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline (Ctrl+U)"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('underline')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <UnderlineIcon className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('strike')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Strikethrough className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-slate-800 mx-1" />

      {/* Alignment */}
      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('left').run()}
        title="Align Left"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive({ textAlign: 'left' })
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <AlignLeft className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('center').run()}
        title="Align Center"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive({ textAlign: 'center' })
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <AlignCenter className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().setTextAlign('right').run()}
        title="Align Right"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive({ textAlign: 'right' })
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <AlignRight className="w-3.5 h-3.5" />
      </button>

      <div className="w-px h-5 bg-slate-800 mx-1" />

      {/* Lists & Quote */}
      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bulleted List"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('bulletList')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <List className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('orderedList')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <ListOrdered className="w-3.5 h-3.5" />
      </button>

      <button
        type="button"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Block Quote"
        className={clsx(
          'p-1.5 rounded-lg transition-colors',
          editor.isActive('blockquote')
            ? 'bg-artemis-accent/15 text-artemis-accent border border-artemis-accent/30'
            : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
        )}
      >
        <Quote className="w-3.5 h-3.5" />
      </button>
    </div>
  );
};
