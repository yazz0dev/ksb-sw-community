// src/utils/pdfGenerator.ts

import type { jsPDF } from 'jspdf';
import type { UserOptions } from 'jspdf-autotable';

// --- Import local utilities statically ---
import { formatRoleName } from './formatters';

// --- Interfaces (assuming these are defined correctly) ---
interface UserData {
  name: string;
  xpByRole?: Record<string, number>;
  // Add other known properties explicitly if needed, e.g.,
  // uid?: string;
  // bio?: string;
  // skills?: string[];
}

interface ProjectData {
  projectName: string;
  link: string;
  description?: string;
}

/**
 * Generates a portfolio PDF for the given user and projects.
 * Dynamically imports PDF libraries only when needed.
 *
 * @param user - The user data object.
 * @param projects - An array of project data objects.
 * @returns A Promise that resolves with the jsPDF instance.
 * @throws Throws an error if PDF libraries fail to load or generation fails.
 */

export async function generatePortfolioPDF(user: UserData, projects: ProjectData[]): Promise<jsPDF> {

    try {
        // --- Dynamic Imports ---
        // Use Promise.all to load them concurrently for potentially faster loading
        const [{ default: jsPDF }, { default: autoTable }] = await Promise.all([
            import('jspdf'),
            import('jspdf-autotable')
        ]);
        // --- End Dynamic Imports ---


        // --- PDF Generation Logic ---
        const pdf = new jsPDF(); // Now we can instantiate jsPDF

        pdf.setFontSize(22);
        pdf.text(`Portfolio of ${user.name || 'User'}`, 20, 20);

        pdf.setFontSize(16);
        pdf.text('User Profile Summary', 20, 40);
        pdf.setFontSize(12);
        let yPosition = 50;

        // Role & XP Summary
        if (user.xpByRole && Object.keys(user.xpByRole).length > 0) {
            const xpEntries = Object.entries(user.xpByRole)
                .filter(([, xp]) => typeof xp === 'number' && xp > 0);

            if (xpEntries.length > 0) {
                 pdf.text('XP Breakdown:', 25, yPosition);
                 yPosition += 7;
                 xpEntries.forEach(([role, xp]) => {
                    pdf.text(`${formatRoleName(role)}: ${xp} XP`, 30, yPosition);
                    yPosition += 7;
                 });
                 // Add Total XP
                 const totalXp = xpEntries.reduce((sum, [, xp]) => sum + xp, 0);
                 pdf.setFont('helvetica', 'bold');
                 pdf.text(`Total XP: ${totalXp}`, 30, yPosition);
                 pdf.setFont('helvetica', 'normal'); // Reset font style
                 yPosition += 10; // Extra space after XP section
            } else {
                 pdf.text('No XP earned yet.', 30, yPosition);
                 yPosition += 10;
            }
        } else {
            pdf.text('XP data not available.', 30, yPosition);
            yPosition += 10;
        }


        // Projects Section
        pdf.setFontSize(16);
        pdf.text('Projects', 20, yPosition);
        yPosition += 10;

        if (projects && projects.length > 0) {
            const projectData = projects.map(project => [
                project.projectName || 'N/A',
                project.link || 'N/A',
                project.description || '-'
            ]);

            autoTable(pdf, { // Use the dynamically imported autoTable
                startY: yPosition,
                head: [['Project Name', 'Link', 'Description']],
                body: projectData,
                theme: 'grid',
                headStyles: { fillColor: [37, 99, 235] }, // Primary blueish color
                margin: { top: 10, right: 20, bottom: 20, left: 20 },
                columnStyles: {
                    0: { cellWidth: 'auto' },
                    1: { cellWidth: 'auto', fontStyle: 'italic' },
                    2: { cellWidth: 'auto' }
                },
                styles: {
                    overflow: 'linebreak',
                    fontSize: 10,
                    font: 'helvetica' // Ensure consistent font
                }
            } as UserOptions); // Cast options type if necessary
        } else {
             pdf.setFontSize(12);
             pdf.text('No projects submitted.', 20, yPosition);
        }

        console.log('PDF generation logic complete.'); // Added log
        return pdf; // Return the generated PDF object

    } catch (error) {
        console.error('Error loading PDF libraries or generating PDF:', error);
        // Rethrow a user-friendly error for the calling component
        throw new Error('Failed to generate portfolio PDF. Please try again.');
    }
}
