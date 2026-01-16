import Link from "next/link";
import Image from "next/image";
import packageJson from "../package.json";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans dark:bg-black">
      <main className="flex min-h-screen w-full flex-col items-center justify-center p-8 text-center sm:items-start sm:text-left">
        <div className="mb-8 flex justify-center sm:justify-start">
          <Image
            src="/images/pegasus-logo.jpg"
            alt="Pegasussio Logo"
            width={120}
            height={120}
            className="rounded-2xl shadow-lg"
          />
        </div>
        <h1 className="text-4xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100 sm:text-6xl flex items-center gap-4">
          Pegasussio Super App
          <span className="text-sm font-mono bg-zinc-200 dark:bg-zinc-800 px-2 py-1 rounded-full text-zinc-600 dark:text-zinc-400 align-middle">
            v{packageJson.version}
          </span>
        </h1>
        <p className="mt-6 text-lg leading-8 text-zinc-600 dark:text-zinc-400">
          The central hub for all your productivity tools.
        </p>
        <div className="mt-10 flex flex-wrap gap-4 justify-center sm:justify-start">
          <Link
            href="/pull-requestio"
            className="flex items-center gap-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg overflow-hidden">
              <Image
                src="/images/pull-requestio-logo.png"
                alt="Pull Requestio Logo"
                width={40}
                height={40}
                className="h-full w-full object-cover"
              />
            </div>
            <div className="text-left">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Pull Requestio
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Manage your PRs
              </div>
            </div>
          </Link>

          <Link
            href="/sprint-planio"
            className="flex items-center gap-2 rounded-xl bg-white p-6 shadow-sm ring-1 ring-zinc-200 transition-all hover:bg-zinc-50 hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800 dark:hover:bg-zinc-800/80"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-purple-600 text-white">
              SP
            </div>
            <div className="text-left">
              <div className="font-semibold text-zinc-900 dark:text-zinc-100">
                Sprint Planio
              </div>
              <div className="text-sm text-zinc-500 dark:text-zinc-400">
                Coming Soon
              </div>
            </div>
          </Link>
        </div>
      </main>
      <div className="absolute bottom-4 text-xs text-zinc-400">
        Pegasussio v{packageJson.version}
      </div>
    </div>
  );
}
