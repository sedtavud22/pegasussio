import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SprintPlanio() {
  return (
    <div className="flex min-h-screen flex-col bg-gray-50 p-6 dark:bg-zinc-900">
      <Link
        href="/"
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-xl text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800 transition-colors"
      >
        <ArrowLeft className="h-5 w-5" />
      </Link>
      <div className="flex flex-1 flex-col items-center justify-center">
        <h1 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-gray-100">
          Sprint Planio
        </h1>
        <p className="mt-4 text-lg text-gray-600 dark:text-gray-400">
          Coming Soon
        </p>
      </div>
    </div>
  );
}
