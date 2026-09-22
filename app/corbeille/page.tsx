// app/corbeille/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import EmptyState from '@/components/EmptyState';
import { purgeExpiredTrash, daysUntilPurge } from '@/lib/trash';

type Kind = 'report' | 'formation' | 'semester' | 'ue';
type TrashItem = {
  id: string;
  kind: Kind;
  label: string;
  sublabel?: string;
  deleted_at: string;
  attachments?: { path?: string }[];
};

const TABLE: Record<Kind, string> = {
  report: 'reports',
  formation: 'formations',
  semester: 'semesters',
  ue: 'ues',
};

const META: Record<Kind, { label: string; icon: React.ReactNode; badge: string }> = {
  report: { label: 'Rapport', badge: 'bg-blue-50 text-blue-700 ring-blue-100', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
  formation: { label: 'Formation', badge: 'bg-indigo-50 text-indigo-700 ring-indigo-100', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" /> },
  semester: { label: 'Semestre', badge: 'bg-purple-50 text-purple-700 ring-purple-100', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" /> },
  ue: { label: 'UE', badge: 'bg-slate-100 text-slate-600 ring-slate-200', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /> },
};

export default function TrashPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<TrashItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      await purgeExpiredTrash();

      const [rep, form, sem, ue] = await Promise.all([
        supabase.from('reports').select('id, title, date, attachments, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('formations').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('semesters').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
        supabase.from('ues').select('id, name, deleted_at').not('deleted_at', 'is', null).order('deleted_at', { ascending: false }),
      ]);

      const list: TrashItem[] = [
        ...((rep.data ?? []).map((r: any) => ({ id: r.id, kind: 'report' as Kind, label: r.title, sublabel: r.date, deleted_at: r.deleted_at, attachments: r.attachments }))),
        ...((form.data ?? []).map((f: any) => ({ id: f.id, kind: 'formation' as Kind, label: f.name, deleted_at: f.deleted_at }))),
        ...((sem.data ?? []).map((s: any) => ({ id: s.id, kind: 'semester' as Kind, label: s.name, deleted_at: s.deleted_at }))),
        ...((ue.data ?? []).map((u: any) => ({ id: u.id, kind: 'ue' as Kind, label: u.name, deleted_at: u.deleted_at }))),
      ].sort((a, b) => b.deleted_at.localeCompare(a.deleted_at));

      setItems(list);
      setLoading(false);
    };
    load();
  }, [router]);

  const restore = async (item: TrashItem) => {
    await supabase.from(TABLE[item.kind]).update({ deleted_at: null }).eq('id', item.id);
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.kind === item.kind)));
    toast.success(`${META[item.kind].label} restauré${item.kind === 'formation' || item.kind === 'ue' ? 'e' : ''}`);
  };

  const purge = async (item: TrashItem) => {
    const ok = await confirm({
      title: 'Supprimer définitivement',
      message: `« ${item.label} » sera supprimé définitivement. Cette action est irréversible.`,
      confirmLabel: 'Supprimer définitivement',
      danger: true,
    });
    if (!ok) return;
    if (item.kind === 'report' && item.attachments?.length) {
      const paths = item.attachments.map((a) => a.path).filter(Boolean) as string[];
      if (paths.length) await supabase.storage.from('reports').remove(paths);
    }
    await supabase.from(TABLE[item.kind]).delete().eq('id', item.id);
    setItems((prev) => prev.filter((i) => !(i.id === item.id && i.kind === item.kind)));
    toast.success('Supprimé définitivement');
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  if (loading) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="skeleton h-8 w-40 mx-auto" />
            <div className="skeleton h-4 w-64 mx-auto mt-3" />
          </div>
          {[0, 1, 2].map((i) => (
            <div key={i} className="card p-4 mb-3 flex items-center justify-between">
              <div className="flex items-center gap-3 flex-1">
                <div className="skeleton h-9 w-9" />
                <div className="flex-1 space-y-2"><div className="skeleton h-4 w-1/2" /><div className="skeleton h-3 w-1/3" /></div>
              </div>
              <div className="skeleton h-8 w-24" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8 animate-in">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Corbeille</h1>
          <p className="text-slate-600 mt-2">Les éléments supprimés sont conservés 30 jours, puis effacés définitivement.</p>
        </div>

        {items.length === 0 ? (
          <EmptyState
            icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />}
            title="Corbeille vide"
            description="Rien à restaurer pour le moment. Les éléments que vous supprimez apparaîtront ici."
          />
        ) : (
          <div className="space-y-3">
            {items.map((item) => {
              const left = daysUntilPurge(item.deleted_at);
              return (
                <div key={`${item.kind}-${item.id}`} className="card p-4 animate-in flex items-center justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="h-9 w-9 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">{META[item.kind].icon}</svg>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded ring-1 ${META[item.kind].badge}`}>{META[item.kind].label}</span>
                        <span className="font-medium text-slate-900 truncate">{item.label || '(sans titre)'}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Supprimé le {fmtDate(item.deleted_at)} · vidé dans {left} j
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button onClick={() => restore(item)} className="btn px-3 py-1.5 text-sm border border-slate-300 text-slate-700 hover:bg-slate-100" title="Restaurer">
                      <svg className="h-4 w-4 sm:mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                      <span className="hidden sm:inline">Restaurer</span>
                    </button>
                    <button onClick={() => purge(item)} className="text-slate-300 hover:text-red-500 p-2" title="Supprimer définitivement">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
