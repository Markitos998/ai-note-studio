"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInAnonymously,
  User,
} from "firebase/auth";
import { PrimaryButton } from "./PrimaryButton";
import { Card } from "./Card";

function getAuthErrorMessage(error: any): string {
  const code = error?.code || "";
  switch (code) {
    case "auth/invalid-credential":
    case "auth/user-not-found":
    case "auth/wrong-password":
      return "Email o password non corretti.";
    case "auth/invalid-email":
      return "L'indirizzo email non è valido.";
    case "auth/user-disabled":
      return "Questo account è stato disabilitato.";
    case "auth/network-request-failed":
      return "Errore di connessione. Controlla la tua connessione internet.";
    case "auth/too-many-requests":
      return "Troppi tentativi. Riprova più tardi.";
    case "auth/email-already-in-use":
      return "Questa email è già registrata.";
    case "auth/weak-password":
      return "La password è troppo debole. Usa almeno 6 caratteri.";
    default:
      return error?.message || "Errore di autenticazione";
  }
}

export function AuthForm() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugUser, setDebugUser] = useState<User | null>(null);

  useEffect(() => {
    if (process.env.NODE_ENV === "development") {
      const unsubscribe = auth.onAuthStateChanged((user) => {
        setDebugUser(user);
      });
      return () => unsubscribe();
    }
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
        router.push("/dashboard");
      }
    } catch (err: any) {
      console.error("Auth error:", err);
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleAnonymousSignIn = async () => {
    setLoading(true);
    setError(null);
    try {
      await signInAnonymously(auth);
      router.push("/dashboard");
    } catch (err: any) {
      console.error("Anonymous sign-in error:", err);
      const errorMessage = getAuthErrorMessage(err);
      setError(errorMessage || "Errore accesso anonimo");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="p-8">
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Email
          </label>
          <input
            id="email"
            type="email"
            className="w-full px-4 py-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500/50 transition-all duration-200 text-white placeholder:text-gray-500"
            placeholder="nome@esempio.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        <div>
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-300 mb-2"
          >
            Password
          </label>
          <input
            id="password"
            type="password"
            className="w-full px-4 py-3 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-xl focus:ring-2 focus:ring-indigo-400 focus:border-indigo-500/50 transition-all duration-200 text-white placeholder:text-gray-500"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            disabled={loading}
          />
        </div>

        {error && (
          <div className="p-4 bg-red-900/30 backdrop-blur-sm border border-red-800/50 rounded-xl">
            <p className="text-sm text-red-300">{error}</p>
          </div>
        )}

        {process.env.NODE_ENV === "development" && debugUser && (
          <div className="p-3 bg-yellow-900/30 backdrop-blur-sm border border-yellow-800/50 rounded-xl">
            <p className="text-xs font-mono text-yellow-300">
              <strong>DEV DEBUG:</strong> Email: {debugUser.email || "N/A"} | Verified: {debugUser.emailVerified ? "Yes" : "No"} | Anonymous: {debugUser.isAnonymous ? "Yes" : "No"}
            </p>
          </div>
        )}

        <PrimaryButton
          type="submit"
          disabled={loading}
          className="w-full"
        >
          {loading ? (
            <span className="flex items-center justify-center space-x-2">
              <svg
                className="animate-spin h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                />
              </svg>
              <span>Attendere...</span>
            </span>
          ) : (
            "Continua"
          )}
        </PrimaryButton>
      </form>

      <div className="mt-6">
        <button
          type="button"
          onClick={handleAnonymousSignIn}
          disabled={loading}
          className="w-full px-5 py-2.5 rounded-full border border-zinc-700/50 bg-zinc-800/50 backdrop-blur-sm text-gray-200 font-medium text-sm hover:bg-zinc-700/80 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all duration-200 ease-out"
        >
          Continua come ospite
        </button>
      </div>

      <div className="mt-6 pt-6 border-t border-zinc-800/50">
        {isLogin ? (
          <Link
            href="/register"
            className="block w-full text-center text-sm text-gray-400 hover:text-gray-200 font-medium transition-colors duration-200"
          >
            Non hai un account? Registrati
          </Link>
        ) : (
          <button
            type="button"
            onClick={() => {
              setIsLogin(!isLogin);
              setError(null);
            }}
            className="w-full text-sm text-gray-400 hover:text-gray-200 font-medium transition-colors duration-200"
          >
            Hai già un account? Accedi
          </button>
        )}
      </div>
    </Card>
  );
}
