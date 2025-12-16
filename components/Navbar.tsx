"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { auth } from "@/lib/firebase";
import { signOut, User } from "firebase/auth";

export function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [showMenu, setShowMenu] = useState(false);
  const router = useRouter();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged((currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push("/");
    } catch (error: any) {
      console.error("Error signing out:", error);
      alert("Errore durante il logout");
    }
  };

  return (
    <nav className="sticky top-0 z-30 bg-zinc-900/80 backdrop-blur-xl border-b border-zinc-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          <Link href="/dashboard" className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-lg flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <span className="text-white text-sm">📝</span>
            </div>
            <span className="text-lg font-semibold text-white">
              AI Notes Studio
            </span>
          </Link>

          <div className="flex items-center space-x-4 relative">
            <button
              onClick={() => setShowMenu(!showMenu)}
              className="w-8 h-8 bg-zinc-800 rounded-full flex items-center justify-center border border-zinc-700 hover:bg-zinc-700 transition-colors"
            >
              <span className="text-xs font-medium text-gray-300">
                {user?.email?.[0]?.toUpperCase() || "U"}
              </span>
            </button>
            {showMenu && (
              <>
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowMenu(false)}
                />
                <div className="absolute right-0 top-12 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800/70 rounded-xl shadow-lg py-2 min-w-[200px] z-20">
                  <div className="px-4 py-2 border-b border-zinc-800/50">
                    <p className="text-xs text-zinc-400">Account</p>
                    <p className="text-sm text-white truncate mt-1">
                      {user?.email || "Ospite anonimo"}
                    </p>
                  </div>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-sm text-zinc-300 hover:bg-zinc-800/50 transition-colors"
                    onClick={() => setShowMenu(false)}
                  >
                    Impostazioni
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-red-500/20 transition-colors"
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
