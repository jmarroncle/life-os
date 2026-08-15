import Link from "next/link";
import { listDraftItems } from "./revisar/actions";

const TABS = [
  { href: "/data-center", label: "Páginas" },
  { href: "/data-center/tareas", label: "Tareas" },
  { href: "/data-center/calendario", label: "Calendario" },
  { href: "/data-center/generar", label: "Generar con IA" },
];

export default async function DataCenterLayout({
  children,
}: LayoutProps<"/data-center">) {
  const draftItems = await listDraftItems();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 overflow-x-auto border-b border-neutral-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="shrink-0 border-b-2 border-transparent px-3 py-2 text-sm whitespace-nowrap text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
          >
            {tab.label}
          </Link>
        ))}
        <Link
          href="/data-center/revisar"
          className="flex items-center gap-1.5 border-b-2 border-transparent px-3 py-2 text-sm text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
        >
          Por revisar
          {draftItems.length > 0 && (
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-white">
              {draftItems.length}
            </span>
          )}
        </Link>
      </div>
      {children}
    </div>
  );
}
