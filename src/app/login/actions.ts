"use server";

import { createClient } from "@/lib/supabase/server";

export type MagicLinkState = {
  status: "idle" | "sent" | "error";
  message?: string;
};

export async function sendMagicLink(
  _prevState: MagicLinkState,
  formData: FormData,
): Promise<MagicLinkState> {
  const email = String(formData.get("email") ?? "").trim();
  const next = String(formData.get("next") ?? "").trim();

  if (!email) {
    return { status: "error", message: "Ingresá un email." };
  }

  const callbackUrl = new URL(`${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`);
  if (next.startsWith("/")) callbackUrl.searchParams.set("next", next);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: callbackUrl.toString(),
    },
  });

  if (error) {
    return { status: "error", message: error.message };
  }

  return { status: "sent", message: `Te mandamos un link a ${email}.` };
}
