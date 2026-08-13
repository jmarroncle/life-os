/**
 * Convierte un link normal de Spotify o YouTube (el que copiás del botón
 * "Compartir") a su URL de embed. Devuelve null si no reconoce el link.
 */
export function toEmbedUrl(raw: string): string | null {
  let url: URL;
  try {
    url = new URL(raw.trim());
  } catch {
    return null;
  }

  if (url.hostname.includes("open.spotify.com")) {
    const parts = url.pathname.split("/").filter(Boolean);
    if (parts[0] === "embed") return url.toString();
    if (parts.length >= 2) {
      return `https://open.spotify.com/embed/${parts[0]}/${parts[1]}`;
    }
    return null;
  }

  if (url.hostname.includes("youtube.com") || url.hostname === "youtu.be") {
    if (url.hostname === "youtu.be") {
      const id = url.pathname.slice(1);
      return id ? `https://www.youtube.com/embed/${id}` : null;
    }
    if (url.pathname.startsWith("/embed/")) return url.toString();
    const videoId = url.searchParams.get("v");
    if (videoId) return `https://www.youtube.com/embed/${videoId}`;
    const listId = url.searchParams.get("list");
    if (listId) return `https://www.youtube.com/embed/videoseries?list=${listId}`;
    return null;
  }

  return null;
}
