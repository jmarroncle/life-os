import { getMcpOverview, listMcpCalls } from "./actions";

function StatCard({
  label,
  count,
  errors,
  tokensIn,
  tokensOut,
}: {
  label: string;
  count: number;
  errors: number;
  tokensIn: number;
  tokensOut: number;
}) {
  return (
    <div className="rounded-md border border-neutral-200 p-4">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className="text-xl font-semibold">{count}</p>
      <p className="mt-1 text-xs text-neutral-400">
        {errors > 0 ? (
          <span className="text-red-600">{errors} con error</span>
        ) : (
          "sin errores"
        )}
        {" · "}
        {(tokensIn + tokensOut).toLocaleString("es-AR")} tokens (est.)
      </p>
    </div>
  );
}

export default async function McpReportPage() {
  const [overview, recentCalls] = await Promise.all([
    getMcpOverview(),
    listMcpCalls(50),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-xl font-semibold">Actividad del MCP</h1>
        <p className="text-sm text-neutral-500">
          Un registro por cada llamada que hace un chat conectado (claude.ai,
          Claude Desktop, Claude Code) al servidor MCP de Life OS.
        </p>
        <p className="mt-1 text-xs text-neutral-400">
          Los tokens son una estimación (~4 caracteres por token sobre el
          pedido y la respuesta de cada llamada) — no el conteo real del
          tokenizer de Claude, que no es público. Sirve para ver magnitud de
          uso, no para un costo exacto.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">Volumen</h2>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <StatCard label="Últimas 24 h" {...overview.last24h} />
          <StatCard label="Últimos 7 días" {...overview.last7d} />
          <StatCard label="Últimos 30 días" {...overview.last30d} />
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Por herramienta (últimos 30 días)
        </h2>
        {overview.byTool.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no hay llamadas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
                  <th className="px-3 py-2">Herramienta</th>
                  <th className="px-3 py-2">Llamadas</th>
                  <th className="px-3 py-2">Errores</th>
                  <th className="px-3 py-2">Duración media</th>
                  <th className="px-3 py-2">Tokens in</th>
                  <th className="px-3 py-2">Tokens out</th>
                </tr>
              </thead>
              <tbody>
                {overview.byTool.map((row) => (
                  <tr key={row.toolName} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-3 py-2 font-mono text-xs">{row.toolName}</td>
                    <td className="px-3 py-2">{row.count}</td>
                    <td className="px-3 py-2">
                      {row.errors > 0 ? (
                        <span className="text-red-600">{row.errors}</span>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{row.avgDurationMs} ms</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {row.tokensIn.toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">
                      {row.tokensOut.toLocaleString("es-AR")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-medium text-neutral-500">
          Últimas {recentCalls.length} llamadas
        </h2>
        {recentCalls.length === 0 ? (
          <p className="text-sm text-neutral-500">
            Todavía no hay llamadas registradas.
          </p>
        ) : (
          <div className="overflow-x-auto rounded-md border border-neutral-200">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b border-neutral-200 bg-neutral-50 text-xs font-medium text-neutral-500">
                  <th className="px-3 py-2">Cuándo</th>
                  <th className="px-3 py-2">Herramienta</th>
                  <th className="px-3 py-2">Estado</th>
                  <th className="px-3 py-2">Duración</th>
                  <th className="px-3 py-2">Tokens (in/out)</th>
                  <th className="px-3 py-2">Resumen</th>
                </tr>
              </thead>
              <tbody>
                {recentCalls.map((call) => (
                  <tr key={call.id} className="border-b border-neutral-100 last:border-b-0">
                    <td className="px-3 py-2 whitespace-nowrap text-xs text-neutral-500">
                      {new Date(call.createdAt).toLocaleString("es-AR")}
                    </td>
                    <td className="px-3 py-2 font-mono text-xs">{call.toolName}</td>
                    <td className="px-3 py-2">
                      {call.success ? (
                        <span className="text-green-700">✓</span>
                      ) : (
                        <span className="text-red-600">✕</span>
                      )}
                    </td>
                    <td className="px-3 py-2 text-neutral-500">{call.durationMs} ms</td>
                    <td className="px-3 py-2 text-neutral-500">
                      {call.estimatedTokensIn.toLocaleString("es-AR")} /{" "}
                      {call.estimatedTokensOut.toLocaleString("es-AR")}
                    </td>
                    <td className="max-w-xs truncate px-3 py-2 text-xs text-neutral-400">
                      {call.summary}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
