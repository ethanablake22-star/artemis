import React from 'react';
import { EditorContent, type Editor } from '@tiptap/react';

interface DocumentCanvasProps {
  editor: Editor | null;
}

export const DocumentCanvas: React.FC<DocumentCanvasProps> = ({ editor }) => {
  if (!editor) {
    return (
      <div className="flex-1 flex items-center justify-center bg-artemis-950 text-slate-500 text-xs">
        Loading editor...
      </div>
    );
  }

  return (
    <div
      className="flex-1 overflow-y-auto bg-artemis-950 py-8 px-4 flex justify-center cursor-text"
      onClick={() => editor.chain().focus().run()}
    >
      {/* Centered White Page Canvas */}
      <div
        className="w-full max-w-4xl bg-white text-slate-900 rounded-sm shadow-2xl shadow-black/80 min-h-[950px] px-14 sm:px-20 py-16 transition-shadow"
        onClick={(e) => e.stopPropagation()}
      >
        <EditorContent
          editor={editor}
          className="artemis-doc-prose focus:outline-none min-h-[800px]"
        />
      </div>
    </div>
  );
};
