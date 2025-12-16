import { RegisterForm } from "@/components/RegisterForm";

export default function RegisterPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-50 via-white to-zinc-50/50">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl mb-5 shadow-lg">
            <span className="text-3xl">📝</span>
          </div>
          <h1 className="text-4xl font-semibold text-gray-900 mb-3">
            AI Notes Studio
          </h1>
          <p className="text-base text-gray-500 leading-relaxed">
            Crea il tuo account per iniziare
          </p>
        </div>
        <RegisterForm />
      </div>
    </main>
  );
}

