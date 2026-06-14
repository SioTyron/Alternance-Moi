// lib/exportReports.ts
import { jsPDF } from 'jspdf';

type Attachment = {
  name: string;
  url: string;
  path?: string;
  size?: number;
  type?: string;
};

type Report = {
  id: string;
  date: string;
  title: string;
  content: string;
  created_at?: string;
  attachments?: Attachment[];
};

const formatDate = (dateString: string) => {
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('fr-FR', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }
  return new Date(dateString).toLocaleDateString('fr-FR', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const formatFileSize = (bytes?: number) => {
  if (!bytes) return '';
  const k = 1024;
  const sizes = ['o', 'Ko', 'Mo', 'Go'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Charge une image distante et renvoie son dataURL + dimensions.
const loadImage = (
  url: string
): Promise<{ dataUrl: string; width: number; height: number } | null> =>
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
        resolve({
          dataUrl: canvas.toDataURL('image/jpeg', 0.85),
          width: img.naturalWidth,
          height: img.naturalHeight,
        });
      } catch {
        resolve(null); // image cross-origin non exportable
      }
    };
    img.onerror = () => resolve(null);
    img.src = url;
  });

export async function exportAllReportsToPDF(reports: Report[]) {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 18;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  // Saute à une nouvelle page si l'espace restant est insuffisant.
  const ensureSpace = (needed: number) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin;
    }
  };

  // --- Page de garde ---
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(24);
  doc.setTextColor(37, 99, 235);
  doc.text("Rapports d'alternance", pageWidth / 2, 80, { align: 'center' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(12);
  doc.setTextColor(100);
  doc.text(
    `${reports.length} rapport${reports.length > 1 ? 's' : ''}`,
    pageWidth / 2,
    92,
    { align: 'center' }
  );
  doc.text(
    `Exporté le ${new Date().toLocaleDateString('fr-FR')}`,
    pageWidth / 2,
    99,
    { align: 'center' }
  );

  // --- Rapports ---
  for (let r = 0; r < reports.length; r++) {
    const report = reports[r];
    doc.addPage();
    y = margin;

    // Date
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);
    doc.setTextColor(120);
    doc.text(formatDate(report.date), margin, y);
    y += 7;

    // Titre
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(17, 24, 39);
    const titleLines = doc.splitTextToSize(report.title || '(Sans titre)', contentWidth);
    titleLines.forEach((line: string) => {
      ensureSpace(9);
      doc.text(line, margin, y);
      y += 8;
    });

    // Trait de séparation
    y += 2;
    doc.setDrawColor(229, 231, 235);
    doc.line(margin, y, pageWidth - margin, y);
    y += 8;

    // Contenu
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11);
    doc.setTextColor(55, 65, 81);
    const contentLines = doc.splitTextToSize(report.content || '', contentWidth);
    const lineHeight = 6;
    contentLines.forEach((line: string) => {
      ensureSpace(lineHeight);
      doc.text(line, margin, y);
      y += lineHeight;
    });

    // Pièces jointes
    const attachments = report.attachments || [];
    if (attachments.length > 0) {
      y += 6;
      ensureSpace(10);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(17, 24, 39);
      doc.text(`Fichiers joints (${attachments.length})`, margin, y);
      y += 7;

      for (const file of attachments) {
        const isImage =
          file.type?.startsWith('image/') ||
          /\.(png|jpe?g|gif|webp|bmp)$/i.test(file.name || '');

        if (isImage) {
          const img = await loadImage(file.url);
          if (img) {
            // Dimensionne l'image en conservant le ratio, max 90mm de haut.
            const maxW = contentWidth;
            const maxH = 90;
            let w = maxW;
            let h = (img.height / img.width) * w;
            if (h > maxH) {
              h = maxH;
              w = (img.width / img.height) * h;
            }
            ensureSpace(h + 8);
            doc.setFont('helvetica', 'normal');
            doc.setFontSize(9);
            doc.setTextColor(75, 85, 99);
            doc.text(file.name, margin, y);
            y += 4;
            try {
              doc.addImage(img.dataUrl, 'JPEG', margin, y, w, h);
              y += h + 6;
            } catch {
              y += 2;
            }
            continue;
          }
        }

        // Fichier non-image (ou image non chargeable) : ligne avec nom + lien.
        ensureSpace(7);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(55, 65, 81);
        const sizeLabel = file.size ? ` — ${formatFileSize(file.size)}` : '';
        doc.text(`• ${file.name}${sizeLabel}`, margin, y);
        y += 5;
        doc.setFontSize(8);
        doc.setTextColor(37, 99, 235);
        const urlLines = doc.splitTextToSize(file.url, contentWidth - 4);
        urlLines.forEach((line: string) => {
          ensureSpace(4);
          doc.textWithLink(line, margin + 4, y, { url: file.url });
          y += 4;
        });
        y += 2;
      }
    }
  }

  // --- Numéros de page ---
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(156, 163, 175);
    doc.text(`${i} / ${pageCount}`, pageWidth - margin, pageHeight - 10, {
      align: 'right',
    });
  }

  const stamp = new Date().toISOString().split('T')[0];
  doc.save(`rapports-alternance-${stamp}.pdf`);
}
