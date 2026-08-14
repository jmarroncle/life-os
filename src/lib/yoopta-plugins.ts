import Paragraph from "@yoopta/paragraph";
import { HeadingOne, HeadingTwo, HeadingThree } from "@yoopta/headings";
import { BulletedList, NumberedList, TodoList } from "@yoopta/lists";
import Blockquote from "@yoopta/blockquote";
import { Code } from "@yoopta/code";
import Link from "@yoopta/link";
import Divider from "@yoopta/divider";
import { Bold, Italic, Underline, Strike, CodeMark } from "@yoopta/marks";

export const plugins = [
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

export const marks = [Bold, Italic, Underline, Strike, CodeMark];
