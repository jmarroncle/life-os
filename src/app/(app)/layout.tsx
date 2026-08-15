import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UndoButton } from "@/components/undo-button";
import { MobileNav } from "@/components/mobile-nav";
import { undoLastAction } from "./undo-actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-1">
      {/* En mobile esta sidebar no se achica, se oculta entera — a los
          224px fijos (w-56) no le quedaba lugar al contenido en una
          pantalla angosta (confirmado: dejaba ~150px reales). MobileNav
          la reemplaza ahí con un botón de menú + el mismo SidebarNav
          como drawer. */}
      <aside className="hidden w-56 shrink-0 flex-col justify-between border-r border-neutral-200 bg-white p-4 md:flex">
        <div>
          <p className="mb-6 px-2.5 text-lg font-semibold tracking-tight">
            Life OS
          </p>
          <SidebarNav />
        </div>
        <div className="border-t border-neutral-100 pt-2">
          <ThemeToggle />
          {user && (
            <p className="truncate px-2.5 pt-1 text-xs text-neutral-400">
              {user.email}
            </p>
          )}
        </div>
      </aside>
      <main className="flex min-w-0 flex-1 flex-col overflow-y-auto">
        <div className="flex items-center justify-between gap-2 border-b border-neutral-100 bg-white px-4 py-2 md:justify-end md:px-8">
          <div className="flex items-center gap-2 md:hidden">
            <MobileNav userEmail={user?.email ?? null} />
            <span className="text-sm font-semibold tracking-tight">Life OS</span>
          </div>
          <UndoButton onUndo={undoLastAction} />
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 p-4 md:p-8">{children}</div>
      </main>
    </div>
  );
}
