import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

const NAV_ITEMS = [
  { href: "/", label: "Inicio" },
  { href: "/data-center", label: "Data Center" },
  { href: "/libreta", label: "Libreta" },
  { href: "/finanzas", label: "Finanzas" },
  { href: "/foco", label: "Foco" },
];

export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="flex min-h-screen flex-1">
      <aside className="flex w-56 flex-col justify-between border-r border-neutral-200 bg-white p-4">
        <div>
          <p className="mb-6 px-2 text-lg font-semibold">Life OS</p>
          <nav className="space-y-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="block rounded-md px-2 py-1.5 text-sm text-neutral-700 hover:bg-neutral-100"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
        {user && (
          <p className="truncate px-2 text-xs text-neutral-400">
            {user.email}
          </p>
        )}
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
