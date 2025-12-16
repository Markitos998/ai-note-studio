import { ButtonHTMLAttributes, ReactNode } from "react";

interface PrimaryButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
}

export function PrimaryButton({
  children,
  className = "",
  disabled,
  ...props
}: PrimaryButtonProps) {
  return (
    <button
      className={`px-5 py-2.5 rounded-full bg-gradient-to-r from-indigo-500 to-indigo-600 text-white font-semibold text-sm transition-all duration-200 ease-out disabled:opacity-50 disabled:cursor-not-allowed focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-offset-2 focus:ring-offset-zinc-900 hover:shadow-[0_10px_30px_rgba(99,102,241,0.4)] hover:-translate-y-0.5 ${className}`}
      disabled={disabled}
      {...props}
    >
      {children}
    </button>
  );
}

