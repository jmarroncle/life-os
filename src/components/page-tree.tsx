"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export type PageTreeItem = {
  id: string;
  parentId: string | null;
  title: string;
  updatedAt: Date;
};

type TreeNode = PageTreeItem & { children: TreeNode[] };

function buildTree(items: PageTreeItem[], parentId: string | null): TreeNode[] {
  return items
    .filter((item) => item.parentId === parentId)
    .map((item) => ({ ...item, children: buildTree(items, item.id) }));
}

type CreatePageAction = (
  parentId: string | null,
  formData: FormData,
) => void | Promise<void>;

export function PageTree({
  items,
  createPage,
}: {
  items: PageTreeItem[];
  createPage: CreatePageAction;
}) {
  const tree = buildTree(items, null);

  if (tree.length === 0) {
    return (
      <p className="text-sm text-neutral-500">
        Todavía no creaste ninguna página.
      </p>
    );
  }

  return (
    <div className="space-y-0.5">
      {tree.map((node) => (
        <PageNode key={node.id} node={node} depth={0} createPage={createPage} />
      ))}
    </div>
  );
}

function PageNode({
  node,
  depth,
  createPage,
}: {
  node: TreeNode;
  depth: number;
  createPage: CreatePageAction;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const isActive = pathname === `/data-center/paginas/${node.id}`;
  const hasChildren = node.children.length > 0;

  return (
    <div>
      <div
        className="group flex items-center gap-1 rounded-md py-0.5 pr-1 hover:bg-neutral-100"
        style={{ paddingLeft: depth * 16 }}
      >
        <button
          type="button"
          onClick={() => setExpanded((prev) => !prev)}
          className="w-4 shrink-0 text-xs text-neutral-400"
          aria-label={expanded ? "Colapsar" : "Expandir"}
        >
          {hasChildren ? (expanded ? "▾" : "▸") : ""}
        </button>
        <Link
          href={`/data-center/paginas/${node.id}`}
          className={
            isActive
              ? "flex-1 truncate rounded px-1.5 py-1 text-sm font-medium text-neutral-900"
              : "flex-1 truncate rounded px-1.5 py-1 text-sm text-neutral-700"
          }
        >
          {node.title}
        </Link>
        <button
          type="button"
          onClick={() => {
            setAddingChild(true);
            setExpanded(true);
          }}
          className="hidden shrink-0 rounded px-1.5 text-xs text-neutral-400 hover:bg-neutral-200 hover:text-neutral-900 group-hover:block"
          aria-label="Agregar subpágina"
          title="Agregar subpágina"
        >
          +
        </button>
      </div>

      {addingChild && (
        <form
          action={createPage.bind(null, node.id)}
          style={{ paddingLeft: (depth + 1) * 16 }}
          className="flex gap-1 py-1 pr-1"
        >
          <input
            autoFocus
            type="text"
            name="title"
            placeholder="Título de la subpágina…"
            className="flex-1 rounded border border-neutral-300 px-2 py-1 text-xs outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white"
          >
            Crear
          </button>
          <button
            type="button"
            onClick={() => setAddingChild(false)}
            className="rounded px-2 py-1 text-xs text-neutral-500 hover:text-neutral-900"
          >
            Cancelar
          </button>
        </form>
      )}

      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <PageNode
              key={child.id}
              node={child}
              depth={depth + 1}
              createPage={createPage}
            />
          ))}
        </div>
      )}
    </div>
  );
}
