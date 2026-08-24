import React, { useState } from 'react';
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
  Highlighter,
  Minus,
  Link2,
  Image as ImageIcon,
  Printer,
  FileDown,
} from 'lucide-react';
import clsx from 'clsx';
import { TableControlsMenu } from './TableControlsMenu';
import { LinkModal } from './LinkModal';
import { ImageModal } from './ImageModal';

interface DocumentToolbarProps {
  editor: Editor | null;
  onPrint?: () => void;
  onExportPDF?: () => void;
}

export const DocumentToolbar: React.FC<DocumentToolbarProps> = ({
  editor,
  onPrint,
  onExportPDF,
}) => {
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  if (!editor) {
    return null;
  }

  const handleLinkSubmit = (url: string) => {
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
    setIsLinkModalOpen(false);
  };

  const handleUnlink = () => {
    editor.chain().focus().unsetLink().run();
    setIsLinkModalOpen(false);
  };

  const handleImageSubmit = (imageUrl: string) => {
    editor.chain().focus().setImage({ src: imageUrl }).run();
    setIsImageModalOpen(false);
  };

  const currentLinkHref = editor.getAttributes('link').href || '';

  return (
    <>
      <div className="h-11 bg-artemis-950/90 border-b border-slate-800 px-4 flex items-center justify-between gap-1 shrink-0 overflow-x-auto no-scrollbar select-none z-10">
        <div className="flex items-center gap-1">
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

          {/* Formatting: Bold, Italic, Underline, Strike, Highlight */}
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

          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHighlight({ color: '#fef08a' }).run()}
            title="Highlight Text"
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              editor.isActive('highlight')
                ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            )}
          >
            <Highlighter className="w-3.5 h-3.5" />
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

          {/* Lists & Quote & Horizontal Rule */}
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

          <button
            type="button"
            onClick={() => editor.chain().focus().setHorizontalRule().run()}
            title="Horizontal Divider"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <Minus className="w-3.5 h-3.5" />
          </button>

          <div className="w-px h-5 bg-slate-800 mx-1" />

          {/* Hyperlinks, Tables, Images */}
          <button
            type="button"
            onClick={() => setIsLinkModalOpen(true)}
            title="Insert / Edit Link"
            className={clsx(
              'p-1.5 rounded-lg transition-colors',
              editor.isActive('link')
                ? 'bg-sky-500/20 text-sky-400 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800'
            )}
          >
            <Link2 className="w-3.5 h-3.5" />
          </button>

          <TableControlsMenu editor={editor} />

          <button
            type="button"
            onClick={() => setIsImageModalOpen(true)}
            title="Insert Image"
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Print & Export Actions */}
        <div className="flex items-center gap-1">
          {onPrint && (
            <button
              type="button"
              onClick={onPrint}
              title="Print Document"
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-100 hover:bg-slate-800 transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          )}

          {onExportPDF && (
            <button
              type="button"
              onClick={onExportPDF}
              title="Export as PDF"
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-cyan-950/40 transition-colors"
            >
              <FileDown className="w-3.5 h-3.5 text-artemis-accent" />
            </button>
          )}
        </div>
      </div>

      {/* Modals */}
      <LinkModal
        isOpen={isLinkModalOpen}
        initialUrl={currentLinkHref}
        onClose={() => setIsLinkModalOpen(false)}
        onSubmit={handleLinkSubmit}
        onUnlink={handleUnlink}
      />

      <ImageModal
        isOpen={isImageModalOpen}
        onClose={() => setIsImageModalOpen(false)}
        onSubmit={handleImageSubmit}
      />
    </>
  );
};
