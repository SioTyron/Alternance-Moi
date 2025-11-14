// app/new-report/page.tsx
'use client';
import { useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';

export default function NewReportPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [date, setDate] = useState(() => {
    const now = new Date();
    return now.toISOString().split('T')[0];
  });
  const [loading, setLoading] = useState(false);
  const [files, setFiles] = useState<File[]>([]);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Vérifier la taille des fichiers
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) {
          alert(`Le fichier ${file.name} est trop volumineux. Taille max: 10MB`);
          return false;
        }
        return true;
      });
      
      setFiles(prev => [...prev, ...validFiles]);
    }
  };

  const removeFile = (index: number) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  // FONCTION UPLOAD CORRIGÉE
  const uploadFile = async (file: File, reportId: string) => {
    try {
      console.log('🚀 Début upload fichier:', file.name);
      
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
      const filePath = `${reportId}/${fileName}`;

      console.log('📤 Upload vers:', filePath);

      // 1. Upload du fichier vers Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('reports')
        .upload(filePath, file);

      if (uploadError) {
        console.error('❌ Erreur upload:', uploadError);
        return null;
      }

      console.log('✅ Upload réussi:', uploadData);

      // 2. Récupérer l'URL publique
      const { data: urlData } = supabase.storage
        .from('reports')
        .getPublicUrl(filePath);

      console.log('🔗 URL publique:', urlData);

      return {
        name: file.name,
        url: urlData.publicUrl,
        path: filePath,
        size: file.size,
        type: file.type,
        uploaded_at: new Date().toISOString()
      };
    } catch (error) {
      console.error('💥 Erreur dans uploadFile:', error);
      return null;
    }
  };

  // FONCTION SUBMIT CORRIGÉE
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    console.log('📝 Début création rapport...');
    console.log('📎 Fichiers à uploader:', files);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      alert('❌ Vous devez être connecté');
      setLoading(false);
      return;
    }

    try {
      // ÉTAPE 1: Créer le rapport (sans pièces jointes d'abord)
      console.log('🆕 Création du rapport...');
      const { data: report, error: reportError } = await supabase
        .from('reports')
        .insert({
          user_id: session.user.id,
          date: date,
          title,
          content,
          attachments: [] // Tableau vide initial
        })
        .select()
        .single();

      if (reportError) {
        console.error('❌ Erreur création rapport:', reportError);
        throw reportError;
      }

      console.log('✅ Rapport créé:', report);

      // ÉTAPE 2: Uploader les fichiers si présents
      let uploadedFiles = [];
      if (files.length > 0 && report) {
        console.log('🔄 Début upload des fichiers...');
        
        for (const file of files) {
          console.log(`📤 Upload de: ${file.name}`);
          const uploadedFile = await uploadFile(file, report.id);
          
          if (uploadedFile) {
            console.log(`✅ Fichier uploadé: ${uploadedFile.name}`);
            uploadedFiles.push(uploadedFile);
          } else {
            console.log(`❌ Échec upload: ${file.name}`);
          }
        }

        console.log('📊 Fichiers uploadés:', uploadedFiles);

        // ÉTAPE 3: Mettre à jour le rapport avec les pièces jointes
        if (uploadedFiles.length > 0) {
          console.log('🔄 Mise à jour du rapport avec pièces jointes...');
          const { error: updateError } = await supabase
            .from('reports')
            .update({ 
              attachments: uploadedFiles,
              updated_at: new Date().toISOString()
            })
            .eq('id', report.id);

          if (updateError) {
            console.error('❌ Erreur mise à jour attachments:', updateError);
            throw updateError;
          }
          console.log('✅ Rapport mis à jour avec pièces jointes');
        } else {
          console.log('ℹ️ Aucun fichier à attacher');
        }
      }

      console.log('🎉 Redirection vers /reports');
      router.push('/reports');
      
    } catch (error) {
      console.error('💥 Erreur finale:', error);
      alert('Erreur lors de la création du rapport. Voir la console pour les détails.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour afficher l'aperçu des fichiers
  const renderFilePreview = (file: File, index: number) => {
    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0">
            <img 
              src={URL.createObjectURL(file)} 
              alt={file.name}
              className="h-12 w-12 object-cover rounded-lg"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <p className="text-sm text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center space-x-3">
        <div className="flex-shrink-0">
          <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
            <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {file.name}
          </p>
          <p className="text-sm text-gray-500">
            {(file.size / 1024 / 1024).toFixed(2)} MB
          </p>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-8 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Nouveau Rapport
          </h1>
          <p className="text-gray-600 mt-2">Remplissez les détails de votre activité d'alternance</p>
        </div>

        {/* Form Card */}
        <div className="bg-white rounded-2xl shadow-xl p-6 md:p-8">
          <form onSubmit={submit} className="space-y-6">
            {/* Date Field */}
            <div>
              <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                Date de l'activité *
              </label>
              <input
                id="date"
                type="date"
                required
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-gray-900"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </div>

            {/* Title Field */}
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-2">
                Titre de l'activité
              </label>
              <div className="relative">
                <input
                  id="title"
                  type="text"
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-gray-900"
                  placeholder="Ex: Développement d'une feature d'authentification"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>
            </div>

            {/* Content Field */}
            <div>
              <label htmlFor="content" className="block text-sm font-medium text-gray-700 mb-2">
                Description détaillée des activités
              </label>
              <div className="relative">
                <textarea
                  id="content"
                  required
                  rows={8}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 outline-none text-gray-900 resize-none"
                  placeholder="Décrivez en détail les tâches réalisées, les technologies utilisées, les difficultés rencontrées et les compétences acquises..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                />
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {content.length} caractères
              </p>
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Fichiers joints (optionnel)
              </label>
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-blue-400 transition-colors duration-200">
                <input
                  type="file"
                  multiple
                  onChange={handleFileSelect}
                  className="hidden"
                  id="file-upload"
                  accept=".png,.jpg,.jpeg,.gif,.pdf,.doc,.docx,.txt"
                />
                <label
                  htmlFor="file-upload"
                  className="cursor-pointer inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors duration-200"
                >
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  Ajouter des fichiers
                </label>
                <p className="text-sm text-gray-500 mt-2">
                  PNG, JPG, GIF, PDF, DOC, DOCX - Maximum 10MB par fichier
                </p>
              </div>

              {/* File List */}
              {files.length > 0 && (
                <div className="mt-4 space-y-3">
                  <h4 className="text-sm font-medium text-gray-700">
                    Fichiers sélectionnés ({files.length})
                  </h4>
                  {files.map((file, index) => (
                    <div key={index} className="flex items-center justify-between bg-gray-50 rounded-lg p-4 border border-gray-200">
                      {renderFilePreview(file, index)}
                      <button
                        type="button"
                        onClick={() => removeFile(index)}
                        className="text-red-600 hover:text-red-800 p-2 rounded-full hover:bg-red-50 transition-colors duration-200"
                      >
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 pt-4">
              <button
                type="button"
                onClick={() => router.back()}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium py-3 px-6 rounded-lg transition-all duration-200 text-center"
                disabled={loading}
              >
                Retour
              </button>
              
              <button
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? 'Enregistrement...' : 'Enregistrer le rapport'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}