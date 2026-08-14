"use client";

import { useEffect, useState } from "react";

const STORAGE_KEY = "life-os:theme";

type Theme = "light" | "dark";

function applyTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  window.localStorage.setItem(STORAGE_KEY, theme);
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setTheme(document.documentElement.dataset.theme === "dark" ? "dark" : "light");
  }, []);

  function toggle() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="flex w-full items-center justify-between rounded-md px-2.5 py-1.5 text-xs text-neutral-500 hover:bg-neutral-100 hover:text-neutral-900"
      title={theme === "dark" ? "Cambiar a tema claro" : "Cambiar a tema oscuro"}
    >
      <span>Tema</span>
      <span>{theme === "dark" ? "🌙 Oscuro" : "☀️ Claro"}</span>
    </button>
  );
}
