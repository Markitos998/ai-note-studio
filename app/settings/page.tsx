"use client";

import { useState, useEffect } from "react";
import { AppShell } from "@/components/AppShell";
import { SectionHeader } from "@/components/SectionHeader";
import { Card } from "@/components/Card";
import { SecondaryButton } from "@/components/SecondaryButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { auth } from "@/lib/firebase";
import { onAuthStateChanged, User, signOut } from "firebase/auth";
import { useSessionHistory } from "@/components/SessionHistoryProvider";
import { useRouter } from "next/navigation";

export default function SettingsPage() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [logoutLoading, setLogoutLoading] = useState(false);
  const { clearHistory } = useSessionHistory();
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const formatDate = (date: Date | undefined) => {
    if (!date) return "N/A";
    return new Intl.DateTimeFormat("it-IT", {
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const handleClearSessionHistory = () => {
    if (confirm("Sei sicuro di voler cancellare la cronologia della sessione?")) {
      clearHistory();
      alert("Cronologia sessione cancellata");
    }
  };

  const handleLogout = async () => {
    if (!confirm("Sei sicuro di voler uscire?")) {
      return;
    }

    setLogoutLoading(true);
    try {
      await signOut(auth);
      router.push("/");
    } catch (error: any) {
      console.error("Error signing out:", error);
      alert("Errore durante il logout");
      setLogoutLoading(false);
    }
  };

  return (
    <AppShell>
      <SectionHeader
        title="Impostazioni"
        subtitle="Gestisci il tuo account e le preferenze"
      />

      <div className="space-y-6">
        <Card className="p-6">
          <h2 className="text-xl font-medium text-white mb-4">Profilo</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">
                Email
              </label>
              <p className="text-sm text-white">
                {user && !user.isAnonymous
                  ? user.email || "Nessuna email"
                  : "Ospite anonimo"}
              </p>
            </div>
            {user?.metadata?.creationTime && (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Account creato il
                </label>
                <p className="text-sm text-white">
                  {formatDate(new Date(user.metadata.creationTime))}
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-medium text-white mb-4">Privacy & Dati</h2>
          <div className="space-y-4">
            {user && user.isAnonymous ? (
              <>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-1">
                    Cronologia sessione
                  </label>
                  <p className="text-sm text-gray-400 mb-4">
                    La cronologia della sessione viene mantenuta solo durante la
                    navigazione. Chiudendo la scheda del browser, i dati verranno
                    persi.
                  </p>
                  <SecondaryButton onClick={handleClearSessionHistory}>
                    Cancella cronologia sessione
                  </SecondaryButton>
                </div>
              </>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-1">
                  Dati salvati
                </label>
                <p className="text-sm text-gray-400">
                  I tuoi riassunti vengono salvati permanentemente nel cloud e
                  associati al tuo account.
                </p>
              </div>
            )}
          </div>
        </Card>

        <Card className="p-6">
          <h2 className="text-xl font-medium text-white mb-4">Account</h2>
          <div className="space-y-4">
            <p className="text-sm text-gray-400">
              Uscire dal tuo account chiuderà la sessione corrente.
            </p>
            <PrimaryButton
              onClick={handleLogout}
              disabled={logoutLoading}
              className="bg-red-500 hover:bg-red-600 focus:ring-red-400"
            >
              {logoutLoading ? (
                <span className="flex items-center space-x-2">
                  <svg
                    className="animate-spin h-4 w-4"
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
                  <span>Uscita in corso...</span>
                </span>
              ) : (
                "Logout"
              )}
            </PrimaryButton>
          </div>
        </Card>
      </div>
    </AppShell>
  );
}

