import { getTeamMemberByToken } from "./actions";
import { ActivationFlow } from "@/components/activation-flow";

export default async function ActivarPage({
  params,
}: PageProps<"/activar/[token]">) {
  const { token } = await params;
  const member = await getTeamMemberByToken(token);

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-xl font-semibold">Life OS</h1>
        {!member ? (
          <p className="text-sm text-neutral-500">
            Este link no es válido — pedile a quien te lo mandó que te pase
            uno nuevo.
          </p>
        ) : (
          <>
            <p className="text-sm text-neutral-500">
              Hola {member.name} — activá las notificaciones para recibir las
              tareas que te deriven acá (en este navegador) y por email.
            </p>
            {member.activatedAt ? (
              <p className="text-sm text-green-700">
                Ya activaste las notificaciones en algún momento — podés
                volver a activarlas si cambiaste de navegador o de celular.
              </p>
            ) : null}
            <div className="flex justify-center">
              <ActivationFlow token={token} />
            </div>
          </>
        )}
      </div>
    </main>
  );
}
