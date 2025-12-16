import { ReactNode } from "react";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  badge?: string;
  action?: ReactNode;
}

export function SectionHeader({
  title,
  subtitle,
  badge,
  action,
}: SectionHeaderProps) {
  return (
    <div className="flex items-start justify-between mb-6">
      <div>
        <div className="flex items-center gap-3 mb-2">
          <h1 className="text-3xl font-semibold text-white">{title}</h1>
          {badge && (
            <span className="px-2.5 py-0.5 text-xs font-medium text-indigo-300 bg-indigo-500/20 border border-indigo-500/30 rounded-full">
              {badge}
            </span>
          )}
        </div>
        {subtitle && (
          <p className="text-sm text-gray-400 leading-relaxed">{subtitle}</p>
        )}
      </div>
      {action && <div>{action}</div>}
    </div>
  );
}

