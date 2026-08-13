"use client";

import { useActionState } from "react";
import { sendMagicLink, type MagicLinkState } from "./actions";

const initialState: MagicLinkState = { status: "idle" };

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(
    sendMagicLink,
    initialState,
  );

  return (
    <main className="flex flex-1 items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div className="space-y-1 text-center">
          <h1 className="text-2xl font-semibold">Life OS</h1>
          <p className="text-sm text-neutral-500">
            Ingresá con un magic link a tu email.
          </p>
        </div>

        <form action={formAction} className="space-y-3">
          <input
            type="email"
            name="email"
            placeholder="vos@tuemail.com"
            required
            className="w-full rounded-md border border-neutral-300 px-3 py-2 text-sm outline-none focus:border-neutral-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="w-full rounded-md bg-neutral-900 px-3 py-2 text-sm font-medium text-white disabled:opacity-50"
          >
            {pending ? "Enviando…" : "Enviar magic link"}
          </button>
        </form>

        {state.message && (
          <p
            className={`text-center text-sm ${
              state.status === "error" ? "text-red-600" : "text-neutral-600"
            }`}
          >
            {state.message}
          </p>
        )}
      </div>
    </main>
  );
}
