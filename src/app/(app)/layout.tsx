import { createClient } from "@/lib/supabase/server";
import { SidebarNav } from "@/components/sidebar-nav";
import { ThemeToggle } from "@/components/theme-toggle";

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
      <main className="flex-1 overflow-y-auto p-8">
        <div className="mx-auto max-w-3xl">{children}</div>
      </main>
    </div>
  );
}
