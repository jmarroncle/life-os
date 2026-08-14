import { GenerateDocForm } from "@/components/generate-doc-form";

export default function GenerarPage() {
  return (
    <div className="space-y-4">
      <div className="space-y-1">
        <h1 className="text-lg font-semibold">Generar con IA</h1>
        <p className="text-sm text-neutral-500">
          Describí un tema y Claude arma un borrador en Markdown que después
          podés guardar como página y seguir editando.
        </p>
      </div>
      <GenerateDocForm />
    </div>
  );
}
