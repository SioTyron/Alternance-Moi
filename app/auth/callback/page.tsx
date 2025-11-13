'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const router = useRouter();

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Récupérer le token d'accès de l'URL
        const urlParams = new URLSearchParams(window.location.hash.substring(1));
        const accessToken = urlParams.get('access_token');
        const refreshToken = urlParams.get('refresh_token');
        
        if (accessToken) {
          // Définir la session manuellement
          const { data: { session }, error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken || '',
          });

          if (error) {
            console.error('Error setting session:', error);
            router.push('/login');
            return;
          }

          if (session) {
            // Fermer la fenêtre si c'est un popup, sinon rediriger
            if (window.opener) {
              window.opener.location.reload();
              window.close();
            } else {
              router.push('/');
            }
          }
        } else {
          // Si pas de token, vérifier la session normalement
          const { data: { session } } = await supabase.auth.getSession();
          
          if (session) {
            if (window.opener) {
              window.opener.location.reload();
              window.close();
            } else {
              router.push('/');
            }
          } else {
            router.push('/login');
          }
        }
      } catch (error) {
        console.error('Auth callback error:', error);
        router.push('/login');
      }
    };

    handleAuthCallback();
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Finalisation de la connexion...</p>
        <p className="text-sm text-gray-500 mt-2">Redirection en cours</p>
      </div>
    </div>
  );
}