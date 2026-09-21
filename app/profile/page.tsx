// app/profile/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

const MAX_LEN = 200;

type Profile = {
  first_name: string;
  last_name: string;
  phone: string;
  school: string;
  company: string;
  position: string;
};

const EMPTY: Profile = {
  first_name: '',
  last_name: '',
  phone: '',
  school: '',
  company: '',
  position: '',
};

export default function ProfilePage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [profile, setProfile] = useState<Profile>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const load = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      setEmail(session.user.email ?? '');

      const { data, error: loadError } = await supabase
        .from('profiles')
        .select('first_name, last_name, phone, school, company, position')
        .eq('id', session.user.id)
        .maybeSingle();

      if (loadError) {
        setError("Impossible de charger le profil.");
      } else if (data) {
        setProfile({
          first_name: data.first_name ?? '',
          last_name: data.last_name ?? '',
          phone: data.phone ?? '',
          school: data.school ?? '',
          company: data.company ?? '',
          position: data.position ?? '',
        });
      }
      setLoading(false);
    };
    load();
  }, [router]);

  const handleChange = (field: keyof Profile) => (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    setProfile(prev => ({ ...prev, [field]: e.target.value.slice(0, MAX_LEN) }));
    setSaved(false);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSaved(false);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { error: saveError } = await supabase
      .from('profiles')
      .upsert({
        id: session.user.id,
        first_name: profile.first_name.trim(),
        last_name: profile.last_name.trim(),
        phone: profile.phone.trim(),
        school: profile.school.trim(),
        company: profile.company.trim(),
        position: profile.position.trim(),
      });

    if (saveError) {
      setError("Erreur lors de l'enregistrement du profil.");
    } else {
      setSaved(true);
    }
    setSaving(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <div className="skeleton h-16 w-16 rounded-full mx-auto mb-4" />
            <div className="skeleton h-8 w-40 mx-auto" />
            <div className="skeleton h-4 w-56 mx-auto mt-3" />
          </div>
          <div className="card p-6 md:p-8 space-y-6">
            <div className="space-y-2">
              <div className="skeleton h-4 w-24" />
              <div className="skeleton h-11 w-full" />
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[0, 1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={i >= 3 ? 'md:col-span-2 space-y-2' : 'space-y-2'}>
                  <div className="skeleton h-4 w-28" />
                  <div className="skeleton h-11 w-full" />
                </div>
              ))}
            </div>
            <div className="skeleton h-12 w-full" />
          </div>
        </div>
      </div>
    );
  }

  const fields: { key: keyof Profile; label: string; type?: string; placeholder?: string }[] = [
    { key: 'first_name', label: 'Prénom', placeholder: 'Jean' },
    { key: 'last_name', label: 'Nom', placeholder: 'Dupont' },
    { key: 'phone', label: 'Téléphone', type: 'tel', placeholder: '06 12 34 56 78' },
    { key: 'school', label: 'Établissement de formation', placeholder: 'Nom de votre école / CFA' },
    { key: 'company', label: "Entreprise d'accueil", placeholder: 'Nom de votre entreprise' },
    { key: 'position', label: 'Poste / mission', placeholder: 'Ex. Développeur web en alternance' },
  ];

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Mon Profil
          </h1>
          <p className="text-gray-600 mt-2">Vos informations personnelles</p>
        </div>

        {/* Form Card */}
        <div className="card p-6 md:p-8 animate-in">
          <form onSubmit={submit} className="space-y-6">
            {/* Email (lecture seule) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Adresse email
              </label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-500 cursor-not-allowed"
              />
              <p className="mt-1 text-xs text-gray-400">L&apos;email est lié à votre compte et ne peut pas être modifié ici.</p>
            </div>

            <div className="grid md:grid-cols-2 gap-6">
              {fields.map(f => (
                <div key={f.key} className={f.key === 'school' || f.key === 'company' || f.key === 'position' ? 'md:col-span-2' : ''}>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {f.label}
                  </label>
                  <input
                    type={f.type ?? 'text'}
                    value={profile[f.key]}
                    onChange={handleChange(f.key)}
                    placeholder={f.placeholder}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                  />
                </div>
              ))}
            </div>

            {error && (
              <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
                {error}
              </div>
            )}
            {saved && (
              <div className="rounded-lg bg-green-50 border border-green-200 px-4 py-3 text-sm text-green-700">
                ✓ Profil enregistré avec succès.
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="btn btn-primary w-full py-4"
            >
              {saving ? 'Enregistrement...' : 'Enregistrer les modifications'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
