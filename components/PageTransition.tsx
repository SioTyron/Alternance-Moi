// components/PageTransition.tsx
'use client';
import { usePathname } from 'next/navigation';
import { ReactNode } from 'react';

// Ré-anime le contenu à chaque changement de route (clé = pathname).
export default function PageTransition({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  return (
    <div key={pathname} className="page-enter">
      {children}
    </div>
  );
}
