"use client";

import { useEffect, useState } from "react";

type Phase = "work" | "break" | "longBreak";

type Settings = {
  workMin: number;
  breakMin: number;
  longBreakMin: number;
  cyclesBeforeLongBreak: number;
};

const DEFAULT_SETTINGS: Settings = {
  workMin: 25,
  breakMin: 5,
  longBreakMin: 15,
  cyclesBeforeLongBreak: 4,
};

const STORAGE_KEY = "life-os:pomodoro";

const PHASE_LABEL: Record<Phase, string> = {
  work: "Foco",
  break: "Descanso",
  longBreak: "Descanso largo",
};

function phaseDuration(phase: Phase, settings: Settings) {
  if (phase === "work") return settings.workMin * 60;
  if (phase === "longBreak") return settings.longBreakMin * 60;
  return settings.breakMin * 60;
}

function loadStored(): { settings: Settings; completedToday: number } {
  if (typeof window === "undefined") {
    return { settings: DEFAULT_SETTINGS, completedToday: 0 };
  }
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { settings: DEFAULT_SETTINGS, completedToday: 0 };
    const parsed = JSON.parse(raw);
    const today = new Date().toDateString();
    return {
      settings: { ...DEFAULT_SETTINGS, ...parsed.settings },
      completedToday: parsed.date === today ? (parsed.completedToday ?? 0) : 0,
    };
  } catch {
    return { settings: DEFAULT_SETTINGS, completedToday: 0 };
  }
}

function persist(settings: Settings, completedToday: number) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    STORAGE_KEY,
    JSON.stringify({
      settings,
      completedToday,
      date: new Date().toDateString(),
    }),
  );
}

function formatTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60)
    .toString()
    .padStart(2, "0");
  const seconds = Math.floor(totalSeconds % 60)
    .toString()
    .padStart(2, "0");
  return `${minutes}:${seconds}`;
}

export function PomodoroTimer() {
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS);
  const [completedToday, setCompletedToday] = useState(0);
  const [phase, setPhase] = useState<Phase>("work");
  const [secondsLeft, setSecondsLeft] = useState(DEFAULT_SETTINGS.workMin * 60);
  const [isRunning, setIsRunning] = useState(false);

  // Hidratación desde localStorage: debe correr después del mount (no en
  // el render del servidor) para no pisar el HTML server-rendered.
  useEffect(() => {
    const stored = loadStored();
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSettings(stored.settings);
    setCompletedToday(stored.completedToday);
    setSecondsLeft(phaseDuration("work", stored.settings));
  }, []);

  useEffect(() => {
    if (!isRunning) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [isRunning]);

  useEffect(() => {
    if (secondsLeft !== 0 || !isRunning) return;
    advancePhase();
    if (
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "granted"
    ) {
      new Notification("Life OS", { body: `${PHASE_LABEL[phase]} terminado` });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [secondsLeft, isRunning]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    document.title = isRunning
      ? `${formatTime(secondsLeft)} · ${PHASE_LABEL[phase]} — Life OS`
      : "Life OS";
  }, [secondsLeft, isRunning, phase]);

  function advancePhase() {
    setIsRunning(false);
    if (phase === "work") {
      const newCompleted = completedToday + 1;
      setCompletedToday(newCompleted);
      persist(settings, newCompleted);
      const nextPhase: Phase =
        newCompleted % settings.cyclesBeforeLongBreak === 0
          ? "longBreak"
          : "break";
      setPhase(nextPhase);
      setSecondsLeft(phaseDuration(nextPhase, settings));
    } else {
      setPhase("work");
      setSecondsLeft(phaseDuration("work", settings));
    }
  }

  function handleStartPause() {
    if (
      !isRunning &&
      typeof window !== "undefined" &&
      "Notification" in window &&
      Notification.permission === "default"
    ) {
      Notification.requestPermission();
    }
    setIsRunning((prev) => !prev);
  }

  function handleReset() {
    setIsRunning(false);
    setPhase("work");
    setSecondsLeft(phaseDuration("work", settings));
  }

  function updateSetting(key: keyof Settings, value: number) {
    if (Number.isNaN(value) || value <= 0) return;
    const next = { ...settings, [key]: value };
    setSettings(next);
    persist(next, completedToday);
    if (!isRunning) {
      setSecondsLeft(phaseDuration(phase, next));
    }
  }

  return (
    <div className="mx-auto max-w-sm space-y-6 text-center">
      <p className="text-sm font-medium text-neutral-500">
        {PHASE_LABEL[phase]} · {completedToday} pomodoro
        {completedToday === 1 ? "" : "s"} hoy
      </p>

      <p className="font-mono text-6xl font-semibold tabular-nums">
        {formatTime(secondsLeft)}
      </p>

      <div className="flex justify-center gap-2">
        <button
          onClick={handleStartPause}
          className="rounded-md bg-neutral-900 px-6 py-2 text-sm font-medium text-white"
        >
          {isRunning ? "Pausar" : "Iniciar"}
        </button>
        <button
          onClick={advancePhase}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          Saltar
        </button>
        <button
          onClick={handleReset}
          className="rounded-md border border-neutral-300 px-4 py-2 text-sm font-medium"
        >
          Reiniciar
        </button>
      </div>

      <details className="text-left text-sm text-neutral-500">
        <summary className="cursor-pointer select-none text-center">
          Configurar duraciones
        </summary>
        <div className="mt-3 grid grid-cols-2 gap-3">
          <label className="space-y-1">
            <span className="block text-xs">Foco (min)</span>
            <input
              type="number"
              min={1}
              value={settings.workMin}
              onChange={(event) =>
                updateSetting("workMin", Number(event.target.value))
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs">Descanso (min)</span>
            <input
              type="number"
              min={1}
              value={settings.breakMin}
              onChange={(event) =>
                updateSetting("breakMin", Number(event.target.value))
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs">Descanso largo (min)</span>
            <input
              type="number"
              min={1}
              value={settings.longBreakMin}
              onChange={(event) =>
                updateSetting("longBreakMin", Number(event.target.value))
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="block text-xs">Ciclos por descanso largo</span>
            <input
              type="number"
              min={1}
              value={settings.cyclesBeforeLongBreak}
              onChange={(event) =>
                updateSetting("cyclesBeforeLongBreak", Number(event.target.value))
              }
              className="w-full rounded-md border border-neutral-300 px-2 py-1 text-sm"
            />
          </label>
        </div>
      </details>
    </div>
  );
}
