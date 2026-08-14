"use client";

import { useState, useTransition, type DragEvent } from "react";
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

function getDescendantIds(items: PageTreeItem[], rootId: string): Set<string> {
  const descendants = new Set<string>();
  const queue = [rootId];
  while (queue.length > 0) {
    const current = queue.shift()!;
    for (const item of items) {
      if (item.parentId === current && !descendants.has(item.id)) {
        descendants.add(item.id);
        queue.push(item.id);
      }
    }
  }
  return descendants;
}

type CreatePageAction = (
  parentId: string | null,
  formData: FormData,
) => void | Promise<void>;
type MovePageAction = (id: string, newParentId: string | null) => void | Promise<void>;

export function PageTree({
  initialItems,
  createPage,
  movePage,
}: {
  initialItems: PageTreeItem[];
  createPage: CreatePageAction;
  movePage: MovePageAction;
}) {
  const [items, setItems] = useState(initialItems);
  const [, startTransition] = useTransition();
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | "root" | null>(null);

  const blockedDropIds = draggingId
    ? new Set([draggingId, ...getDescendantIds(items, draggingId)])
    : new Set<string>();

  function handleDrop(targetId: string | null) {
    const id = draggingId;
    setDraggingId(null);
    setOverId(null);
    if (!id) return;
    if (targetId !== null && blockedDropIds.has(targetId)) return;

    const current = items.find((item) => item.id === id);
    if (!current || current.parentId === targetId) return;

    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, parentId: targetId } : item)),
    );
    startTransition(() => {
      movePage(id, targetId);
    });
  }

  const tree = buildTree(items, null);

  return (
    <div className="space-y-1">
      {draggingId && (
        <div
          onDragOver={(event) => {
            event.preventDefault();
            setOverId("root");
          }}
          onDragLeave={() =>
            setOverId((prev) => (prev === "root" ? null : prev))
          }
          onDrop={(event) => {
            event.preventDefault();
            handleDrop(null);
          }}
          className={
            overId === "root"
              ? "rounded-md border border-dashed border-neutral-400 bg-neutral-100 px-2 py-1.5 text-xs text-neutral-600"
              : "rounded-md border border-dashed border-neutral-200 px-2 py-1.5 text-xs text-neutral-400"
          }
        >
          Soltar acá para mover al nivel raíz
        </div>
      )}

      {tree.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no creaste ninguna página.
        </p>
      ) : (
        tree.map((node) => (
          <PageNode
            key={node.id}
            node={node}
            depth={0}
            createPage={createPage}
            draggingId={draggingId}
            overId={overId}
            blockedDropIds={blockedDropIds}
            onDragStart={setDraggingId}
            onDragEnd={() => {
              setDraggingId(null);
              setOverId(null);
            }}
            onDragEnterNode={setOverId}
            onDropOnNode={handleDrop}
          />
        ))
      )}
    </div>
  );
}

function PageNode({
  node,
  depth,
  createPage,
  draggingId,
  overId,
  blockedDropIds,
  onDragStart,
  onDragEnd,
  onDragEnterNode,
  onDropOnNode,
}: {
  node: TreeNode;
  depth: number;
  createPage: CreatePageAction;
  draggingId: string | null;
  overId: string | "root" | null;
  blockedDropIds: Set<string>;
  onDragStart: (id: string) => void;
  onDragEnd: () => void;
  onDragEnterNode: (id: string) => void;
  onDropOnNode: (id: string) => void;
}) {
  const pathname = usePathname();
  const [expanded, setExpanded] = useState(true);
  const [addingChild, setAddingChild] = useState(false);
  const isActive = pathname === `/data-center/paginas/${node.id}`;
  const hasChildren = node.children.length > 0;
  const isDragging = draggingId === node.id;
  const isBlockedTarget = blockedDropIds.has(node.id);
  const isDropTarget = overId === node.id && !isBlockedTarget;

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (isBlockedTarget) return;
    event.preventDefault();
    onDragEnterNode(node.id);
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    onDropOnNode(node.id);
  }

  return (
    <div>
      <div
        draggable
        onDragStart={(event) => {
          event.dataTransfer.effectAllowed = "move";
          onDragStart(node.id);
        }}
        onDragEnd={onDragEnd}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={
          "group flex items-center gap-1 rounded-md py-0.5 pr-1 hover:bg-neutral-100" +
          (isDragging ? " opacity-40" : "") +
          (isDropTarget ? " bg-blue-50 ring-1 ring-inset ring-blue-300" : "")
        }
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
          draggable={false}
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
              draggingId={draggingId}
              overId={overId}
              blockedDropIds={blockedDropIds}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              onDragEnterNode={onDragEnterNode}
              onDropOnNode={onDropOnNode}
            />
          ))}
        </div>
      )}
    </div>
  );
}
