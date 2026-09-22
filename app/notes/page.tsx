// app/notes/page.tsx
'use client';
import { useEffect, useState, Fragment } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useRouter } from 'next/navigation';
import { useToast } from '@/components/Toast';
import { useConfirm } from '@/components/Confirm';
import EmptyState from '@/components/EmptyState';
import Sparkline from '@/components/Sparkline';
import {
  Formation,
  Semester,
  UE,
  Grade,
  ueAverage,
  overallAverage,
  annualAverage,
  runningAverages,
  formatAverage,
  averageColor,
} from '@/lib/notes';

type FormationForm = { name: string; school: string; level: string; academic_year: string };
const EMPTY_FORMATION: FormationForm = { name: '', school: '', level: '', academic_year: '' };
type GradeInput = { value: string; coefficient: string; label: string };
const EMPTY_GRADE: GradeInput = { value: '', coefficient: '', label: '' };
type ViewMode = 'cards' | 'list' | 'table';

export default function NotesPage() {
  const router = useRouter();
  const toast = useToast();
  const confirm = useConfirm();

  const [userId, setUserId] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [semesters, setSemesters] = useState<Semester[]>([]);
  const [ues, setUes] = useState<UE[]>([]);

  const [showFormationForm, setShowFormationForm] = useState(false);
  const [editingFormation, setEditingFormation] = useState(false);
  const [formationForm, setFormationForm] = useState<FormationForm>(EMPTY_FORMATION);
  const [newUeInputs, setNewUeInputs] = useState<Record<string, string>>({});
  const [gradeInputs, setGradeInputs] = useState<Record<string, GradeInput>>({});
  const [editingGradeId, setEditingGradeId] = useState<string | null>(null);
  const [editGrade, setEditGrade] = useState<GradeInput>(EMPTY_GRADE);
  const [editingUeId, setEditingUeId] = useState<string | null>(null);
  const [editUeName, setEditUeName] = useState('');
  const [editingSemesterId, setEditingSemesterId] = useState<string | null>(null);
  const [editSemesterName, setEditSemesterName] = useState('');
  const [busy, setBusy] = useState(false);

  const [viewMode, setViewMode] = useState<ViewMode>('cards');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  const selectedFormation = formations.find((f) => f.id === selectedId) || null;
  const semUes = (semesterId: string) => ues.filter((u) => u.semester_id === semesterId);
  const semesterAverage = (semesterId: string) => overallAverage(semUes(semesterId));
  const annual = annualAverage(semesters.map((s) => semesterAverage(s.id)));

  useEffect(() => {
    try {
      const saved = localStorage.getItem('notes_view') as ViewMode | null;
      if (saved === 'cards' || saved === 'list' || saved === 'table') setViewMode(saved);
    } catch { /* ignore */ }
  }, []);

  const changeView = (mode: ViewMode) => {
    setViewMode(mode);
    try { localStorage.setItem('notes_view', mode); } catch { /* ignore */ }
  };

  const toggleExpand = (ueId: string) => setExpanded((prev) => ({ ...prev, [ueId]: !prev[ueId] }));

  // ---- Chargement ----------------------------------------------------
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }
      const uid = session.user.id;
      setUserId(uid);

      const { data } = await supabase
        .from('formations')
        .select('id, name, school, level, academic_year')
        .is('deleted_at', null)
        .order('created_at', { ascending: true });

      const list = (data as Formation[]) || [];
      setFormations(list);
      if (list.length > 0) {
        setSelectedId(list[0].id);
        await loadFormationData(list[0].id, uid);
      }
      setLoading(false);
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  const loadFormationData = async (formationId: string, uid: string) => {
    const [semRes, ueRes] = await Promise.all([
      supabase.from('semesters').select('id, formation_id, name, position').eq('formation_id', formationId).is('deleted_at', null).order('position', { ascending: true }),
      supabase.from('ues').select('id, formation_id, semester_id, name, grades(id, ue_id, label, value, coefficient, created_at)').eq('formation_id', formationId).is('deleted_at', null).order('created_at', { ascending: true }),
    ]);

    let sems = (semRes.data as Semester[]) || [];
    // Toute formation doit avoir au moins un semestre
    if (sems.length === 0) {
      const { data: created } = await supabase
        .from('semesters')
        .insert({ formation_id: formationId, user_id: uid, name: 'Semestre 1', position: 1 })
        .select('id, formation_id, name, position')
        .single();
      if (created) sems = [created as Semester];
    }
    setSemesters(sems);
    setUes((ueRes.data as UE[]) || []);
  };

  const selectFormation = async (id: string) => {
    setSelectedId(id);
    setEditingFormation(false);
    await loadFormationData(id, userId);
  };

  // ---- Formations ---------------------------------------------------
  const saveFormation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formationForm.name.trim()) return;
    setBusy(true);
    const payload = {
      name: formationForm.name.trim(),
      school: formationForm.school.trim() || null,
      level: formationForm.level.trim() || null,
      academic_year: formationForm.academic_year.trim() || null,
    };

    if (editingFormation && selectedId) {
      const { data } = await supabase.from('formations').update(payload).eq('id', selectedId).select('id, name, school, level, academic_year').single();
      if (data) setFormations((prev) => prev.map((f) => (f.id === data.id ? (data as Formation) : f)));
      setEditingFormation(false);
      toast.success('Formation mise à jour');
    } else {
      const { data } = await supabase.from('formations').insert({ ...payload, user_id: userId }).select('id, name, school, level, academic_year').single();
      if (data) {
        setFormations((prev) => [...prev, data as Formation]);
        setSelectedId(data.id);
        await loadFormationData(data.id, userId);
      }
      setShowFormationForm(false);
      toast.success('Formation créée 🎓');
    }
    setFormationForm(EMPTY_FORMATION);
    setBusy(false);
  };

  const deleteFormation = async () => {
    if (!selectedFormation) return;
    const ok = await confirm({
      title: 'Supprimer la formation',
      message: `« ${selectedFormation.name} » et tout son contenu iront dans la corbeille (restaurable 30 jours).`,
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    setBusy(true);
    await supabase.from('formations').update({ deleted_at: new Date().toISOString() }).eq('id', selectedFormation.id);
    const remaining = formations.filter((f) => f.id !== selectedFormation.id);
    setFormations(remaining);
    setEditingFormation(false);
    if (remaining.length > 0) {
      await selectFormation(remaining[0].id);
    } else {
      setSelectedId('');
      setSemesters([]);
      setUes([]);
    }
    toast.info('Formation déplacée dans la corbeille');
    setBusy(false);
  };

  const startEditFormation = () => {
    if (!selectedFormation) return;
    setFormationForm({
      name: selectedFormation.name,
      school: selectedFormation.school ?? '',
      level: selectedFormation.level ?? '',
      academic_year: selectedFormation.academic_year ?? '',
    });
    setEditingFormation(true);
    setShowFormationForm(false);
  };

  // ---- Semestres -----------------------------------------------------
  const addSemester = async () => {
    if (!selectedId) return;
    const position = semesters.length + 1;
    const { data } = await supabase
      .from('semesters')
      .insert({ formation_id: selectedId, user_id: userId, name: `Semestre ${position}`, position })
      .select('id, formation_id, name, position')
      .single();
    if (data) {
      setSemesters((prev) => [...prev, data as Semester]);
      toast.success('Semestre ajouté');
    }
  };

  const startEditSemester = (s: Semester) => {
    setEditingSemesterId(s.id);
    setEditSemesterName(s.name);
  };

  const saveEditSemester = async (e: React.FormEvent, semesterId: string) => {
    e.preventDefault();
    const name = editSemesterName.trim();
    if (!name) return;
    await supabase.from('semesters').update({ name }).eq('id', semesterId);
    setSemesters((prev) => prev.map((s) => (s.id === semesterId ? { ...s, name } : s)));
    setEditingSemesterId(null);
    setEditSemesterName('');
    toast.success('Semestre renommé');
  };

  const deleteSemester = async (semesterId: string) => {
    if (semesters.length <= 1) {
      toast.error('Une formation doit garder au moins un semestre.');
      return;
    }
    const ok = await confirm({
      title: 'Supprimer le semestre',
      message: 'Ce semestre et ses UE iront dans la corbeille (restaurable 30 jours).',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    await supabase.from('semesters').update({ deleted_at: new Date().toISOString() }).eq('id', semesterId);
    setSemesters((prev) => prev.filter((s) => s.id !== semesterId));
    setUes((prev) => prev.filter((u) => u.semester_id !== semesterId));
    toast.info('Semestre déplacé dans la corbeille');
  };

  // ---- UE ------------------------------------------------------------
  const setNewUeInput = (semesterId: string, value: string) =>
    setNewUeInputs((prev) => ({ ...prev, [semesterId]: value }));

  const addUe = async (e: React.FormEvent, semesterId: string) => {
    e.preventDefault();
    const name = (newUeInputs[semesterId] || '').trim();
    if (!name || !selectedId) return;
    const { data } = await supabase
      .from('ues')
      .insert({ formation_id: selectedId, semester_id: semesterId, user_id: userId, name })
      .select('id, formation_id, semester_id, name')
      .single();
    if (data) {
      setUes((prev) => [...prev, { ...(data as UE), grades: [] }]);
      setNewUeInputs((prev) => ({ ...prev, [semesterId]: '' }));
      toast.success('UE ajoutée');
    }
  };

  const deleteUe = async (ueId: string) => {
    const ok = await confirm({
      title: "Supprimer l'UE",
      message: 'Cette UE et ses notes iront dans la corbeille (restaurable 30 jours).',
      confirmLabel: 'Supprimer',
      danger: true,
    });
    if (!ok) return;
    await supabase.from('ues').update({ deleted_at: new Date().toISOString() }).eq('id', ueId);
    setUes((prev) => prev.filter((u) => u.id !== ueId));
    toast.info('UE déplacée dans la corbeille');
  };

  const startEditUe = (ue: UE) => {
    setEditingUeId(ue.id);
    setEditUeName(ue.name);
  };

  const cancelEditUe = () => {
    setEditingUeId(null);
    setEditUeName('');
  };

  const saveEditUe = async (e: React.FormEvent, ueId: string) => {
    e.preventDefault();
    const name = editUeName.trim();
    if (!name) return;
    await supabase.from('ues').update({ name }).eq('id', ueId);
    setUes((prev) => prev.map((u) => (u.id === ueId ? { ...u, name } : u)));
    cancelEditUe();
    toast.success('UE renommée');
  };

  // ---- Notes ---------------------------------------------------------
  const setGradeInput = (ueId: string, patch: Partial<GradeInput>) => {
    setGradeInputs((prev) => ({ ...prev, [ueId]: { ...EMPTY_GRADE, ...prev[ueId], ...patch } }));
  };

  const addGrade = async (e: React.FormEvent, ueId: string) => {
    e.preventDefault();
    const input = gradeInputs[ueId] || EMPTY_GRADE;
    const value = parseFloat(input.value.replace(',', '.'));
    if (isNaN(value) || value < 0 || value > 20) {
      toast.error('La note doit être un nombre entre 0 et 20.');
      return;
    }
    let coefficient = parseFloat((input.coefficient || '1').replace(',', '.'));
    if (isNaN(coefficient) || coefficient <= 0) coefficient = 1;

    const { data } = await supabase
      .from('grades')
      .insert({ ue_id: ueId, user_id: userId, value, coefficient, label: input.label.trim() || null })
      .select('id, ue_id, label, value, coefficient, created_at')
      .single();

    if (data) {
      setUes((prev) => prev.map((u) => (u.id === ueId ? { ...u, grades: [...u.grades, data as Grade] } : u)));
      setGradeInputs((prev) => ({ ...prev, [ueId]: EMPTY_GRADE }));
      toast.success('Note ajoutée');
    }
  };

  const startEditGrade = (g: Grade) => {
    setEditingGradeId(g.id);
    setEditGrade({
      value: String(Number(g.value)),
      coefficient: Number(g.coefficient) === 1 ? '' : String(Number(g.coefficient)),
      label: g.label ?? '',
    });
  };

  const cancelEditGrade = () => {
    setEditingGradeId(null);
    setEditGrade(EMPTY_GRADE);
  };

  const saveEditGrade = async (e: React.FormEvent, ueId: string) => {
    e.preventDefault();
    if (!editingGradeId) return;
    const value = parseFloat(editGrade.value.replace(',', '.'));
    if (isNaN(value) || value < 0 || value > 20) {
      toast.error('La note doit être un nombre entre 0 et 20.');
      return;
    }
    let coefficient = parseFloat((editGrade.coefficient || '1').replace(',', '.'));
    if (isNaN(coefficient) || coefficient <= 0) coefficient = 1;

    const { data } = await supabase
      .from('grades')
      .update({ value, coefficient, label: editGrade.label.trim() || null })
      .eq('id', editingGradeId)
      .select('id, ue_id, label, value, coefficient, created_at')
      .single();

    if (data) {
      setUes((prev) => prev.map((u) => (u.id === ueId ? { ...u, grades: u.grades.map((g) => (g.id === data.id ? (data as Grade) : g)) } : u)));
      toast.success('Note modifiée');
    }
    cancelEditGrade();
  };

  const deleteGrade = async (ueId: string, grade: Grade) => {
    setUes((prev) => prev.map((u) => (u.id === ueId ? { ...u, grades: u.grades.filter((g) => g.id !== grade.id) } : u)));
    await supabase.from('grades').delete().eq('id', grade.id);
    toast.info('Note supprimée', {
      action: {
        label: 'Annuler',
        onClick: async () => {
          const { data } = await supabase
            .from('grades')
            .insert({ ue_id: grade.ue_id, user_id: userId, value: grade.value, coefficient: grade.coefficient, label: grade.label })
            .select('id, ue_id, label, value, coefficient, created_at')
            .single();
          if (data) setUes((prev) => prev.map((u) => (u.id === ueId ? { ...u, grades: [...u.grades, data as Grade] } : u)));
        },
      },
    });
  };

  const fmtCoef = (c: number) => (Number(c) === 1 ? '' : ` · coef ${Number(c)}`);

  // ---- Blocs réutilisables ------------------------------------------
  const sparkline = (ue: UE, w = 132, h = 40) =>
    ue.grades.length >= 2 ? <Sparkline data={runningAverages(ue.grades)} width={w} height={h} /> : null;

  const gradeChips = (ue: UE) =>
    ue.grades.length > 0 ? (
      <div className="flex flex-wrap gap-2">
        {ue.grades.map((g) =>
          editingGradeId === g.id ? (
            <form key={g.id} onSubmit={(e) => saveEditGrade(e, ue.id)} className="inline-flex items-center gap-1.5 bg-blue-50 border border-blue-300 rounded-lg px-2 py-1.5">
              <input type="number" step="0.01" min="0" max="20" required autoFocus value={editGrade.value} onChange={(e) => setEditGrade({ ...editGrade, value: e.target.value })} className="w-16 px-2 py-1 border border-slate-300 rounded text-sm" title="Note /20" />
              <input type="number" step="0.01" min="0" value={editGrade.coefficient} onChange={(e) => setEditGrade({ ...editGrade, coefficient: e.target.value })} placeholder="coef" className="w-14 px-2 py-1 border border-slate-300 rounded text-sm" title="Coefficient" />
              <input type="text" value={editGrade.label} onChange={(e) => setEditGrade({ ...editGrade, label: e.target.value })} placeholder="libellé" className="w-24 px-2 py-1 border border-slate-300 rounded text-sm" title="Libellé" />
              <button type="submit" className="text-green-600 hover:text-green-700 p-0.5" title="Enregistrer">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
              </button>
              <button type="button" onClick={cancelEditGrade} className="text-slate-400 hover:text-slate-600 p-0.5" title="Annuler">
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </form>
          ) : (
            <span key={g.id} className="inline-flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg pl-3 pr-1.5 py-1.5 text-sm">
              <span className="font-semibold text-slate-800">{Number(g.value)}</span>
              <span className="text-slate-400">/20</span>
              {g.label && <span className="text-slate-500">· {g.label}</span>}
              <span className="text-slate-400">{fmtCoef(g.coefficient)}</span>
              <button onClick={() => startEditGrade(g)} className="ml-1 text-slate-300 hover:text-blue-600" title="Modifier la note">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
              </button>
              <button onClick={() => deleteGrade(ue.id, g)} className="text-slate-300 hover:text-red-500" title="Supprimer la note">
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </span>
          )
        )}
      </div>
    ) : (
      <p className="text-sm text-slate-400">Aucune note pour cette UE.</p>
    );

  const addGradeForm = (ue: UE) => {
    const input = gradeInputs[ue.id] || EMPTY_GRADE;
    return (
      <form onSubmit={(e) => addGrade(e, ue.id)} className="flex flex-wrap items-end gap-2">
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Note /20 *</label>
          <input type="number" step="0.01" min="0" max="20" required value={input.value} onChange={(e) => setGradeInput(ue.id, { value: e.target.value })} placeholder="14.5" className="w-24 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div>
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Coef.</label>
          <input type="number" step="0.01" min="0" value={input.coefficient} onChange={(e) => setGradeInput(ue.id, { coefficient: e.target.value })} placeholder="1" className="w-20 px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <div className="flex-1 min-w-[120px]">
          <label className="block text-[11px] font-medium text-slate-500 mb-1">Libellé (optionnel)</label>
          <input type="text" value={input.label} onChange={(e) => setGradeInput(ue.id, { label: e.target.value })} placeholder="Ex. DS1" className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm" />
        </div>
        <button type="submit" className="btn btn-primary px-4 py-2 text-sm">Ajouter</button>
      </form>
    );
  };

  const ueNameForm = (ue: UE) => (
    <form onSubmit={(e) => saveEditUe(e, ue.id)} className="flex items-center gap-1.5">
      <input autoFocus required value={editUeName} onChange={(e) => setEditUeName(e.target.value)} className="px-2 py-1 border border-slate-300 rounded text-sm font-medium min-w-0" />
      <button type="submit" className="text-green-600 hover:text-green-700 p-0.5" title="Enregistrer">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
      </button>
      <button type="button" onClick={cancelEditUe} className="text-slate-400 hover:text-slate-600 p-0.5" title="Annuler">
        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </form>
  );

  const ueEditBtn = (ue: UE) => (
    <button onClick={() => startEditUe(ue)} className="text-slate-300 hover:text-blue-600 p-0.5" title="Renommer l'UE">
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
    </button>
  );

  const trashBtn = (onClick: () => void, title: string) => (
    <button onClick={onClick} className="text-slate-300 hover:text-red-500 transition-colors p-1" title={title}>
      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  );

  // ---- Vues (reçoivent la liste d'UE d'un semestre) -----------------
  const renderCards = (list: UE[]) => (
    <div className="space-y-4">
      {list.map((ue) => (
        <div key={ue.id} className="card p-6 animate-in">
          <div className="flex items-start justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 bg-gradient-to-br from-blue-500 to-indigo-500 rounded-lg flex items-center justify-center text-white flex-shrink-0">
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" /></svg>
              </div>
              {editingUeId === ue.id ? ueNameForm(ue) : (
                <div className="flex items-center gap-1.5">
                  <h3 className="text-lg font-semibold text-slate-900">{ue.name}</h3>
                  {ueEditBtn(ue)}
                </div>
              )}
            </div>
            <div className="flex items-center gap-3">
              <div className="text-right">
                <div className={`text-xl font-bold ${averageColor(ueAverage(ue.grades))}`}>{formatAverage(ueAverage(ue.grades))}</div>
                <div className="text-[11px] text-slate-400 -mt-0.5">moyenne UE</div>
              </div>
              {trashBtn(() => deleteUe(ue.id), "Supprimer l'UE")}
            </div>
          </div>
          {ue.grades.length >= 2 && (
            <div className="flex items-center justify-end gap-2 mb-3 -mt-1">
              <span className="text-[11px] uppercase tracking-wide text-slate-400">Évolution</span>
              {sparkline(ue)}
            </div>
          )}
          <div className="mb-4">{gradeChips(ue)}</div>
          <div className="pt-3 border-t border-slate-100">{addGradeForm(ue)}</div>
        </div>
      ))}
    </div>
  );

  const renderList = (list: UE[]) => (
    <div className="card divide-y divide-slate-100 animate-in overflow-hidden">
      {list.map((ue) => {
        const avg = ueAverage(ue.grades);
        const open = !!expanded[ue.id];
        return (
          <div key={ue.id}>
            <div className="w-full flex items-center justify-between gap-3 px-5 py-4">
              {editingUeId === ue.id ? (
                <div className="flex-1 min-w-0">{ueNameForm(ue)}</div>
              ) : (
                <button onClick={() => toggleExpand(ue.id)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
                  <svg className={`h-4 w-4 text-slate-400 transition-transform flex-shrink-0 ${open ? 'rotate-90' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
                  <span className="font-medium text-slate-900 truncate">{ue.name}</span>
                  <span className="text-xs text-slate-400 flex-shrink-0">{ue.grades.length} note{ue.grades.length > 1 ? 's' : ''}</span>
                </button>
              )}
              <div className="flex items-center gap-2 flex-shrink-0">
                <span className="hidden sm:block">{sparkline(ue, 72, 24)}</span>
                {editingUeId !== ue.id && ueEditBtn(ue)}
                <span className={`text-lg font-bold ${averageColor(avg)}`}>{formatAverage(avg)}</span>
              </div>
            </div>
            {open && (
              <div className="px-5 pb-5 space-y-4 bg-slate-50/50">
                {ue.grades.length >= 2 && (
                  <div className="flex items-center gap-2 pt-3">
                    <span className="text-[11px] uppercase tracking-wide text-slate-400">Évolution</span>
                    {sparkline(ue)}
                  </div>
                )}
                {gradeChips(ue)}
                <div className="pt-3 border-t border-slate-100">{addGradeForm(ue)}</div>
                <button onClick={() => deleteUe(ue.id)} className="text-sm text-red-500 hover:text-red-600 font-medium">Supprimer l&apos;UE</button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );

  const renderTable = (list: UE[]) => (
    <div className="card overflow-hidden animate-in">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-slate-500 text-left text-xs uppercase tracking-wide">
              <th className="px-5 py-3 font-medium">Unité d&apos;enseignement</th>
              <th className="px-5 py-3 font-medium">Notes</th>
              <th className="px-5 py-3 font-medium text-right">Moyenne</th>
              <th className="px-5 py-3 font-medium text-right w-24">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {list.map((ue) => {
              const avg = ueAverage(ue.grades);
              const open = !!expanded[ue.id];
              return (
                <Fragment key={ue.id}>
                  <tr className="hover:bg-slate-50/60">
                    <td className="px-5 py-3 font-medium text-slate-900 align-top">
                      {editingUeId === ue.id ? ueNameForm(ue) : (
                        <div className="flex items-center gap-1.5">
                          <span>{ue.name}</span>
                          {ueEditBtn(ue)}
                        </div>
                      )}
                    </td>
                    <td className="px-5 py-3 align-top">{gradeChips(ue)}</td>
                    <td className="px-5 py-3 text-right align-top">
                      <div className={`font-bold ${averageColor(avg)}`}>{formatAverage(avg)}</div>
                      {ue.grades.length >= 2 && <div className="flex justify-end mt-1">{sparkline(ue, 84, 26)}</div>}
                    </td>
                    <td className="px-5 py-3 align-top">
                      <div className="flex items-center justify-end gap-1">
                        <button onClick={() => toggleExpand(ue.id)} className="text-blue-600 hover:text-blue-700 p-1" title="Ajouter une note">
                          <svg className={`h-5 w-5 transition-transform ${open ? 'rotate-45' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
                        </button>
                        {trashBtn(() => deleteUe(ue.id), "Supprimer l'UE")}
                      </div>
                    </td>
                  </tr>
                  {open && (
                    <tr className="bg-slate-50/60">
                      <td colSpan={4} className="px-5 py-4">{addGradeForm(ue)}</td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderSemesterUes = (list: UE[]) =>
    list.length === 0
      ? <p className="text-sm text-slate-400 px-1 py-2">Aucune UE dans ce semestre.</p>
      : viewMode === 'cards' ? renderCards(list)
      : viewMode === 'list' ? renderList(list)
      : renderTable(list);

  const viewButtons: { mode: ViewMode; label: string; icon: React.ReactNode }[] = [
    { mode: 'cards', label: 'Cartes', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM13 5a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1V5zM4 14a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1H5a1 1 0 01-1-1v-5zM13 14a1 1 0 011-1h5a1 1 0 011 1v5a1 1 0 01-1 1h-5a1 1 0 01-1-1v-5z" /> },
    { mode: 'list', label: 'Liste', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /> },
    { mode: 'table', label: 'Tableau', icon: <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M3 14h18m-9-8v16M4 4h16a1 1 0 011 1v14a1 1 0 01-1 1H4a1 1 0 01-1-1V5a1 1 0 011-1z" /> },
  ];

  // ---- Rendu ---------------------------------------------------------
  if (loading) {
    return (
      <div className="min-h-screen app-bg py-8 px-4">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-8">
            <div className="skeleton h-8 w-56 mx-auto" />
            <div className="skeleton h-4 w-72 mx-auto mt-3" />
          </div>
          <div className="card p-6 mb-6 flex items-center justify-between">
            <div className="flex-1 space-y-2">
              <div className="skeleton h-3 w-20" />
              <div className="skeleton h-10 w-full max-w-xs" />
            </div>
            <div className="skeleton h-16 w-28 ml-4" />
          </div>
          {[0, 1].map((i) => (
            <div key={i} className="card p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="skeleton h-10 w-10" />
                  <div className="skeleton h-5 w-40" />
                </div>
                <div className="skeleton h-6 w-12" />
              </div>
              <div className="flex gap-2">
                <div className="skeleton h-8 w-20" />
                <div className="skeleton h-8 w-20" />
                <div className="skeleton h-8 w-24" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen app-bg py-8 px-4">
      <div className="max-w-3xl mx-auto">
        <div className="text-center mb-8 animate-in">
          <h1 className="text-3xl font-bold tracking-tight gradient-text">Suivi des notes</h1>
          <p className="text-slate-600 mt-2">Organisez vos UE par semestre et suivez vos moyennes.</p>
        </div>

        {formations.length === 0 && !showFormationForm ? (
          <EmptyState
            icon={<>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l9-5-9-5-9 5 9 5z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 14l6.16-3.422A12.083 12.083 0 0112 21.5a12.083 12.083 0 01-6.16-10.922L12 14z" />
            </>}
            title="Aucune formation"
            description="Renseignez les informations de votre formation pour créer vos semestres, UE et suivre vos moyennes."
            action={<button onClick={() => { setFormationForm(EMPTY_FORMATION); setShowFormationForm(true); }} className="btn btn-primary py-3 px-6">Créer ma formation</button>}
          />
        ) : (
          <div className="space-y-6">
            {/* Barre formation + moyenne annuelle */}
            <div className="card p-6 animate-in">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1">
                  <label className="block text-xs font-medium text-slate-500 mb-1">Formation</label>
                  <div className="flex items-center gap-2">
                    <select value={selectedId} onChange={(e) => selectFormation(e.target.value)} className="flex-1 px-3 py-2.5 border border-slate-300 rounded-lg bg-white text-slate-900">
                      {formations.map((f) => (<option key={f.id} value={f.id}>{f.name}</option>))}
                    </select>
                    <button onClick={() => { setFormationForm(EMPTY_FORMATION); setShowFormationForm(true); setEditingFormation(false); }} className="btn px-3 py-2.5 text-sm border border-slate-300 text-slate-700 hover:bg-slate-100" title="Nouvelle formation">+ Formation</button>
                  </div>
                  {selectedFormation && (
                    <div className="mt-2 text-sm text-slate-500 flex flex-wrap gap-x-3 gap-y-1">
                      {selectedFormation.level && <span>{selectedFormation.level}</span>}
                      {selectedFormation.school && <span>· {selectedFormation.school}</span>}
                      {selectedFormation.academic_year && <span>· {selectedFormation.academic_year}</span>}
                      <button onClick={startEditFormation} className="text-blue-600 hover:text-blue-700 font-medium">Modifier</button>
                      <button onClick={deleteFormation} className="text-red-500 hover:text-red-600 font-medium">Supprimer</button>
                    </div>
                  )}
                </div>
                <div className="text-center bg-slate-50 rounded-xl px-6 py-4 border border-slate-100">
                  <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">Moyenne annuelle</div>
                  <div className={`text-3xl font-bold ${averageColor(annual)}`}>{formatAverage(annual)}</div>
                  <div className="text-xs text-slate-400">/ 20</div>
                </div>
              </div>
            </div>

            {/* Formulaire formation */}
            {(showFormationForm || editingFormation) && (
              <form onSubmit={saveFormation} className="card p-6 animate-in space-y-4">
                <h3 className="font-semibold text-slate-900">{editingFormation ? 'Modifier la formation' : 'Nouvelle formation'}</h3>
                <div className="grid sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Nom de la formation *</label>
                    <input value={formationForm.name} onChange={(e) => setFormationForm({ ...formationForm, name: e.target.value })} placeholder="Ex. BTS SIO" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" required />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Niveau / année</label>
                    <input value={formationForm.level} onChange={(e) => setFormationForm({ ...formationForm, level: e.target.value })} placeholder="Ex. 2e année" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Année scolaire</label>
                    <input value={formationForm.academic_year} onChange={(e) => setFormationForm({ ...formationForm, academic_year: e.target.value })} placeholder="Ex. 2025-2026" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" />
                  </div>
                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-1">Établissement</label>
                    <input value={formationForm.school} onChange={(e) => setFormationForm({ ...formationForm, school: e.target.value })} placeholder="Nom de votre école / CFA" className="w-full px-4 py-2.5 border border-slate-300 rounded-lg" />
                  </div>
                </div>
                <div className="flex gap-3">
                  <button type="submit" disabled={busy} className="btn btn-primary py-2.5 px-5">{editingFormation ? 'Enregistrer' : 'Créer'}</button>
                  <button type="button" onClick={() => { setShowFormationForm(false); setEditingFormation(false); setFormationForm(EMPTY_FORMATION); }} className="btn py-2.5 px-5 border border-slate-300 text-slate-700 hover:bg-slate-100">Annuler</button>
                </div>
              </form>
            )}

            {/* Sélecteur de vue global */}
            {selectedId && !showFormationForm && ues.length > 0 && (
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <span className="text-sm text-slate-500">{ues.length} UE · {semesters.length} semestre{semesters.length > 1 ? 's' : ''}</span>
                <div className="inline-flex items-center gap-1 bg-white border border-slate-200 rounded-lg p-1 shadow-sm">
                  {viewButtons.map((v) => (
                    <button key={v.mode} onClick={() => changeView(v.mode)} className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === v.mode ? 'bg-blue-600 text-white' : 'text-slate-600 hover:bg-slate-100'}`} title={v.label}>
                      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">{v.icon}</svg>
                      <span className="hidden sm:inline">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Semestres */}
            {selectedId && !showFormationForm && (
              <>
                {semesters.map((sem) => {
                  const list = semUes(sem.id);
                  const avg = semesterAverage(sem.id);
                  return (
                    <div key={sem.id} className="space-y-4">
                      {/* En-tête de semestre */}
                      <div className="flex items-center justify-between gap-3 pt-2">
                        {editingSemesterId === sem.id ? (
                          <form onSubmit={(e) => saveEditSemester(e, sem.id)} className="flex items-center gap-1.5">
                            <input autoFocus required value={editSemesterName} onChange={(e) => setEditSemesterName(e.target.value)} className="px-2 py-1 border border-slate-300 rounded text-base font-semibold" />
                            <button type="submit" className="text-green-600 hover:text-green-700 p-0.5" title="Enregistrer"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg></button>
                            <button type="button" onClick={() => setEditingSemesterId(null)} className="text-slate-400 hover:text-slate-600 p-0.5" title="Annuler"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg></button>
                          </form>
                        ) : (
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="inline-flex h-7 items-center rounded-full bg-indigo-50 text-indigo-700 text-xs font-semibold px-3 ring-1 ring-indigo-100">{sem.name}</span>
                            <button onClick={() => startEditSemester(sem)} className="text-slate-300 hover:text-blue-600 p-0.5" title="Renommer le semestre"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg></button>
                            <button onClick={() => deleteSemester(sem.id)} className="text-slate-300 hover:text-red-500 p-0.5" title="Supprimer le semestre"><svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg></button>
                          </div>
                        )}
                        <div className="text-right flex-shrink-0">
                          <span className={`text-lg font-bold ${averageColor(avg)}`}>{formatAverage(avg)}</span>
                          <span className="text-xs text-slate-400 ml-1">moy. semestre</span>
                        </div>
                      </div>

                      {renderSemesterUes(list)}

                      {/* Ajout d'une UE dans ce semestre */}
                      <form onSubmit={(e) => addUe(e, sem.id)} className="flex flex-wrap items-end gap-3">
                        <div className="flex-1 min-w-[180px]">
                          <input value={newUeInputs[sem.id] || ''} onChange={(e) => setNewUeInput(sem.id, e.target.value)} placeholder={`Nouvelle UE dans ${sem.name}`} className="w-full px-4 py-2.5 border border-slate-300 rounded-lg bg-white" required />
                        </div>
                        <button type="submit" className="btn px-4 py-2.5 text-sm border border-slate-300 text-slate-700 hover:bg-slate-100">+ UE</button>
                      </form>
                    </div>
                  );
                })}

                {/* Ajout d'un semestre */}
                <button onClick={addSemester} className="btn btn-primary w-full py-3">+ Ajouter un semestre</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
