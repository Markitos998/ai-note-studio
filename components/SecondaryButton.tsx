import { ButtonHTMLAttributes, ReactNode } from "react";

interface SecondaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function SecondaryButton({
  children,
  className = "",
  disabled,
  ...props
}: SecondaryButtonProps) {
  return (
    <button
      className={`px-4 py-2 text-sm font-medium text-gray-200 bg-zinc-800/50 backdrop-blur-sm border border-zinc-700/50 rounded-lg hover:bg-zinc-700/80 disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-900 transition-all duration-200 ease-out ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

