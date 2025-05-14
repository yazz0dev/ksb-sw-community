// src/utils/pdfGenerator.ts

import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';
import { formatRoleName } from './formatters'; // Assuming this correctly formats display names
import { XPData, XpFirestoreFieldKey } from '@/types/xp'; // Import XP types

// Updated UserData interface to match the structure passed from PortfolioGeneratorButton
interface UserDataForPDF {
  name: string;
  xpData?: Partial<XPData>; // XP data is nested and partial
  // Add other known properties explicitly if needed, e.g.,
  // bio?: string;
  // skills?: string[];
}

interface ProjectData {
  projectName: string;
  link: string;
  description?: string;
}

export async function generatePortfolioPDF(user: UserDataForPDF, projects: ProjectData[]): Promise<jsPDF> {
    try {
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable')
        ]);

        const pdf = new jsPDF();
        pdf.setFontSize(22);
        pdf.text(`Portfolio of ${user.name || 'User'}`, 20, 20);

        pdf.setFontSize(16);
        pdf.text('User Profile Summary', 20, 40);
        pdf.setFontSize(12);
        let yPosition = 50;

        // Role & XP Summary from user.xpData
        if (user.xpData && Object.keys(user.xpData).length > 0) {
            const xpEntries = Object.entries(user.xpData)
                // Filter for actual XP fields (e.g., starting with 'xp_') and ensure value is a number > 0
                .filter((entry): entry is [XpFirestoreFieldKey, number] => {
                    const [key, xp] = entry; // key is string, xp is any from Object.entries on Partial<XPData>
                    return key.startsWith('xp_') && typeof xp === 'number' && xp > 0;
                }); // Type predicate now correctly types xpEntries

            if (xpEntries.length > 0) {
                 pdf.text('XP Breakdown:', 25, yPosition);
                 yPosition += 7;
                 xpEntries.forEach(([roleKey, xp]) => {
                    // formatRoleName should handle 'xp_developer' -> 'Developer'
                    pdf.text(`${formatRoleName(roleKey)}: ${xp} XP`, 30, yPosition);
                    yPosition += 7;
                 });
                 // Add Total XP (already calculated as totalCalculatedXp)
                 const totalXp = user.xpData.totalCalculatedXp ?? 0;
                 pdf.setFont('helvetica', 'bold');
                 pdf.text(`Total XP: ${totalXp}`, 30, yPosition);
                 pdf.setFont('helvetica', 'normal');
                 yPosition += 7;

                 // Add Win Count if available and greater than 0
                 if (typeof user.xpData.count_wins === 'number' && user.xpData.count_wins > 0) {
                    pdf.text(`Event Wins: ${user.xpData.count_wins}`, 30, yPosition);
                    yPosition += 7;
                 }
                 yPosition += 3; // Extra space
            } else {
                 pdf.text('No XP earned yet.', 30, yPosition);
                 yPosition += 10;
            }
        } else {
            pdf.text('XP data not available.', 30, yPosition);
            yPosition += 10;
        }

        // Projects Section (remains the same)
        pdf.setFontSize(16);
        pdf.text('Projects', 20, yPosition);
        yPosition += 10;

        if (projects && projects.length > 0) {
            const projectData = projects.map(project => [
                project.projectName || 'N/A',
                project.link || 'N/A',
                project.description || '-'
            ]);
            autoTable(pdf, {
                startY: yPosition,
                head: [['Project Name', 'Link', 'Description']],
                body: projectData,
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] },
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
        } else {
             pdf.setFontSize(12);
             pdf.text('No projects submitted.', 20, yPosition);
        }

        return pdf;
    } catch (error) {
        console.error('Error loading PDF libraries or generating PDF:', error);
        throw new Error('Failed to generate portfolio PDF. Please try again.');
    }
}