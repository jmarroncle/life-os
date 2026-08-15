"use client";

import { useState } from "react";
import type { PageLayout } from "@/app/(app)/data-center/actions";

const LAYOUT_OPTIONS: { value: PageLayout; label: string }[] = [
  { value: "normal", label: "Normal" },
  { value: "columns-2", label: "2 columnas" },
  { value: "columns-3", label: "3 columnas" },
];

export function PageLayoutPicker({
  initialLayout,
  onLayoutChange,
}: {
  initialLayout: PageLayout;
  onLayoutChange: (layout: PageLayout) => Promise<void>;
}) {
  const [layout, setLayout] = useState(initialLayout);
  const [open, setOpen] = useState(false);

  function pick(next: PageLayout) {
    setLayout(next);
    setOpen(false);
    onLayoutChange(next);
  }

  const current = LAYOUT_OPTIONS.find((option) => option.value === layout);

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="rounded-md border border-neutral-200 px-2 py-1 text-xs text-neutral-500 hover:bg-neutral-100"
        title="Diseño de la página"
      >
        {current?.label ?? "Normal"}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setOpen(false)} />
          <div className="absolute right-0 z-20 mt-1 w-36 rounded-md border border-neutral-200 bg-white p-1 shadow-lg">
            {LAYOUT_OPTIONS.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => pick(option.value)}
                className={`block w-full rounded px-2 py-1 text-left text-xs hover:bg-neutral-100 ${
                  option.value === layout
                    ? "font-medium text-neutral-900"
                    : "text-neutral-600"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
