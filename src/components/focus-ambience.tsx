"use client";

import { useEffect, useState } from "react";
import { toEmbedUrl } from "@/lib/embed";

type PresetId = "none" | "forest" | "ocean" | "sunset" | "night";

const PRESETS: { id: PresetId; label: string; gradient: string }[] = [
  { id: "none", label: "Ninguno", gradient: "" },
  {
    id: "forest",
    label: "Bosque",
    gradient: "linear-gradient(160deg, #1f3d2b, #4c7a4f)",
  },
  {
    id: "ocean",
    label: "Océano",
    gradient: "linear-gradient(160deg, #0b3d5c, #3a8ea6)",
  },
  {
    id: "sunset",
    label: "Atardecer",
    gradient: "linear-gradient(160deg, #7a2e3d, #e08a4f)",
  },
  {
    id: "night",
    label: "Noche",
    gradient: "linear-gradient(160deg, #14142b, #3b2f63)",
  },
];

type Stored = {
  preset: PresetId;
  playlistInput: string;
  playlistEmbed: string | null;
  videoInput: string;
  videoEmbed: string | null;
};

const DEFAULT_STORED: Stored = {
  preset: "none",
  playlistInput: "",
  playlistEmbed: null,
  videoInput: "",
  videoEmbed: null,
};

const STORAGE_KEY = "life-os:foco-ambience";

function EmbedField({
  label,
  placeholder,
  value,
  embed,
  onSave,
}: {
  label: string;
  placeholder: string;
  value: string;
  embed: string | null;
  onSave: (raw: string) => void;
}) {
  const [input, setInput] = useState(value);
  const [invalid, setInvalid] = useState(false);

  function handleSave() {
    if (!input.trim()) {
      setInvalid(false);
      onSave("");
      return;
    }
    const result = toEmbedUrl(input);
    setInvalid(!result);
    if (result) onSave(input);
  }

  return (
    <div className="space-y-2">
      <p className="text-xs font-medium text-neutral-500">{label}</p>
      <div className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          placeholder={placeholder}
          className="flex-1 rounded-md border border-neutral-300 px-2 py-1 text-xs"
        />
        <button
          onClick={handleSave}
          type="button"
          className="rounded-md border border-neutral-300 px-3 py-1 text-xs"
        >
          Guardar
        </button>
      </div>
      {invalid && (
        <p className="text-xs text-red-500">
          No reconozco ese link — probá con uno de open.spotify.com o
          youtube.com.
        </p>
      )}
      {embed && (
        <iframe
          src={embed}
          className="h-28 w-full rounded-md border-0"
          allow="autoplay; encrypted-media; picture-in-picture"
          loading="lazy"
        />
      )}
    </div>
  );
}

export function FocusAmbience() {
  const [stored, setStored] = useState<Stored>(DEFAULT_STORED);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setStored({ ...DEFAULT_STORED, ...JSON.parse(raw) });
      }
    } catch {
      // localStorage no disponible o corrupto: se queda con los defaults
    }
  }, []);

  function persist(next: Partial<Stored>) {
    setStored((prev) => {
      const merged = { ...prev, ...next };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
      return merged;
    });
  }

  const activePreset = PRESETS.find((p) => p.id === stored.preset);

  return (
    <div className="space-y-4">
      {activePreset?.gradient && (
        <div
          className="fixed inset-0 -z-10"
          style={{ background: activePreset.gradient }}
          aria-hidden
        />
      )}

      <details className="text-sm text-neutral-500">
        <summary className="cursor-pointer select-none">Ambiente</summary>
        <div className="mt-3 space-y-4">
          <div className="flex flex-wrap gap-2">
            {PRESETS.map((preset) => (
              <button
                key={preset.id}
                type="button"
                onClick={() => persist({ preset: preset.id })}
                className={`rounded-md border px-3 py-1 text-xs ${
                  stored.preset === preset.id
                    ? "border-neutral-900 font-medium text-neutral-900"
                    : "border-neutral-300"
                }`}
              >
                {preset.label}
              </button>
            ))}
          </div>

          <EmbedField
            label="Playlist de audio (jazz, lo que quieras)"
            placeholder="Link de Spotify o YouTube…"
            value={stored.playlistInput}
            embed={stored.playlistEmbed}
            onSave={(raw) =>
              persist({
                playlistInput: raw,
                playlistEmbed: raw ? toEmbedUrl(raw) : null,
              })
            }
          />

          <EmbedField
            label="Video de fondo (yoga, naturaleza, lo que quieras)"
            placeholder="Link de YouTube…"
            value={stored.videoInput}
            embed={stored.videoEmbed}
            onSave={(raw) =>
              persist({
                videoInput: raw,
                videoEmbed: raw ? toEmbedUrl(raw) : null,
              })
            }
          />
        </div>
      </details>
    </div>
  );
}
