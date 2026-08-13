import { FocusAmbience } from "@/components/focus-ambience";
import { PomodoroTimer } from "@/components/pomodoro-timer";

export default function FocoPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Foco</h1>
      <PomodoroTimer />
      <FocusAmbience />
    </div>
  );
}
