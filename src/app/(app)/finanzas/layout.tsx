import Link from "next/link";

const TABS = [
  { href: "/finanzas", label: "Resumen" },
  { href: "/finanzas/movimientos", label: "Movimientos" },
  { href: "/finanzas/cuentas", label: "Cuentas" },
  { href: "/finanzas/categorias", label: "Categorías" },
  { href: "/finanzas/presupuestos", label: "Presupuestos" },
];

export default function FinanzasLayout({ children }: LayoutProps<"/finanzas">) {
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-1 border-b border-neutral-200">
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
