// app/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import Link from 'next/link';
import GuideSection from '@/components/GuideSection';

export default function HomePage() {
  const [session, setSession] = useState<any>(null);
  const [firstName, setFirstName] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProfileName = async (currentSession: any) => {
      if (!currentSession) {
        setFirstName('');
        return;
      }
      const { data } = await supabase
        .from('profiles')
        .select('first_name')
        .eq('id', currentSession.user.id)
        .maybeSingle();
      // Prénom du profil, sinon repli sur le début de l'email
      const fallback = currentSession.user.email?.split('@')[0] ?? '';
      setFirstName(data?.first_name?.trim() || fallback);
    };

    const init = async () => {
      const { data } = await supabase.auth.getSession();
      setSession(data.session);
      await fetchProfileName(data.session);
      setLoading(false);
    };

    init();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      fetchProfileName(session);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen app-bg flex items-center justify-center">
        <div className="card p-8 text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-slate-600">Chargement...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg">
      <div className="container mx-auto px-4 py-10">
        <div className="max-w-5xl mx-auto">
          {session ? (
            <>
              {/* Hero */}
              <div className="animate-in mb-8">
                <span className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 text-xs font-semibold px-3 py-1 ring-1 ring-blue-100">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500"></span>
                  Connecté
                </span>
                <h1 className="mt-4 text-3xl sm:text-4xl font-bold tracking-tight text-slate-900">
                  Bonjour <span className="gradient-text capitalize">{firstName}</span> 👋
                </h1>
                <p className="mt-2 text-slate-600 text-lg">
                  Voici votre espace de suivi d'alternance.
                </p>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                {/* Carte création */}
                <div className="card card-hover p-8 animate-in" style={{ animationDelay: '60ms' }}>
                  <div className="h-12 w-12 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-md shadow-blue-500/30 mb-5">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Nouveau rapport</h3>
                  <p className="text-slate-600 text-sm mb-5">Documentez une nouvelle activité en quelques secondes.</p>
                  <Link href="/new-report" className="btn btn-primary w-full py-3">
                    Créer un rapport
                  </Link>
                </div>

                {/* Carte consultation */}
                <div className="card card-hover p-8 animate-in" style={{ animationDelay: '120ms' }}>
                  <div className="h-12 w-12 bg-gradient-to-br from-indigo-500 to-purple-500 rounded-xl flex items-center justify-center shadow-md shadow-indigo-500/30 mb-5">
                    <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-semibold text-slate-900 mb-1">Mes rapports</h3>
                  <p className="text-slate-600 text-sm mb-5">Consultez, modifiez et exportez votre historique.</p>
                  <Link
                    href="/reports"
                    className="btn w-full py-3 border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white"
                  >
                    Voir mes rapports
                  </Link>
                </div>
              </div>

              {/* Fonctionnalités */}
              <div className="mt-14">
                <h3 className="text-xl font-semibold text-center text-slate-900 mb-8">Ce que vous pouvez faire</h3>
                <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-5">
                  {[
                    { iconBg: 'bg-blue-100', iconText: 'text-blue-600', title: "Rapports d'activité", desc: 'Créez, modifiez et joignez des fichiers à vos rapports.', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /> },
                    { iconBg: 'bg-indigo-100', iconText: 'text-indigo-600', title: 'Suivi des notes', desc: 'UE par semestre, moyennes automatiques et graphes.', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
                    { iconBg: 'bg-purple-100', iconText: 'text-purple-600', title: 'Export PDF à la carte', desc: 'Exportez tout ou une sélection, dans un PDF soigné.', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /> },
                    { iconBg: 'bg-emerald-100', iconText: 'text-emerald-600', title: 'Corbeille', desc: 'Suppressions récupérables pendant 30 jours.', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /> },
                  ].map((f, i) => (
                    <div key={i} className="card card-hover p-6 text-center animate-in" style={{ animationDelay: `${150 + i * 60}ms` }}>
                      <div className={`h-12 w-12 ${f.iconBg} rounded-xl flex items-center justify-center mx-auto mb-4`}>
                        <svg className={`h-6 w-6 ${f.iconText}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">{f.icon}</svg>
                      </div>
                      <h4 className="font-semibold text-slate-900 mb-1">{f.title}</h4>
                      <p className="text-slate-600 text-sm">{f.desc}</p>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            /* Non connecté */
            <div className="min-h-[78vh] flex items-center justify-center">
              <div className="card p-8 sm:p-10 max-w-md w-full text-center animate-in">
                <div className="h-16 w-16 bg-gradient-to-br from-blue-600 to-indigo-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-lg shadow-blue-500/30">
                  <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold tracking-tight text-slate-900 mb-3">Bienvenue sur Alternance &amp; Moi</h2>
                <p className="text-slate-600 mb-7">
                  Connectez-vous pour suivre, documenter et exporter vos activités d'alternance.
                </p>
                <Link href="/login" className="btn btn-primary w-full py-3">
                  Se connecter
                </Link>
              </div>
            </div>
          )}

          <GuideSection />
        </div>
      </div>
    </div>
  );
}
