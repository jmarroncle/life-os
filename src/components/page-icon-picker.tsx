"use client";

import { useState } from "react";

const EMOJI_OPTIONS = [
  "📄", "📝", "📋", "📌", "📁", "🗂️", "💡", "🎯",
  "🚀", "🔥", "⭐️", "✅", "📚", "🧠", "💻", "🛠️",
  "📊", "💰", "🎨", "🎵", "🧘", "☕️", "🔒", "🌐",
  "📅", "✍️", "🔬", "🧩", "🏠", "🎓", "🗺️", "🎬",
];

export function PageIconPicker({
  initialIcon,
  onIconChange,
}: {
  initialIcon: string | null;
  onIconChange: (icon: string | null) => Promise<void>;
}) {
  const [icon, setIcon] = useState(initialIcon);
  const [open, setOpen] = useState(false);
  const [customValue, setCustomValue] = useState("");

  function pick(next: string | null) {
    setIcon(next);
    setOpen(false);
    onIconChange(next);
  }

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="flex h-12 w-12 items-center justify-center rounded-md text-4xl hover:bg-neutral-100"
        title="Cambiar ícono"
      >
        {icon ?? "📄"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute z-20 mt-1 w-72 rounded-md border border-neutral-200 bg-white p-3 shadow-lg">
            <div className="grid grid-cols-8 gap-1">
              {EMOJI_OPTIONS.map((emoji) => (
                <button
                  key={emoji}
                  type="button"
                  onClick={() => pick(emoji)}
                  className="rounded p-1 text-xl hover:bg-neutral-100"
                >
                  {emoji}
                </button>
              ))}
            </div>

            <form
              onSubmit={(event) => {
                event.preventDefault();
                const trimmed = customValue.trim();
                if (trimmed) pick(trimmed);
                setCustomValue("");
              }}
              className="mt-2 flex gap-1 border-t border-neutral-100 pt-2"
            >
              <input
                type="text"
                value={customValue}
                onChange={(event) => setCustomValue(event.target.value)}
                placeholder="Pegar otro emoji…"
                className="flex-1 rounded border border-neutral-300 px-2 py-1 text-sm outline-none focus:border-neutral-500"
              />
              <button
                type="submit"
                className="rounded bg-neutral-900 px-2 py-1 text-xs font-medium text-white"
              >
                Usar
              </button>
            </form>

            {icon && (
              <button
                type="button"
                onClick={() => pick(null)}
                className="mt-2 w-full rounded px-2 py-1 text-left text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
              >
                Quitar ícono
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}
