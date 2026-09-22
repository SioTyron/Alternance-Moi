// lib/exportReports.ts
import { jsPDF } from 'jspdf';

type Attachment = { name: string; url: string; path?: string; size?: number; type?: string };
type Report = { id: string; date: string; title: string; content: string; created_at?: string; attachments?: Attachment[] };

type RGB = [number, number, number];
const BRAND: RGB = [37, 99, 235];
const ACCENT: RGB = [79, 70, 229];
const INK: RGB = [15, 23, 42];
const BODY: RGB = [51, 65, 85];
const MUTED: RGB = [100, 116, 139];
const FAINT: RGB = [148, 163, 184];
const CARD_BG: RGB = [239, 246, 255];
const CARD_BORDER: RGB = [191, 219, 254];
const RULE: RGB = [226, 232, 240];

const formatLongDate = (dateString: string) => {
  const d = /^\d{4}-\d{2}-\d{2}$/.test(dateString)
    ? new Date(Number(dateString.slice(0, 4)), Number(dateString.slice(5, 7)) - 1, Number(dateString.slice(8, 10)))
    : new Date(dateString);
  return d.toLocaleDateString('fr-FR', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
};
const shortDate = (dateString: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [y, m, d] = dateString.split('-');
    return `${d}/${m}/${y}`;
  }
  return new Date(dateString).toLocaleDateString('fr-FR');
};
const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
};

