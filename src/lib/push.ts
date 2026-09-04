import webpush from "web-push";

let configured = false;

function ensureConfigured() {
  if (configured) return;
  webpush.setVapidDetails(
    process.env.VAPID_SUBJECT!,
    process.env.VAPID_PUBLIC_KEY!,
    process.env.VAPID_PRIVATE_KEY!,
  );
  configured = true;
}

export type PushSubscriptionJson = {
  endpoint: string;
  keys: { p256dh: string; auth: string };
};

// No tira si falla — una notificación push perdida no debería romper el
// flujo de "derivar tarea" (el email es el canal que sí confirma
// entrega). El caller decide qué hacer con el resultado (ej. limpiar
// una suscripción vencida).
export async function sendPushNotification(
  subscription: PushSubscriptionJson,
  payload: { title: string; body: string; url: string },
): Promise<{ ok: boolean; expired: boolean }> {
  ensureConfigured();
  try {
    await webpush.sendNotification(
      subscription as never,
      JSON.stringify(payload),
    );
    return { ok: true, expired: false };
  } catch (error) {
    const statusCode = (error as { statusCode?: number }).statusCode;
    return { ok: false, expired: statusCode === 404 || statusCode === 410 };
  }
}
