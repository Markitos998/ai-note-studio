import { AuthForm } from "@/components/AuthForm";

export default function Home() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-5 shadow-lg shadow-indigo-500/20">
            <span className="text-3xl">📝</span>
          </div>
          <h1 className="text-4xl font-semibold text-white mb-3">
            AI Notes Studio
          </h1>
          <p className="text-base text-gray-400 leading-relaxed">
            Riorganizza i tuoi appunti con l'AI
          </p>
        </div>
        <AuthForm />
      </div>
    </main>
  );
}
