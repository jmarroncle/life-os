import Link from "next/link";

const TABS = [
  { href: "/reportes", label: "Resumen" },
  { href: "/reportes/mcp", label: "MCP" },
];

export default function ReportesLayout({ children }: LayoutProps<"/reportes">) {
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
      </div>
      {children}
    </div>
  );
}
