// components/EmptyState.tsx
import { ReactNode } from 'react';

type Props = {
  icon: ReactNode;       // contenu <path> du SVG
  title: string;
  description: string;
  action?: ReactNode;
};

export default function EmptyState({ icon, title, description, action }: Props) {
  return (
    <div className="card p-10 text-center animate-in">
      {/* Illustration en couches */}
      <div className="relative mx-auto mb-6 h-28 w-28">
        <div className="absolute inset-0 rounded-full bg-blue-100/60 blur-xl" />
        <div className="absolute inset-2 rounded-full bg-gradient-to-br from-blue-50 to-indigo-100" />
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-blue-500/30">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">{icon}</svg>
          </div>
        </div>
        {/* points décoratifs */}
        <span className="absolute -top-1 right-3 h-2.5 w-2.5 rounded-full bg-indigo-300" />
        <span className="absolute bottom-2 -left-1 h-2 w-2 rounded-full bg-blue-300" />
        <span className="absolute top-6 -right-2 h-1.5 w-1.5 rounded-full bg-purple-300" />
      </div>
      <h3 className="text-xl font-semibold text-slate-900 mb-2">{title}</h3>
      <p className="text-slate-600 mb-6 max-w-sm mx-auto">{description}</p>
      {action}
    </div>
  );
}
