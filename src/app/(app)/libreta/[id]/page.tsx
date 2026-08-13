import { notFound } from "next/navigation";
import { getNote, updateNote } from "../actions";
import { NoteEditor } from "@/components/note-editor";
import {
  emptyBlockValue,
  type YooptaContentValue,
} from "@/components/block-editor";

export default async function NotaPage({
  params,
}: PageProps<"/libreta/[id]">) {
  const { id } = await params;
  const note = await getNote(id);

  if (!note) {
    notFound();
  }

  async function saveTitle(title: string) {
    "use server";
    await updateNote(id, { title });
  }

  async function saveContent(content: YooptaContentValue) {
    "use server";
    await updateNote(id, { content });
  }

  async function saveTags(tags: string[]) {
    "use server";
    await updateNote(id, { tags });
  }

  return (
    <NoteEditor
      initialTitle={note.title}
      initialContent={(note.content as YooptaContentValue) ?? emptyBlockValue()}
      initialTags={note.tags}
      onSaveTitle={saveTitle}
      onSaveContent={saveContent}
      onSaveTags={saveTags}
    />
  );
}
