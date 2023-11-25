import CurrentMonth from "@/components/como/current-month";
import { AlertCircle } from "lucide-react";

export default async function ComoLoading() {
  const cells = Array.from({ length: 35 }, (_, i) => i + 1);

  return (
    <main className="container flex flex-col gap-2 py-2">
      <div className="flex items-center">
        <div className="flex w-full gap-2 justify-between items-center">
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-cosmo uppercase">COMO</h1>
            <AlertCircle className="w-4 h-4 drop-shadow-lg" />
          </div>

          <div className="flex items-center gap-2"></div>

          <CurrentMonth />
        </div>
      </div>

      <div className="flex flex-col rounded-lg bg-accent border border-accent overflow-clip h-fit">
        {/* days of the week */}
        <div className="grid grid-cols-7 gap-px border-b border-accent">
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Mon
          </div>
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Tue
          </div>
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Wed
          </div>
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Thu
          </div>
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Fri
          </div>
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Sat
          </div>
          <div className="flex items-center justify-center font-bold bg-background/80 py-2">
            Sun
          </div>
        </div>

        {/* days of the month */}
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day) => (
            <div
              key={day}
              className="relative flex items-center justify-center h-24 sm:h-20 bg-background/70 hover:bg-background/50 transition-colors animate-pulse"
            />
          ))}
        </div>
      </div>
    </main>
  );
}
