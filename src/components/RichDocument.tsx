"use client";
import { useEditor, EditorContent } from "@tiptap/react";
import { useEffect } from "react";
import { extensions } from "../core/editor/extensions";
import type { Doc } from "../core/model";
export function RichDocument({ doc }: { doc: Doc }) {
  const editor = useEditor({
    extensions: extensions(),
    content: doc,
    editable: false,
    immediatelyRender: false,
  });
  useEffect(() => {
    editor?.commands.setContent(doc, false);
  }, [editor, doc]);
  return (
    <div className="read-document">
      <EditorContent editor={editor} />
    </div>
  );
}
