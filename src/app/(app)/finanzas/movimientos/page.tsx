import { listAccounts, listCategories } from "../actions";
import { createTransaction, deleteTransaction, listTransactions } from "./actions";
import { formatCents } from "@/lib/money";

export default async function MovimientosPage() {
  const [items, accountsList, categoriesList] = await Promise.all([
    listTransactions(),
    listAccounts(),
    listCategories(),
  ]);

  return (
    <div className="space-y-6">
      {accountsList.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Primero creá una cuenta en la pestaña &quot;Cuentas&quot; para poder
          cargar movimientos.
        </p>
      ) : (
        <form
          action={createTransaction}
          className="grid grid-cols-2 gap-2 sm:grid-cols-6"
        >
          <select
            name="kind"
            defaultValue="expense"
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          >
            <option value="expense">Gasto</option>
            <option value="income">Ingreso</option>
          </select>
          <input
            type="number"
            name="amount"
            step="0.01"
            min="0"
            placeholder="Monto"
            required
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
          <select
            name="accountId"
            required
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          >
            {accountsList.map((account) => (
              <option key={account.id} value={account.id}>
                {account.name}
              </option>
            ))}
          </select>
          <select
            name="categoryId"
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          >
            <option value="">Sin categoría</option>
            {categoriesList.map((category) => (
              <option key={category.id} value={category.id}>
                {category.name}
              </option>
            ))}
          </select>
          <input
            type="date"
            name="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
            className="rounded-md border border-neutral-300 px-2 py-2 text-sm"
          />
          <input
            type="text"
            name="description"
            placeholder="Descripción (opcional)"
            className="col-span-2 rounded-md border border-neutral-300 px-2 py-2 text-sm sm:col-span-1"
          />
          <button
            type="submit"
            className="col-span-2 rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white sm:col-span-6"
          >
            Agregar movimiento
          </button>
        </form>
      )}

      {items.length === 0 ? (
        <p className="text-sm text-neutral-500">
          Todavía no cargaste ningún movimiento.
        </p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-md border border-neutral-200">
          {items.map((tx) => (
            <li
              key={tx.id}
              className="flex items-center justify-between gap-3 px-4 py-3 text-sm"
            >
              <div className="min-w-0">
                <p className="truncate">
                  {tx.description || tx.categoryName || "Sin descripción"}
                </p>
                <p className="text-xs text-neutral-400">
                  {new Date(tx.occurredAt).toLocaleDateString("es-AR")} ·{" "}
                  {tx.accountName}
                  {tx.categoryName ? ` · ${tx.categoryName}` : ""}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span
                  className={
                    tx.amountCents < 0 ? "text-red-600" : "text-green-700"
                  }
                >
                  {formatCents(tx.amountCents)}
                </span>
                <form action={deleteTransaction.bind(null, tx.id)}>
                  <button
                    type="submit"
                    className="text-neutral-300 hover:text-red-500"
                    aria-label="Eliminar movimiento"
                  >
                    ×
                  </button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
