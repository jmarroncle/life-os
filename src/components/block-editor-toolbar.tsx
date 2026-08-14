"use client";

import { useYooptaEditor } from "@yoopta/editor";
import { FloatingToolbar } from "@yoopta/ui/floating-toolbar";

const MARK_BUTTONS: { type: string; label: string; className?: string }[] = [
  { type: "bold", label: "B", className: "font-bold" },
  { type: "italic", label: "I", className: "italic" },
  { type: "underline", label: "U", className: "underline" },
  { type: "strike", label: "S", className: "line-through" },
  { type: "code", label: "</>" },
];

export function BlockEditorToolbar() {
  const editor = useYooptaEditor();

  return (
    <FloatingToolbar>
      <FloatingToolbar.Content>
        <FloatingToolbar.Group>
          {MARK_BUTTONS.map(({ type, label, className }) => {
            const format = editor.formats[type];
            if (!format) return null;
            return (
              <FloatingToolbar.Button
                key={type}
                className={className}
                active={format.isActive()}
                onClick={() => format.toggle()}
              >
                {label}
              </FloatingToolbar.Button>
            );
          })}
        </FloatingToolbar.Group>
      </FloatingToolbar.Content>
    </FloatingToolbar>
  );
}
