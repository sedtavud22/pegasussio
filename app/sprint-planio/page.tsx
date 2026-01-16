"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, RefreshCw, Eye, EyeOff } from "lucide-react";
import { PokerCard } from "./components/poker-card";
import { cn } from "@/lib/utils";

const FIBONACCI = [
  "0",
  "1",
  "2",
  "3",
  "5",
  "8",
  "13",
  "21",
  "34",
  "55",
  "89",
  "?",
  "☕",
];

export default function SprintPlanio() {
  const [selected, setSelected] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  const handleSelect = (value: string) => {
    if (revealed) return; // Prevent changing selection while revealed? Or allow it? Let's allow it but reset reveal? No, typical flow is select -> reveal -> reset.
    if (selected === value) {
      setSelected(null);
    } else {
      setSelected(value);
    }
  };

  const handleReveal = () => {
    if (!selected) return;
    setRevealed(true);
  };

  const handleReset = () => {
    setSelected(null);
    setRevealed(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 dark:bg-black flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 flex items-center justify-between border-b border-zinc-200 bg-white/80 px-6 py-4 backdrop-blur-md dark:border-zinc-800 dark:bg-zinc-950/80">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Sprint Planio
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-600 bg-zinc-100 hover:bg-zinc-200 rounded-full dark:bg-zinc-800 dark:text-zinc-300 dark:hover:bg-zinc-700 transition-colors"
            title="Reset Vote"
          >
            <RefreshCw className="h-4 w-4" />
            <span className="hidden sm:inline">Reset</span>
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center p-6 gap-12">
        {/* Stage Area */}
        <div className="flex-1 flex flex-col items-center justify-center min-h-[300px] w-full max-w-md mx-auto">
          {selected ? (
            <div className="perspective-1000">
              <div
                className={cn(
                  "relative h-64 w-48 transition-all duration-500 transform-style-3d cursor-pointer",
                  revealed ? "rotate-y-0" : "animate-float"
                )}
                onClick={() => !revealed && setRevealed(true)}
              >
                {revealed ? (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-blue-600 bg-white shadow-2xl dark:bg-zinc-900 dark:border-blue-500">
                    <span className="text-8xl font-bold text-blue-600 dark:text-blue-500">
                      {selected}
                    </span>
                    <span className="absolute top-4 left-4 text-xl font-bold text-blue-600 dark:text-blue-500 opacity-50">
                      {selected}
                    </span>
                    <span className="absolute bottom-4 right-4 text-xl font-bold text-blue-600 dark:text-blue-500 opacity-50 rotate-180">
                      {selected}
                    </span>
                  </div>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center rounded-2xl border-4 border-zinc-200 bg-zinc-100 shadow-xl dark:bg-zinc-800 dark:border-zinc-700">
                    <div className="h-full w-full rounded-xl opacity-20 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-400 via-blue-600 to-blue-900"></div>
                    <span className="absolute font-bold text-zinc-400 dark:text-zinc-600">
                      TAP TO REVEAL
                    </span>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 w-48 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded-2xl bg-zinc-50 dark:bg-zinc-900/50 text-zinc-400">
              <p className="text-sm font-medium">Select a card</p>
            </div>
          )}

          <div className="mt-8 h-12">
            {selected && !revealed && (
              <button
                onClick={handleReveal}
                className="flex items-center gap-2 px-8 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-full font-bold shadow-lg shadow-blue-600/20 transition-all hover:scale-105 active:scale-95"
              >
                <Eye className="h-5 w-5" />
                Reveal Card
              </button>
            )}
            {revealed && (
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-8 py-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-black dark:hover:bg-zinc-200 rounded-full font-bold shadow-lg transition-all hover:scale-105 active:scale-95"
              >
                <RefreshCw className="h-5 w-5" />
                Start New Vote
              </button>
            )}
          </div>
        </div>

        {/* Hand Area */}
        <div className="w-full max-w-5xl">
          <div className="flex flex-wrap justify-center gap-4">
            {FIBONACCI.map((val) => (
              <PokerCard
                key={val}
                value={val}
                selected={selected === val}
                onClick={() => handleSelect(val)}
                className={cn(
                  revealed &&
                    selected !== val &&
                    "opacity-50 grayscale cursor-not-allowed",
                  revealed &&
                    selected === val &&
                    "ring-4 ring-blue-500 ring-offset-2 dark:ring-offset-black"
                )}
              />
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}
