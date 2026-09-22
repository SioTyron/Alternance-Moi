// app/reports/page.tsx
'use client';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { exportAllReportsToPDF } from '@/lib/exportReports';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import EmptyState from '@/components/EmptyState';

export default function ReportsPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();
  const [reports, setReports] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<any>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [exportingSelection, setExportingSelection] = useState(false);

  const toggleSelect = (id: string) => setSelected((prev) => {
    const next = new Set(prev);
    if (next.has(id)) next.delete(id); else next.add(id);
    return next;
  });
  const selectAll = () => setSelected(new Set(reports.map((r) => r.id)));
  const enterSelection = () => { setSelectionMode(true); setSelected(new Set()); };
  const exitSelection = () => { setSelectionMode(false); setSelected(new Set()); };

  const exportSelection = async () => {
    if (selected.size === 0 || exportingSelection) return;
    setExportingSelection(true);
    try {
      const subset = reports.filter((r) => selected.has(r.id));
      await exportAllReportsToPDF(subset);
      toast.success(`${subset.length} rapport${subset.length > 1 ? 's' : ''} exporté${subset.length > 1 ? 's' : ''} en PDF`);
      exitSelection();
    } catch (error) {
      console.error('Error exporting selection:', error);
      toast.error("Erreur lors de l'export PDF");
    } finally {
      setExportingSelection(false);
    }
  };

  useEffect(() => {
    const fetchReports = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const { data } = await supabase
        .from('reports')
        .select('*')
        .is('deleted_at', null)
        .order('date', { ascending: false });

      if (data) setReports(data);
      setLoading(false);
    };
    fetchReports();
  }, [router]);

  // CORRECTION : Fonction de formatage de date qui gère le format YYYY-MM-DD
  const formatDate = (dateString: string) => {
    // Si la date est déjà au format YYYY-MM-DD (stockée en base)
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
      return date.toLocaleDateString('fr-FR', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    }
    
    // Sinon, utiliser l'ancienne méthode pour la rétrocompatibilité
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  // CORRECTION : Fonction pour afficher la date simple (sans les détails)
  const formatSimpleDate = (dateString: string) => {
    if (dateString.match(/^\d{4}-\d{2}-\d{2}$/)) {
      const [year, month, day] = dateString.split('-');
      return `${day}/${month}/${year}`;
    }
    
    const date = new Date(dateString);
    return date.toLocaleDateString('fr-FR');
  };

  // FONCTION AMÉLIORÉE : Gestion des icônes de fichiers avec support du type MIME
  const getFileIcon = (fileName: string, fileType?: string) => {
    const ext = fileName.split('.').pop()?.toLowerCase();
    
    // Utiliser le type MIME si disponible
    if (fileType) {
      if (fileType.startsWith('image/')) {
        return (
          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      }
      if (fileType === 'application/pdf') {
        return (
          <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      }
    }

    switch (ext) {
      case 'pdf':
        return (
          <svg className="h-6 w-6 text-red-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'doc':
      case 'docx':
        return (
          <svg className="h-6 w-6 text-blue-500" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
          </svg>
        );
      case 'jpg':
      case 'jpeg':
      case 'png':
      case 'gif':
      case 'bmp':
      case 'webp':
        return (
          <svg className="h-6 w-6 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        );
      case 'txt':
        return (
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
      case 'zip':
      case 'rar':
      case '7z':
        return (
          <svg className="h-6 w-6 text-yellow-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
        );
      default:
        return (
          <svg className="h-6 w-6 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        );
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleExportAll = async () => {
    if (reports.length === 0 || exporting) return;
    setExporting(true);
    try {
      await exportAllReportsToPDF(reports);
      toast.success('Export PDF généré 📄');
    } catch (error) {
      console.error('Error exporting reports:', error);
      toast.error("Erreur lors de l'export PDF des rapports");
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async (reportId: string) => {
    const ok = await confirm({
      title: 'Supprimer le rapport',
      message: 'Le rapport sera déplacé dans la corbeille. Vous pourrez le restaurer pendant 30 jours.',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;

    const report = reports.find(r => r.id === reportId);
    setDeletingId(reportId);
    try {
      const { error } = await supabase
        .from('reports')
        .update({ deleted_at: new Date().toISOString() })
        .eq('id', reportId);

      if (error) throw error;

      setReports(reports.filter(r => r.id !== reportId));
      toast.info('Rapport déplacé dans la corbeille', {
        action: {
          label: 'Annuler',
          onClick: async () => {
            await supabase.from('reports').update({ deleted_at: null }).eq('id', reportId);
            if (report) setReports(prev => [report, ...prev].sort((a, b) => (b.date || '').localeCompare(a.date || '')));
          },
        },
      });
    } catch (error) {
      console.error('Error deleting report:', error);
      toast.error('Erreur lors de la suppression du rapport');
    } finally {
      setDeletingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-8">
            <div className="skeleton h-8 w-48 mx-auto" />
            <div className="skeleton h-4 w-64 mx-auto mt-3" />
          </div>
          <div className="space-y-6">
            {[0, 1, 2].map((i) => (
              <div key={i} className="card p-6">
                <div className="flex items-center gap-4 mb-4">
                  <div className="skeleton h-12 w-12" />
                  <div className="flex-1 space-y-2">
                    <div className="skeleton h-5 w-1/2" />
                    <div className="skeleton h-3 w-1/3" />
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="skeleton h-3 w-full" />
                  <div className="skeleton h-3 w-5/6" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Mes Rapports
          </h1>
          <p className="text-gray-600 mt-2">Consultez l'historique de vos activités d'alternance</p>

          {reports.length > 0 && (
            <div className="mt-5 flex flex-wrap items-center justify-center gap-2">
              {!selectionMode ? (
                <>
                  <button onClick={handleExportAll} disabled={exporting} className="btn btn-primary py-2.5 px-5 text-sm">
                    {exporting ? (
                      <span className="flex items-center gap-2"><span className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Export en cours…</span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                        Tout exporter en PDF
                      </span>
                    )}
                  </button>
                  <button onClick={enterSelection} className="btn py-2.5 px-5 text-sm border border-slate-300 text-slate-700 hover:bg-slate-100">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                    Choisir les rapports à exporter
                  </button>
                </>
              ) : (
                <div className="inline-flex items-center gap-2 rounded-full bg-blue-50 text-blue-700 text-sm font-medium px-4 py-2 ring-1 ring-blue-100 animate-in">
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 2.239l.777 2.897M5.136 7.965l-2.898-.777M13.95 4.05l-2.122 2.122m-5.657 5.656l-2.12 2.122" /></svg>
                  Touchez les rapports à inclure dans l&apos;export
                </div>
              )}
            </div>
          )}
        </div>

        {/* Stats Card */}
        {reports.length > 0 && (
          <div className="card p-6 mb-8">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-center">
              <div className="bg-blue-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-blue-600">{reports.length}</div>
                <div className="text-sm text-blue-800">Rapports</div>
              </div>
              <div className="bg-purple-50 rounded-lg p-4">
                <div className="text-2xl font-bold text-purple-600">
                  {reports.length > 0 ? formatSimpleDate(reports[0].date) : 'Aucun'}
                </div>
                <div className="text-sm text-purple-800">Dernier rapport</div>
              </div>
            </div>
          </div>
        )}

        {/* Reports List */}
        <div className="space-y-6">
          {reports.length === 0 ? (
            <EmptyState
              icon={<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />}
              title="Aucun rapport pour le moment"
              description="Commencez par créer votre premier rapport d'activité d'alternance."
              action={<Link href="/new-report" className="btn btn-primary py-3 px-6">Créer un rapport</Link>}
            />
          ) : (
            reports.map((report) => (
              <div
                key={report.id}
                onClick={selectionMode ? () => toggleSelect(report.id) : undefined}
                className={`card overflow-hidden transition-all duration-300 ${
                  selectionMode
                    ? 'cursor-pointer ' + (selected.has(report.id) ? 'ring-2 ring-blue-500 bg-blue-50/40' : 'hover:ring-2 hover:ring-blue-200')
                    : 'hover:shadow-xl'
                }`}
              >
                <div className="p-6">
                  {/* Header */}
                  <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between mb-4">
                    <div className="flex items-start space-x-4">
                      <div className="h-12 w-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center flex-shrink-0">
                        <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-xl font-semibold text-gray-900 line-clamp-2">
                          {report.title}
                        </h2>
                        <div className="flex items-center mt-1 text-sm text-gray-500">
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          {formatDate(report.date)}
                        </div>
                      </div>
                    </div>
                    {selectionMode && (
                      <div className="flex-shrink-0 mt-3 sm:mt-1">
                        {selected.has(report.id) ? (
                          <span className="h-6 w-6 rounded-full bg-blue-600 text-white flex items-center justify-center pop-in">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>
                          </span>
                        ) : (
                          <span className="h-6 w-6 rounded-full border-2 border-slate-300 block" />
                        )}
                      </div>
                    )}
                  </div>

                  {/* Content Preview */}
                  <div className="mb-4">
                    <p className="text-gray-700 line-clamp-3">
                      {report.content}
                    </p>
                  </div>

                  {/* Attachments Preview - VERSION AMÉLIORÉE */}
                  {report.attachments && report.attachments.length > 0 && (
                    <div className="mb-4">
                      <div className="flex items-center text-sm text-gray-600 mb-2">
                        <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.172 7l-6.586 6.586a2 2 0 102.828 2.828l6.414-6.586a4 4 0 00-5.656-5.656l-6.415 6.585a6 6 0 108.486 8.486L20.5 13" />
                        </svg>
                        {report.attachments.length} fichier(s) joint(s)
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {report.attachments.slice(0, 3).map((file: any, index: number) => (
                          <div key={index} className="flex items-center bg-gray-50 rounded-lg px-3 py-2 border border-gray-200">
                            {getFileIcon(file.name, file.type)}
                            <span className="text-sm text-gray-700 ml-2 max-w-20 truncate">
                              {file.name}
                            </span>
                          </div>
                        ))}
                        {report.attachments.length > 3 && (
                          <div className="flex items-center bg-gray-100 rounded-lg px-3 py-2">
                            <span className="text-sm text-gray-600">
                              +{report.attachments.length - 3} autres
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Actions (masquées en mode sélection) */}
                  {!selectionMode && (
                  <div className="flex justify-between items-center pt-4 border-t border-gray-100">
                    <button
                      onClick={() => setSelectedReport(selectedReport?.id === report.id ? null : report)}
                      className="text-blue-600 hover:text-blue-700 font-medium text-sm flex items-center transition-colors duration-200"
                    >
                      {selectedReport?.id === report.id ? (
                        <>
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                          </svg>
                          Voir moins
                        </>
                      ) : (
                        <>
                          <svg className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                          </svg>
                          Voir plus
                        </>
                      )}
                    </button>
                    
                    <div className="flex items-center space-x-4">
                      <div className="text-xs text-gray-500">
                        Créé le {new Date(report.created_at).toLocaleDateString('fr-FR')}
                      </div>
                      
                      {/* Boutons d'action */}
                      <div className="flex space-x-2">
                        <Link
                          href={`/reports/${report.id}/edit`}
                          className="text-blue-600 hover:text-blue-800 font-medium text-sm transition-colors duration-200"
                        >
                          Modifier
                        </Link>
                        
                        <button
                          onClick={() => handleDelete(report.id)}
                          disabled={deletingId === report.id}
                          className="text-red-600 hover:text-red-800 font-medium text-sm transition-colors duration-200 disabled:opacity-50"
                        >
                          {deletingId === report.id ? 'Suppression...' : 'Supprimer'}
                        </button>
                      </div>
                    </div>
                  </div>
                  )}

                  {/* Expanded Content - VERSION COMPLÈTEMENT AMÉLIORÉE */}
                  {!selectionMode && selectedReport?.id === report.id && (
                    <div className="mt-4 pt-4 border-t border-gray-100 space-y-4">
                      {/* Detailed Content */}
                      <div>
                        <h4 className="font-semibold text-gray-900 mb-3">Détails de l'activité :</h4>
                        <div className="bg-gray-50 rounded-lg p-4">
                          <p className="text-gray-700 whitespace-pre-wrap">
                            {report.content}
                          </p>
                        </div>
                      </div>

                      {/* Detailed Attachments - VERSION COMPLÈTEMENT AMÉLIORÉE */}
                      {report.attachments && report.attachments.length > 0 && (
                        <div>
                          <h4 className="font-semibold text-gray-900 mb-3">Fichiers joints :</h4>
                          <div className="grid gap-3">
                            {report.attachments.map((file: any, index: number) => (
                              <div
                                key={index}
                                className="flex items-center justify-between bg-white border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200"
                              >
                                <div className="flex items-center space-x-3 flex-1 min-w-0">
                                  {/* Aperçu des images */}
                                  {file.type && file.type.startsWith('image/') ? (
                                    <div className="flex-shrink-0">
                                      <img 
                                        src={file.url} 
                                        alt={file.name}
                                        className="h-16 w-16 object-cover rounded-lg border border-gray-200"
                                        onError={(e) => {
                                          // Fallback si l'image ne charge pas
                                          e.currentTarget.style.display = 'none';
                                        }}
                                      />
                                    </div>
                                  ) : (
                                    <div className="flex-shrink-0">
                                      <div className="h-16 w-16 bg-gray-100 rounded-lg flex items-center justify-center border border-gray-200">
                                        {getFileIcon(file.name, file.type)}
                                      </div>
                                    </div>
                                  )}
                                  
                                  <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-gray-900 truncate">
                                      {file.name}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                      {formatFileSize(file.size || 0)}
                                    </p>
                                    <p className="text-xs text-gray-400 mt-1">
                                      {file.type || 'Type inconnu'}
                                    </p>
                                  </div>
                                </div>
                                
                                <div className="flex items-center space-x-2 ml-4">
                                  {/* Bouton de prévisualisation pour les images et PDF */}
                                  {(file.type?.startsWith('image/') || file.type === 'application/pdf') && (
                                    <button
                                      onClick={() => window.open(file.url, '_blank')}
                                      className="text-blue-600 hover:text-blue-800 p-2 rounded-full hover:bg-blue-50 transition-colors duration-200"
                                      title="Ouvrir"
                                    >
                                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                      </svg>
                                    </button>
                                  )}
                                  
                                  {/* Bouton de téléchargement pour tous les fichiers */}
                                  <a
                                    href={file.url}
                                    download={file.name}
                                    className="text-green-600 hover:text-green-800 p-2 rounded-full hover:bg-green-50 transition-colors duration-200"
                                    title="Télécharger"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                    </svg>
                                  </a>
                                  
                                  {/* Bouton d'ouverture dans un nouvel onglet */}
                                  <a
                                    href={file.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-purple-600 hover:text-purple-800 p-2 rounded-full hover:bg-purple-50 transition-colors duration-200"
                                    title="Ouvrir dans un nouvel onglet"
                                  >
                                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                  </a>
                                </div>
                              </div>
                            ))}
                          </div>
                          
                          {/* Message d'information */}
                          <div className="mt-3 bg-blue-50 border border-blue-200 rounded-lg p-3">
                            <p className="text-sm text-blue-700 flex items-center">
                              <svg className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                              </svg>
                              Cliquez sur les icônes pour visualiser, télécharger ou ouvrir vos fichiers
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Barre d'action de sélection */}
      {selectionMode && (
        <div className="fixed inset-x-0 bottom-4 z-40 flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto card px-4 py-3 flex items-center gap-2 sm:gap-3 shadow-xl toast-in">
            <span className="text-sm font-medium text-slate-700 whitespace-nowrap">
              {selected.size} sélectionné{selected.size > 1 ? 's' : ''}
            </span>
            <button onClick={selectAll} className="text-sm text-slate-500 hover:text-blue-700 whitespace-nowrap px-2 py-1">Tout</button>
            <button onClick={exitSelection} className="text-sm text-slate-500 hover:text-slate-700 whitespace-nowrap px-2 py-1">Annuler</button>
            <button onClick={exportSelection} disabled={exportingSelection || selected.size === 0} className="btn btn-primary px-4 py-2 text-sm whitespace-nowrap">
              {exportingSelection ? 'Export…' : `Exporter${selected.size ? ` (${selected.size})` : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}