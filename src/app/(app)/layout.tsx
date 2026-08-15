import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";
import { UndoButton } from "@/components/undo-button";
import { undoLastAction } from "./undo-actions";

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-56 shrink-0 flex-col justify-between border-r border-neutral-200 bg-white p-4">
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
      <main className="flex flex-1 flex-col overflow-y-auto">
        <div className="flex justify-end border-b border-neutral-100 bg-white px-8 py-2">
          <UndoButton onUndo={undoLastAction} />
        </div>
        <div className="mx-auto w-full max-w-3xl flex-1 p-8">{children}</div>
      </main>
    </div>
  );
}
