import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { formatRoleName } from './formatters';

interface UserData {
  name: string;
  xpByRole?: Record<string, number>;
  [key: string]: any;
}

interface ProjectData {
  projectName: string;
  link: string;
  description?: string;
}

export async function generatePortfolioPDF(user: UserData, projects: ProjectData[]): Promise<jsPDF> {
  try {
    const [jsPDFModule, autoTableModule] = await Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]);

    const pdf = new jsPDFModule.default();
    const autoTable = autoTableModule.default;

    // Add portfolio content
    pdf.setFontSize(22);
    pdf.text(`Portfolio of ${user.name}`, 20, 20);

    pdf.setFontSize(16);
    pdf.text('User Profile', 20, 40);
    pdf.setFontSize(12);
    let yPosition = 50;

    // Role & XP Summary
    if (user.xpByRole) {
      Object.entries(user.xpByRole).forEach(([role, xp]) => {
        if (typeof xp === 'number' && xp > 0) {
          pdf.text(`${formatRoleName(role)}: ${xp} XP`, 30, yPosition);
          yPosition += 10;
        }
      });
    }

    // Projects Section
    yPosition += 10;
    pdf.setFontSize(16);
    pdf.text('Projects', 20, yPosition);
    yPosition += 10;

    if (projects.length > 0) {
      const projectData = projects.map(project => [
        project.projectName,
        project.link,
        project.description || '-'
      ]);

      autoTable(pdf, {
        startY: yPosition,
        head: [['Project Name', 'Link', 'Description']],
        body: projectData,
        theme: 'grid',
        headStyles: { fillColor: [8, 145, 178] },
        margin: { top: 10, right: 20, bottom: 20, left: 20 },
        columnStyles: {
          0: { cellWidth: 'auto' },
          1: { cellWidth: 'auto', fontStyle: 'italic' },
          2: { cellWidth: 'auto' }
        },
        styles: {
          overflow: 'linebreak',
          fontSize: 10,
          font: 'helvetica'
        }
      } as UserOptions);
    }

    return pdf;
  } catch (error) {
    console.error('Error initializing PDF generation:', error);
    throw new Error('Failed to initialize PDF generation');
  }
}

// Preload PDF modules during idle time
if ('requestIdleCallback' in window) {
  (window as any).requestIdleCallback(() => {
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).catch(() => {}); // Silently handle preload failure
  });
} else {
  // Fallback to setTimeout for browsers without requestIdleCallback
  setTimeout(() => {
    Promise.all([
      import('jspdf'),
      import('jspdf-autotable')
    ]).catch(() => {});
  }, 3000);
}
