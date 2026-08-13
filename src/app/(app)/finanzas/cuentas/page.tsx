import { createAccount, listAccounts } from "../actions";

const TYPE_LABEL: Record<string, string> = {
  cash: "Efectivo",
  bank: "Banco",
  card: "Tarjeta",
  other: "Otro",
};

export default async function CuentasPage() {
  const items = await listAccounts();

  return (
    <div className="space-y-6">
      <form action={createAccount} className="flex flex-wrap gap-2">
        <input
          type="text"
          name="name"
          placeholder="Nombre de la cuenta…"
          required
          className="flex-1 rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
        />
        <select
          name="type"
          className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          defaultValue="bank"
        >
          {Object.entries(TYPE_LABEL).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        <button
          type="submit"
          className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white"
        >
          Crear cuenta
        </button>
      </form>

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no creaste ninguna cuenta.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((account) => (
            <li
              key={account.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span>{account.name}</span>
              <span className="text-xs text-neutral-400">
                {TYPE_LABEL[account.type]}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
