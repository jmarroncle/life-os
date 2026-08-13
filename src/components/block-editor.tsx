"use client";

import { useMemo } from "react";
import YooptaEditor, {
  createYooptaEditor,
  type YooptaContentValue,
} from "@yoopta/editor";
import Paragraph from "@yoopta/paragraph";
import { HeadingOne, HeadingTwo, HeadingThree } from "@yoopta/headings";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import Blockquote from "@yoopta/blockquote";
import { Code } from "@yoopta/code";
import Link from "@yoopta/link";
import Divider from "@yoopta/divider";
import { Bold, Italic, Underline, Strike, CodeMark } from "@yoopta/marks";

const plugins = [
  Paragraph,
  HeadingOne,
  HeadingTwo,
  HeadingThree,
  BulletedList,
  NumberedList,
  TodoList,
  Blockquote,
  Code,
  Link,
  Divider,
];

const marks = [Bold, Italic, Underline, Strike, CodeMark];

export type { YooptaContentValue };

export function emptyBlockValue(): YooptaContentValue {
  return {} as YooptaContentValue;
}

export function BlockEditor({
  initialValue,
  onChange,
  placeholder = "Escribí algo, o \"# \" para un título, \"- \" para una lista…",
  readOnly = false,
}: {
  initialValue: YooptaContentValue;
  onChange?: (value: YooptaContentValue) => void;
  placeholder?: string;
  readOnly?: boolean;
}) {
  const editor = useMemo(
    () => createYooptaEditor({ plugins, marks, value: initialValue, readOnly }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );

  return (
    <YooptaEditor
      editor={editor}
      onChange={(value) => onChange?.(value)}
      placeholder={placeholder}
      className="yoopta-editor-life-os"
    />
  );
}
