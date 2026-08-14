import Paragraph from "@yoopta/paragraph";
import { HeadingOne, HeadingTwo, HeadingThree } from "@yoopta/headings";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import Blockquote from "@yoopta/blockquote";
import { Code } from "@yoopta/code";
import Link from "@yoopta/link";
import Divider from "@yoopta/divider";
import Image, { type ImageUploadFn } from "@yoopta/image";
import Table from "@yoopta/table";
import { Bold, Italic, Underline, Strike, CodeMark } from "@yoopta/marks";
import type { SlateElement, YooptaPlugin } from "@yoopta/editor";
import { uploadBlockImage } from "@/lib/uploads";

// El plugin llama upload(file, onProgress) del lado del cliente; onProgress
// es una función y no se puede pasar como argumento a una server action
// (no es serializable), así que este wrapper client-side la descarta antes
// de invocar uploadBlockImage(file).
const handleImageUpload: ImageUploadFn = async (file) => {
  const { src, alt } = await uploadBlockImage(file);
  return { id: null, src, alt };
};

export const plugins: YooptaPlugin<Record<string, SlateElement>>[] = [
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
  Image.extend({ options: { upload: handleImageUpload } }),
  // Table tiene 3 claves de elemento (table/table-row/table-data-cell) que
  // se referencian entre sí en su tipo `children`; TS no logra angostar eso
  // al tipo genérico `Record<string, SlateElement>` que espera este array
  // heterogéneo. El plugin funciona igual en runtime — es solo una
  // limitación de los tipos de @yoopta/table.
  Table as unknown as YooptaPlugin<Record<string, SlateElement>>,
];

export const marks = [Bold, Italic, Underline, Strike, CodeMark];