const loadImage = (url: string): Promise<{ dataUrl: string; width: number; height: number } | null> =>
  new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(null);
        ctx.drawImage(img, 0, 0);
        resolve({ dataUrl: canvas.toDataURL('image/jpeg', 0.85), width: img.naturalWidth, height: img.naturalHeight });
      } catch {
        resolve(null);
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export async function buildReportsPDF(reports: Report[]): Promise<jsPDF> {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  const contentTop = 22; // laisse la place à l'en-tête des pages de contenu
  const bottomLimit = pageHeight - 16;

  const exportDateStr = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });

  let y = contentTop;
  const ensureSpace = (needed: number) => {
    if (y + needed > bottomLimit) {
      doc.addPage();
      y = contentTop;
    }
  };

  // ------------------------------------------------------------------
  // PAGE DE GARDE
  // ------------------------------------------------------------------
  doc.setFillColor(...BRAND);
  doc.rect(0, 0, pageWidth, 52, 'F');
  doc.setFillColor(...ACCENT);
  doc.rect(0, 50, pageWidth, 2.5, 'F');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.setTextColor(255, 255, 255);
  doc.text('Alternance & Moi', margin, 26);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(11);
  doc.setTextColor(219, 234, 254);
  doc.text("Suivi d'activité en alternance", margin, 35);

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(26);
  doc.setTextColor(...INK);
  doc.text("Rapports d'activité", margin, 82);

  const dates = reports.map((r) => r.date).filter(Boolean).sort();
  const period = dates.length ? `du ${shortDate(dates[0])} au ${shortDate(dates[dates.length - 1])}` : '';
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(...MUTED);
  doc.text(`${reports.length} rapport${reports.length > 1 ? 's' : ''}${period ? ' · ' + period : ''}`, margin, 92);
  doc.text(`Généré le ${exportDateStr}`, margin, 99);

  // Sommaire
  if (reports.length > 0) {
    let sy = 116;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...INK);
    doc.text('Sommaire', margin, sy);
    sy += 8;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    for (let i = 0; i < reports.length; i++) {
      if (sy > bottomLimit - 6) {
        doc.setTextColor(...FAINT);
        doc.text(`… et ${reports.length - i} autre${reports.length - i > 1 ? 's' : ''}`, margin, sy);
        break;
      }
      const rep = reports[i];
      doc.setTextColor(...BRAND);
      doc.text(`${String(i + 1).padStart(2, '0')}`, margin, sy);
      doc.setTextColor(...BODY);
      const title = doc.splitTextToSize(rep.title || '(Sans titre)', contentWidth - 40)[0];
      doc.text(title, margin + 10, sy);
      doc.setTextColor(...FAINT);
      doc.text(shortDate(rep.date), pageWidth - margin, sy, { align: 'right' });
      sy += 6.5;
    }
  }

  // ------------------------------------------------------------------
  // RAPPORTS (flux continu)
  // ------------------------------------------------------------------
  doc.addPage();
  y = contentTop;

  for (let r = 0; r < reports.length; r++) {
    const report = reports[r];

    // --- Bloc d'en-tête du rapport (carte) ---
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    const titleLines: string[] = doc.splitTextToSize(report.title || '(Sans titre)', contentWidth - 22);
    const headerH = Math.max(18, 10 + titleLines.length * 7);

    ensureSpace(headerH + 12);

    doc.setFillColor(...CARD_BG);
    doc.setDrawColor(...CARD_BORDER);
    doc.roundedRect(margin, y, contentWidth, headerH, 2.5, 2.5, 'FD');

    // Badge numéroté
    doc.setFillColor(...BRAND);
    doc.circle(margin + 9, y + headerH / 2, 5, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(255, 255, 255);
    doc.text(String(r + 1), margin + 9, y + headerH / 2 + 1, { align: 'center' });

    // Titre + date
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(...INK);
    let ty = y + 8;
    titleLines.forEach((line) => {
      doc.text(line, margin + 18, ty);
      ty += 7;
    });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5);
    doc.setTextColor(...MUTED);
    doc.text(formatLongDate(report.date), margin + 18, ty - 1);

    y += headerH + 7;

    // --- Contenu ---
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10.5);
    doc.setTextColor(...BODY);
    const contentLines: string[] = doc.splitTextToSize(report.content || '', contentWidth);
    const lh = 5.6;
    contentLines.forEach((line) => {
      ensureSpace(lh);
      doc.text(line, margin, y);
      y += lh;
    });

    // --- Pièces jointes ---
    const attachments = report.attachments || [];
    if (attachments.length > 0) {
      y += 5;
      ensureSpace(9);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
      doc.text(`Fichiers joints (${attachments.length})`, margin, y);
      y += 6;

      for (const file of attachments) {
        const isImage = file.type?.startsWith('image/') || /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name || '');
        if (isImage) {
          const img = await loadImage(file.url);
          if (img) {
            const maxW = contentWidth;
            const maxH = 85;
            let w = maxW;
            let h = (img.height / img.width) * w;
            if (h > maxH) {
              h = maxH;
              w = (img.width / img.height) * h;
            }
            ensureSpace(h + 7);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(8.5);
            doc.setTextColor(...MUTED);
            doc.text(file.name, margin, y);
            y += 3.5;
            try {
              doc.addImage(img.dataUrl, 'JPEG', margin, y, w, h);
              doc.setDrawColor(...RULE);
              doc.roundedRect(margin, y, w, h, 1.5, 1.5, 'S');
              y += h + 5;
            } catch {
              y += 2;
            }
            continue;
          }
        }
        ensureSpace(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(...BODY);
        const sizeLabel = file.size ? ` — ${formatFileSize(file.size)}` : '';
        doc.text(`•  ${file.name}${sizeLabel}`, margin + 1, y);
        y += 4.5;
        doc.setFontSize(8);
        doc.setTextColor(...BRAND);
        const urlLines: string[] = doc.splitTextToSize(file.url, contentWidth - 5);
        urlLines.forEach((line) => {
          ensureSpace(4);
          doc.textWithLink(line, margin + 5, y, { url: file.url });
          y += 4;
        });
        y += 1.5;
      }
    }

    // --- Séparateur entre rapports ---
    if (r < reports.length - 1) {
      y += 6;
      ensureSpace(2);
      doc.setDrawColor(...RULE);
      doc.line(margin, y, pageWidth - margin, y);
      y += 8;
    }
  }

  // ------------------------------------------------------------------
  // EN-TÊTES + PIEDS DE PAGE
  // ------------------------------------------------------------------
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Pied de page
    doc.setDrawColor(...RULE);
    doc.line(margin, pageHeight - 12, pageWidth - margin, pageHeight - 12);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(...FAINT);
    doc.text('Alternance & Moi', margin, pageHeight - 8);
    doc.text(`Page ${i} / ${pageCount}`, pageWidth - margin, pageHeight - 8, { align: 'right' });

    // En-tête des pages de contenu (pas la garde)
    if (i > 1) {
      doc.setFontSize(8);
      doc.setTextColor(...FAINT);
      doc.text("Rapports d'activité", margin, 11);
      doc.text(exportDateStr, pageWidth - margin, 11, { align: 'right' });
      doc.setDrawColor(...RULE);
      doc.line(margin, 14, pageWidth - margin, 14);
    }
  }

  return doc;
}

export async function exportAllReportsToPDF(reports: Report[]) {
  const doc = await buildReportsPDF(reports);
  const stamp = new Date().toISOString().split('T')[0];
  const suffix = reports.length === 1 ? 'rapport' : 'rapports';
  doc.save(`${suffix}-alternance-${stamp}.pdf`);
}
