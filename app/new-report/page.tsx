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
  const [uploadingFiles, setUploadingFiles] = useState<Set<string>>(new Set());

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      
      // Vérifier la taille des fichiers
      const validFiles = newFiles.filter(file => {
        if (file.size > 10 * 1024 * 1024) { // 10MB
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

  const uploadFile = async (file: File, reportId: string): Promise<any> => {
    const fileExt = file.name.split('.').pop();
    const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
    const filePath = `${reportId}/${fileName}`;

    // Marquer le fichier comme en cours d'upload
    setUploadingFiles(prev => new Set(prev).add(file.name));

    const { error } = await supabase.storage
      .from('reports')
      .upload(filePath, file);

    if (error) {
      console.error('Error uploading file:', error);
      // Retirer le fichier de la liste d'upload en cas d'erreur
      setUploadingFiles(prev => {
        const newSet = new Set(prev);
        newSet.delete(file.name);
        return newSet;
      });
      return null;
    }

    const { data: { publicUrl } } = supabase.storage
      .from('reports')
      .getPublicUrl(filePath);

    // Retirer le fichier de la liste d'upload une fois terminé
    setUploadingFiles(prev => {
      const newSet = new Set(prev);
      newSet.delete(file.name);
      return newSet;
    });

    return {
      name: file.name,
      url: publicUrl,
      path: filePath,
      size: file.size,
      type: file.type,
      uploaded_at: new Date().toISOString()
    };
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      setLoading(false);
      return;
    }

    try {
      // Créer le rapport d'abord
      const { data: report, error } = await supabase
        .from('reports')
        .insert({
          user_id: session.user.id,
          date: date,
          title,
          content,
          attachments: [] // Initialiser avec un tableau vide
        })
        .select()
        .single();

      if (error) throw error;

      // Uploader les fichiers si présents
      let uploadedFiles = [];
      if (files.length > 0 && report) {
        for (const file of files) {
          const uploadedFile = await uploadFile(file, report.id);
          if (uploadedFile) {
            uploadedFiles.push(uploadedFile);
          }
        }

        // Mettre à jour le rapport avec les fichiers uploadés
        if (uploadedFiles.length > 0) {
          const { error: updateError } = await supabase
            .from('reports')
            .update({ 
              attachments: uploadedFiles,
              updated_at: new Date().toISOString()
            })
            .eq('id', report.id);

          if (updateError) throw updateError;
        }
      }

      router.push('/reports');
    } catch (error) {
      console.error('Error creating report:', error);
      alert('Erreur lors de la création du rapport. Veuillez réessayer.');
    } finally {
      setLoading(false);
    }
  };

  // Fonction pour afficher l'aperçu des images
  const renderFilePreview = (file: File, index: number) => {
    const isUploading = uploadingFiles.has(file.name);

    if (file.type.startsWith('image/')) {
      return (
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 relative">
            <img 
              src={URL.createObjectURL(file)} 
              alt={file.name}
              className="h-12 w-12 object-cover rounded-lg"
            />
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <p className="text-sm text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            {isUploading && (
              <div className="flex items-center space-x-2 mt-1">
                <div className="text-xs text-blue-600">Upload en cours...</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="flex items-center justify-between w-full">
        <div className="flex items-center space-x-3">
          <div className="flex-shrink-0 relative">
            <div className="h-12 w-12 bg-gray-100 rounded-lg flex items-center justify-center">
              <svg className="h-6 w-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            {isUploading && (
              <div className="absolute inset-0 bg-black bg-opacity-50 rounded-lg flex items-center justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">
              {file.name}
            </p>
            <p className="text-sm text-gray-500">
              {(file.size / 1024 / 1024).toFixed(2)} MB
            </p>
            {isUploading && (
              <div className="flex items-center space-x-2 mt-1">
                <div className="text-xs text-blue-600">Upload en cours...</div>
              </div>
            )}
          </div>
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
                <div className="absolute inset-y-0 right-0 flex items-center pr-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                </div>
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
                <div className="absolute top-3 right-3">
                  <svg className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
              </div>
              <p className="mt-2 text-sm text-gray-500">
                {content.length} caractères
              </p>
            </div>

            {/* File Upload - SECTION AMÉLIORÉE */}
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

              {/* File List - AMÉLIORÉE */}
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
                        disabled={uploadingFiles.has(file.name)}
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
                <div className="flex items-center justify-center">
                  <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                  </svg>
                  Retour
                </div>
              </button>
              
              <button
                type="submit"
                disabled={loading || !title.trim() || !content.trim()}
                className="flex-1 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-medium py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02]"
              >
                {loading ? (
                  <div className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    Enregistrement...
                  </div>
                ) : (
                  <div className="flex items-center justify-center">
                    <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    Enregistrer le rapport
                  </div>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Tips Section */}
        <div className="mt-8 bg-blue-50 rounded-xl p-6 border border-blue-200">
          <h3 className="font-semibold text-blue-800 mb-3 flex items-center">
            <svg className="h-5 w-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            Conseils pour un bon rapport
          </h3>
          <ul className="text-blue-700 text-sm space-y-2">
            <li>• Soyez précis et détaillé dans vos descriptions</li>
            <li>• Mentionnez les technologies et outils utilisés</li>
            <li>• Notez les difficultés rencontrées et comment vous les avez résolues</li>
            <li>• Décrivez les compétences acquises ou développées</li>
            <li>• Ajoutez des captures d'écran ou documents pour illustrer votre travail</li>
          </ul>
        </div>
      </div>
    </div>
  );
}