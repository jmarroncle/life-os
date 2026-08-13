import { notFound } from "next/navigation";
import { getPage, updatePage } from "../../actions";
import { EntityEditor } from "@/components/entity-editor";
import {
  emptyBlockValue,
  type YooptaContentValue,
} from "@/components/block-editor";

export default async function PaginaPage({
  params,
}: PageProps<"/data-center/paginas/[id]">) {
  const { id } = await params;
  const page = await getPage(id);

  if (!page) {
    notFound();
  }

  async function saveTitle(title: string) {
    "use server";
    await updatePage(id, { title });
  }

  async function saveContent(content: YooptaContentValue) {
    "use server";
    await updatePage(id, { content });
  }

  return (
    <EntityEditor
      initialTitle={page.title}
      initialContent={(page.content as YooptaContentValue) ?? emptyBlockValue()}
      onSaveTitle={saveTitle}
      onSaveContent={saveContent}
    />
  );
}
