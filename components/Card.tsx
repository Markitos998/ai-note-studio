import { ReactNode } from "react";

interface CardProps {
  children: ReactNode;
  className?: string;
}

export function Card({ children, className = "" }: CardProps) {
  return (
    <div
      className={`bg-zinc-900/80 backdrop-blur-xl rounded-2xl border border-zinc-800/50 shadow-lg hover:shadow-xl transition-all duration-300 ease-out ${className}`}
    >
      {children}
    </div>
  );
}

