"use client";

import { useState } from "react";

function urlBase64ToUint8Array(base64String: string): Uint8Array {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  return Uint8Array.from([...rawData].map((char) => char.charCodeAt(0)));
}

type Status = "idle" | "requesting" | "done" | "error" | "unsupported";

export function ActivationFlow({ token }: { token: string }) {
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  async function activate() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    setStatus("requesting");
    try {
      await navigator.serviceWorker.register("/sw.js");
      // register() resuelve apenas arranca la instalación, no cuando el
      // service worker ya está activo — suscribir antes de eso tira
      // "no active Service Worker" en el primer visit (confirmado
      // probándolo). .ready espera a que haya uno activo de verdad.
      const registration = await navigator.serviceWorker.ready;
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setErrorMessage("No diste permiso de notificaciones — sin eso no puedo mandarte avisos.");
        setStatus("error");
        return;
      }

      const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!publicKey) throw new Error("Falta configurar la clave pública VAPID.");

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(publicKey) as BufferSource,
      });

      const response = await fetch("/api/team/activate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, subscription: subscription.toJSON() }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data.error ?? "No se pudo activar.");
      }

      setStatus("done");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Algo salió mal.");
      setStatus("error");
    }
  }

  if (status === "done") {
    return (
      <p className="text-sm text-green-700">
        ¡Listo! Vas a recibir notificaciones en este navegador.
      </p>
    );
  }

  if (status === "unsupported") {
    return (
      <p className="text-sm text-amber-700">
        Este navegador no soporta notificaciones push. Probá desde Chrome o
        desde el navegador de tu celular (en iPhone, agregando la página a
        la pantalla de inicio primero).
      </p>
    );
  }

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={activate}
        disabled={status === "requesting"}
        className="rounded-md bg-neutral-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
      >
        {status === "requesting" ? "Activando…" : "Activar notificaciones"}
      </button>
      {status === "error" && <p className="text-sm text-red-600">{errorMessage}</p>}
    </div>
  );
}
