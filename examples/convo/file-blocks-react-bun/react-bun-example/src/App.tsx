export default function App() {
  return (
    <main className="min-h-screen bg-slate-950 px-6 py-16 text-white">
      <section className="mx-auto flex max-w-3xl flex-col items-center text-center">
        <div className="mb-6 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-1 text-sm font-medium text-cyan-200">
          React + Tailwind + Bun
        </div>

        <h1 className="text-5xl font-bold tracking-tight sm:text-6xl">
          Your Bun-powered React app is ready.
        </h1>

        <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
          Edit <code className="rounded bg-slate-800 px-2 py-1">src/App.tsx</code> and start
          building with Vite, React, TypeScript, and Tailwind CSS.
        </p>

        <div className="mt-10 flex flex-col gap-3 sm:flex-row">
          <a
            className="rounded-lg bg-cyan-400 px-5 py-3 font-semibold text-slate-950 transition hover:bg-cyan-300"
            href="https://bun.sh"
            target="_blank"
            rel="noreferrer"
          >
            Bun Docs
          </a>
          <a
            className="rounded-lg border border-slate-700 px-5 py-3 font-semibold text-slate-100 transition hover:bg-slate-900"
            href="https://tailwindcss.com"
            target="_blank"
            rel="noreferrer"
          >
            Tailwind Docs
          </a>
        </div>
      </section>
    </main>
  );
}
