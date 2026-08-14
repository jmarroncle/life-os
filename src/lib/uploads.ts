"use server";

import { randomUUID } from "crypto";
import { createClient } from "@/lib/supabase/server";
import { requireUser } from "@/lib/auth";

const BUCKET = "life-os-uploads";

export async function uploadBlockImage(file: File) {
  const user = await requireUser();
  const supabase = await createClient();

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "png";
  const path = `${user.id}/${randomUUID()}.${ext}`;

  const { error } = await supabase.storage.from(BUCKET).upload(path, file, {
    contentType: file.type || undefined,
  });
  if (error) {
    throw new Error(`No se pudo subir la imagen: ${error.message}`);
  }

  const { data } = supabase.storage.from(BUCKET).getPublicUrl(path);
  return { src: data.publicUrl, alt: file.name };
}
