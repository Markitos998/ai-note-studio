"use client";

import Link from "next/link";
import { Card } from "@/components/Card";
import { PrimaryButton } from "@/components/PrimaryButton";

const VerifyEmailPage = () => {
  return (
    <main className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-zinc-950 via-zinc-900 to-zinc-950">
      <div className="w-full max-w-md">
        <Card className="p-8">
          <div className="text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-emerald-500/20 rounded-2xl mb-6">
              <svg
                className="h-8 w-8 text-emerald-400"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>

            <h1 className="text-2xl font-semibold text-white mb-3">
              Email verificata
            </h1>
            <p className="text-sm text-zinc-400 leading-relaxed mb-6">
              La tua email è stata verificata correttamente. Ora puoi accedere con le tue credenziali.
            </p>

            <Link href="/">
              <PrimaryButton className="w-full">
                Torna al login
              </PrimaryButton>
            </Link>
          </div>
        </Card>
      </div>
    </main>
  );
};

export default VerifyEmailPage;
