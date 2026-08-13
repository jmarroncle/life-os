import { PomodoroTimer } from "@/components/pomodoro-timer";

export default function FocoPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Foco</h1>
        <p className="text-sm text-neutral-500">
          Playlist de jazz y fondos de yoga/concentración se suman en la
          Fase 2.
        </p>
      </div>
      <PomodoroTimer />
    </div>
  );
}
