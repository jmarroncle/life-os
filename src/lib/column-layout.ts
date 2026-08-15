import type { YooptaContentValue } from "@yoopta/editor";

export type GridPlacement = { gridColumn: string; gridRow: number };

// Agrupa los bloques de una página en "pilares" (columnas) a partir de sus
// encabezados de nivel 1, para el layout columns-N (ver pages.layout en el
// schema): todo lo que aparece antes del primer HeadingOne es la intro (va
// arriba, ancho completo); cada HeadingOne siguiente arranca una sección
// nueva; las primeras `numColumns` secciones se muestran una al lado de la
// otra; el resto vuelve a ancho completo, debajo de todas — así una página
// como el Home migrado de Notion (Home / Productos / Áreas en paralelo,
// Clientes / Espacio de trabajo abajo) queda igual sin un bloque de
// columnas editable a mano.
//
// Un HeadingOne sin ningún bloque debajo antes del próximo encabezado (un
// título suelto, sin contenido) no consume un lugar de pilar: se pega a la
// sección que ya estaba abierta, en vez de arrancar una columna vacía.
export function computeGridPlacements(
  value: YooptaContentValue,
  numColumns: number,
): Map<string, GridPlacement> {
  const blocks = Object.values(value).sort((a, b) => a.meta.order - b.meta.order);

  let section = 0;
  let sectionHasContent = false;
  const blockSections: { id: string; section: number }[] = [];

  for (const block of blocks) {
    if (block.type === "HeadingOne" && (section === 0 || sectionHasContent)) {
      section += 1;
      sectionHasContent = false;
    }
    blockSections.push({ id: block.id, section });
    if (block.type !== "HeadingOne") sectionHasContent = true;
  }

  const placements = new Map<string, GridPlacement>();

  const introBlocks = blockSections.filter((b) => b.section === 0);
  introBlocks.forEach((b, i) => {
    placements.set(b.id, { gridColumn: "1 / -1", gridRow: i + 1 });
  });
  const introRowCount = introBlocks.length;

  let maxPillarRow = introRowCount;
  for (let col = 1; col <= numColumns; col++) {
    const sectionBlocks = blockSections.filter((b) => b.section === col);
    sectionBlocks.forEach((b, i) => {
      const row = introRowCount + i + 1;
      placements.set(b.id, { gridColumn: String(col), gridRow: row });
      maxPillarRow = Math.max(maxPillarRow, row);
    });
  }

  const tailBlocks = blockSections.filter((b) => b.section > numColumns);
  tailBlocks.forEach((b, i) => {
    placements.set(b.id, { gridColumn: "1 / -1", gridRow: maxPillarRow + i + 1 });
  });

  return placements;
}
