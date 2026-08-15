"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";

// El <aside> de layout.tsx (la sidebar de desktop) se oculta por completo
// en mobile (md:hidden) — esto es lo que la reemplaza ahí: un botón de
// menú en la barra superior que abre el mismo SidebarNav como drawer.
export function MobileNav({ userEmail }: { userEmail: string | null }) {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  // Cerrar el drawer al navegar — sin esto, tocar un link lo deja abierto
  // tapando la página de destino hasta un segundo toque.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setOpen(false);
  }, [pathname]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-8 w-8 items-center justify-center rounded-md text-lg text-neutral-600 hover:bg-neutral-100"
        aria-label="Abrir menú"
      >
        ☰
      </button>

      {open && (
        <div className="fixed inset-0 z-40">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setOpen(false)}
          />
          <div className="relative flex h-full w-64 max-w-[80vw] flex-col justify-between border-r border-neutral-200 bg-white p-4">
            <div>
              <div className="mb-6 flex items-center justify-between px-2.5">
                <p className="text-lg font-semibold tracking-tight">Life OS</p>
                <button
                  type="button"
                  onClick={() => setOpen(false)}
                  className="text-neutral-400 hover:text-neutral-900"
                  aria-label="Cerrar menú"
                >
                  ✕
                </button>
              </div>
              <SidebarNav />
            </div>
            <div className="border-t border-neutral-100 pt-2">
              <ThemeToggle />
              {userEmail && (
                <p className="truncate px-2.5 pt-1 text-xs text-neutral-400">
                  {userEmail}
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
