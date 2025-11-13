'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);

  const sendMagicLink = async () => {
    setLoading(true);
    
    // Correction : utilisation d'une variable d'environnement avec fallback
    const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL || window.location.origin;
    
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { 
        emailRedirectTo: `${redirectUrl}/auth/callback`
      }
    });
    setLoading(false);
    if (!error) setSent(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMagicLink();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full space-y-8">
        {/* Carte principale */}
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* En-tête */}
          <div className="text-center">
            <div className="mx-auto h-12 w-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-full flex items-center justify-center">
              <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            <h1 className="mt-4 text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Alternance & Moi
            </h1>
            <p className="mt-2 text-gray-600">Connectez-vous à votre espace</p>
          </div>

          {!sent ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Champ email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Adresse email
                </label>
                <div className="relative">
                  <input
                    id="email"
                    name="email"
                    type="email"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-gray-900"
                    placeholder="email@exemple.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                    <svg className="h-5 w-5 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                  </div>
                </div>
              </div>

              {/* Bouton de connexion */}
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-[1.02] focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Envoi en cours...
                  </span>
                ) : (
                  'Recevoir le lien magique'
                )}
              </button>
            </form>
          ) : (
            /* Message de confirmation */
            <div className="text-center space-y-4">
              <div className="mx-auto flex items-center justify-center h-16 w-16 rounded-full bg-green-100">
                <svg className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Lien envoyé !</h3>
              <p className="text-gray-600">
                Nous avons envoyé un lien de connexion à <strong>{email}</strong>. Vérifiez votre boîte mail et cliquez sur le lien pour vous connecter.
              </p>
              <button
                onClick={() => {
                  setSent(false);
                  setEmail('');
                }}
                className="mt-4 text-blue-600 hover:text-blue-700 font-medium transition-colors duration-200"
              >
                Réessayer avec un autre email
              </button>
            </div>
          )}

          {/* Informations supplémentaires */}
          <div className="text-center pt-4 border-t border-gray-200">
            <p className="text-sm text-gray-500">
              En vous connectant, vous acceptez nos conditions d'utilisation.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}