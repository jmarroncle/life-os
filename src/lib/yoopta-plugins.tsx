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
import { YooptaPlugin, type SlateElement } from "@yoopta/editor";
import { uploadBlockImage } from "@/lib/uploads";
import { BlockEditorImage } from "@/components/block-editor-image";

// El plugin llama upload(file, onProgress) del lado del cliente; onProgress
// es una función y no se puede pasar como argumento a una server action
// (no es serializable), así que este wrapper client-side la descarta antes
// de invocar uploadBlockImage(file).
const handleImageUpload: ImageUploadFn = async (file) => {
  const { src, alt } = await uploadBlockImage(file);
  return { id: null, src, alt };
};

// @yoopta/table (6.0.5) intenta crear un bloque de respaldo usando el tipo
// de elemento Slate "paragraph" (minúscula) en vez del tipo de bloque
// "Paragraph" (mayúscula) que usa el resto de Yoopta para registrar
// plugins — sin este alias, insertar una tabla tira "Plugin paragraph not
// found" y no inserta nada (confirmado con Playwright). Es un bug de la
// librería en su versión actual, no algo particular de este código: se
// registra un segundo plugin con el mismo comportamiento que Paragraph,
// solo bajo esa otra clave, para que ese lookup interno encuentre algo.
const ParagraphLowercaseAlias = new YooptaPlugin({
  ...Paragraph.getPlugin,
  type: "paragraph",
});

export const plugins: YooptaPlugin<Record<string, SlateElement>>[] = [
  Paragraph,
  ParagraphLowercaseAlias as unknown as YooptaPlugin<Record<string, SlateElement>>,
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
  // @yoopta/image no trae ninguna UI propia — su render por default es
  // solo <img src={…} />, sin botón ni dropzone para elegir un archivo
  // (confirmado leyendo su fuente). BlockEditorImage la reemplaza con un
  // estado "todavía no hay imagen" (botón + <input type="file">) y sigue
  // usando la misma uploadBlockImage.
  Image.extend({
    options: { upload: handleImageUpload },
    elements: { image: { render: (props) => <BlockEditorImage {...props} /> } },
  }),
  // Table tiene 3 claves de elemento (table/table-row/table-data-cell) que
  // se referencian entre sí en su tipo `children`; TS no logra angostar eso
  // al tipo genérico `Record<string, SlateElement>` que espera este array
  // heterogéneo. El plugin funciona igual en runtime — es solo una
  // limitación de los tipos de @yoopta/table.
  Table as unknown as YooptaPlugin<Record<string, SlateElement>>,
];

export const marks = [Bold, Italic, Underline, Strike, CodeMark];
