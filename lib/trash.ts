// lib/trash.ts
import { supabase } from '@/lib/supabaseClient';

export const TRASH_RETENTION_DAYS = 30;

/**
 * Purge définitive des éléments en corbeille depuis plus de 30 jours.
 * Supprime aussi les fichiers storage des rapports concernés.
 * S'appuie sur la RLS (ne touche que les données de l'utilisateur courant).
 */
export async function purgeExpiredTrash(): Promise<void> {
  const cutoff = new Date(Date.now() - TRASH_RETENTION_DAYS * 24 * 60 * 60 * 1000).toISOString();

  try {
    // Rapports expirés : effacer d'abord les fichiers joints du storage
    const { data: reports } = await supabase
      .from('reports')
      .select('id, attachments')
      .not('deleted_at', 'is', null)
      .lt('deleted_at', cutoff);

    const paths: string[] = [];
    for (const r of reports ?? []) {
      for (const f of (r.attachments as { path?: string }[]) ?? []) {
        if (f?.path) paths.push(f.path);
      }
    }
    if (paths.length > 0) {
      await supabase.storage.from('reports').remove(paths);
    }

    // Suppression définitive des lignes expirées (les FK on delete cascade
    // nettoient les enfants d'une formation/semestre/UE purgée).
    await supabase.from('reports').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff);
    await supabase.from('formations').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff);
    await supabase.from('semesters').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff);
    await supabase.from('ues').delete().not('deleted_at', 'is', null).lt('deleted_at', cutoff);
  } catch {
    // silencieux : la purge est opportuniste, on réessaiera au prochain chargement
  }
}

/** Jours restants avant purge définitive d'un élément supprimé. */
export function daysUntilPurge(deletedAt: string): number {
  const elapsed = (Date.now() - new Date(deletedAt).getTime()) / (24 * 60 * 60 * 1000);
  return Math.max(0, Math.ceil(TRASH_RETENTION_DAYS - elapsed));
}
