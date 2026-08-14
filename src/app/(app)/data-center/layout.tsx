import Link from "next/link";

const TABS = [
  { href: "/data-center", label: "Páginas" },
  { href: "/data-center/tareas", label: "Tareas" },
  { href: "/data-center/calendario", label: "Calendario" },
  { href: "/data-center/generar", label: "Generar con IA" },
];

export default function DataCenterLayout({ children }: LayoutProps<"/data-center">) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-1 border-b border-neutral-200">
        {TABS.map((tab) => (
          <Link
            key={tab.href}
            href={tab.href}
            className="border-b-2 border-transparent px-3 py-2 text-sm text-neutral-600 hover:border-neutral-300 hover:text-neutral-900"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      {children}
    </div>
  );
}
