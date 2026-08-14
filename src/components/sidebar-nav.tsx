"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/data-center", label: "Data Center" },
  { href: "/libreta", label: "Libreta" },
  { href: "/finanzas", label: "Finanzas" },
  { href: "/reportes", label: "Reportes" },
  { href: "/foco", label: "Foco" },
];

export function SidebarNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {NAV_ITEMS.map((item) => {
        const isActive =
          item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={
              isActive
                ? "block rounded-md bg-neutral-900 px-2.5 py-1.5 text-sm font-medium text-white"
                : "block rounded-md px-2.5 py-1.5 text-sm text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900"
            }
          >
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
