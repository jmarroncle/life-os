"use client";

import { useYooptaEditor } from "@yoopta/editor";
import {
  SlashCommandMenu,
  type SlashCommandItemType,
} from "@yoopta/ui/slash-command-menu";

export function BlockEditorSlashMenu() {
  const editor = useYooptaEditor();

  const items: SlashCommandItemType[] = [
    {
      id: "paragraph",
      title: "Texto",
      description: "Párrafo simple",
      group: "Básico",
      onSelect: () => editor.toggleBlock("Paragraph", { focus: true }),
    },
    {
      id: "heading-one",
      title: "Título 1",
      description: "Encabezado grande",
      group: "Básico",
      onSelect: () => editor.toggleBlock("HeadingOne", { focus: true }),
    },
    {
      id: "heading-two",
      title: "Título 2",
      description: "Encabezado mediano",
      group: "Básico",
      onSelect: () => editor.toggleBlock("HeadingTwo", { focus: true }),
    },
    {
      id: "heading-three",
      title: "Título 3",
      description: "Encabezado chico",
      group: "Básico",
      onSelect: () => editor.toggleBlock("HeadingThree", { focus: true }),
    },
    {
      id: "bulleted-list",
      title: "Lista con viñetas",
      description: "Lista simple",
      group: "Listas",
      onSelect: () => editor.toggleBlock("BulletedList", { focus: true }),
    },
    {
      id: "numbered-list",
      title: "Lista numerada",
      description: "Lista ordenada con números",
      group: "Listas",
      onSelect: () => editor.toggleBlock("NumberedList", { focus: true }),
    },
    {
      id: "todo-list",
      title: "Checklist",
      description: "Lista de tareas con casilleros",
      group: "Listas",
      onSelect: () => editor.toggleBlock("TodoList", { focus: true }),
    },
    {
      id: "blockquote",
      title: "Cita",
      description: "Bloque de cita destacado",
      group: "Otro",
      onSelect: () => editor.toggleBlock("Blockquote", { focus: true }),
    },
    {
      id: "code",
      title: "Código",
      description: "Bloque de código con resaltado",
      group: "Otro",
      onSelect: () => editor.toggleBlock("Code", { focus: true }),
    },
    {
      id: "divider",
      title: "Separador",
      description: "Línea divisoria",
      group: "Otro",
      onSelect: () => editor.toggleBlock("Divider", { focus: true }),
    },
  ];

  return (
    <SlashCommandMenu items={items}>
      {({ groupedItems }) => (
        <SlashCommandMenu.Content>
          <SlashCommandMenu.Input placeholder="Buscar un bloque…" />
          <SlashCommandMenu.List>
            {[...groupedItems.entries()].map(([group, groupItems]) => (
              <SlashCommandMenu.Group key={group} heading={group}>
                {groupItems.map((item) => (
                  <SlashCommandMenu.Item
                    key={item.id}
                    value={item.id}
                    title={item.title}
                    description={item.description}
                    onSelect={item.onSelect}
                  />
                ))}
              </SlashCommandMenu.Group>
            ))}
          </SlashCommandMenu.List>
          <SlashCommandMenu.Empty>Sin resultados</SlashCommandMenu.Empty>
        </SlashCommandMenu.Content>
      )}
    </SlashCommandMenu>
  );
}
