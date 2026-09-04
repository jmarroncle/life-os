import { createTeamMember, deleteTeamMember, listTeamMembers } from "./actions";
import { CopyLinkButton } from "@/components/copy-link-button";

export default async function EquipoPage() {
  const members = await listTeamMembers();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "";

  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Equipo</h1>
        <p className="text-sm text-neutral-500">
          Compañeros a los que les podés derivar una tarea (email + push). No
          tienen cuenta ni login en Life OS — activan las notificaciones con
          un link de un solo uso que les mandás vos.
        </p>
      </div>

      <form action={createTeamMember} className="flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          placeholder="Nombre…"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <input
          type="email"
          name="email"
          placeholder="Email…"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Agregar
        </button>
      </form>

      {members.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no agregaste a nadie.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {members.map((member) => {
            const activationLink = `${siteUrl}/activar/${member.activationToken}`;
            return (
              <li key={member.id} className="space-y-2 px-4 py-3 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{member.name}</p>
                    <p className="truncate text-xs text-neutral-400">{member.email}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {member.activatedAt ? (
                      <span className="rounded-full bg-green-50 px-2 py-0.5 text-xs text-green-700">
                        Notificaciones activadas
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs text-amber-700">
                        Pendiente de activar
                      </span>
                    )}
                    <form action={deleteTeamMember.bind(null, member.id)}>
                      <button
                        type="submit"
                        className="text-xs text-neutral-400 hover:text-red-600"
                      >
                        Eliminar
                      </button>
                    </form>
                  </div>
                </div>
                {!member.activatedAt && (
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={activationLink}
                      onFocus={(event) => event.target.select()}
                      className="min-w-0 flex-1 rounded-md border border-neutral-200 bg-neutral-50 px-2 py-1 text-xs text-neutral-500"
                    />
                    <CopyLinkButton link={activationLink} />
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
