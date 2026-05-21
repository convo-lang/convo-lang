function App() {
  return (
    <main className="min-h-screen bg-zinc-950 text-white flex items-center justify-center p-6">
      <section className="max-w-xl text-center space-y-6">
        <div className="inline-flex rounded-full bg-cyan-500/10 px-4 py-2 text-sm font-medium text-cyan-300 ring-1 ring-cyan-500/20">
          React + Bun + Tailwind CSS v4
        </div>

        <h1 className="text-4xl sm:text-6xl font-bold tracking-tight">
          Hello from Bun
        </h1>

        <p className="text-zinc-400 text-lg">
          A minimal React app powered by Vite, Bun, and Tailwind CSS v4.
        </p>

        <a
          href="https://tailwindcss.com"
          target="_blank"
          rel="noreferrer"
          className="inline-flex rounded-lg bg-white px-5 py-3 font-medium text-zinc-950 hover:bg-zinc-200 transition"
        >
          Tailwind Docs
        </a>
      </section>
    </main>
  )
}

export default App
