"use server";

import Anthropic from "@anthropic-ai/sdk";
import { requireUser } from "@/lib/auth";

export type GenerateDocState = {
  status: "idle" | "done" | "error";
  title: string;
  markdown: string;
  message?: string;
};

export async function generateMarkdown(
  _prevState: GenerateDocState,
  formData: FormData,
): Promise<GenerateDocState> {
  await requireUser();
  const prompt = String(formData.get("prompt") ?? "").trim();

  if (!prompt) {
    return {
      status: "error",
      title: "",
      markdown: "",
      message: "Escribí un tema primero.",
    };
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return {
      status: "error",
      title: "",
      markdown: "",
      message: "Falta ANTHROPIC_API_KEY en las variables de entorno.",
    };
  }

  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

  const response = await anthropic.messages.create({
    model: "claude-opus-5",
    max_tokens: 4096,
    output_config: { effort: "low" },
    messages: [
      {
        role: "user",
        content: `Escribí documentación técnica clara y concisa en Markdown sobre lo siguiente:\n\n${prompt}\n\nEmpezá con un título de nivel 1 ("# ...") y seguí con el contenido. Devolvé únicamente el Markdown, sin explicaciones antes o después.`,
      },
    ],
  });

  if (response.stop_reason === "refusal") {
    return {
      status: "error",
      title: "",
      markdown: "",
      message: "El modelo no pudo generar contenido para ese pedido.",
    };
  }

  const text = response.content
    .map((block) => (block.type === "text" ? block.text : ""))
    .join("")
    .trim();

  if (!text) {
    return {
      status: "error",
      title: "",
      markdown: "",
      message: "No se generó contenido. Probá de nuevo.",
    };
  }

  const firstLine = text.split("\n")[0] ?? "";
  const title = firstLine.replace(/^#+\s*/, "").trim() || "Documento generado";

  return { status: "done", title, markdown: text };
}
