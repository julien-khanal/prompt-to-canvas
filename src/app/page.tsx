import { CanvasShell } from "@/components/canvas/CanvasShell";
import { PromptBox } from "@/components/prompt/PromptBox";

export default function Home() {
  return (
    <main className="relative h-screen w-screen overflow-hidden">
      <CanvasShell />
      <PromptBox />
    </main>
  );
}
