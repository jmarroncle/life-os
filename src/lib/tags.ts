export function parseTags(raw: string): string[] {
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((tag) => tag.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}
