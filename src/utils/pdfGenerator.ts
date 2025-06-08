// src/utils/pdfGenerator.ts

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { XPData } from '@/types/xp';
import type { StudentPortfolioGenerationData, SocialLinks } from '@/types/student';
import { Timestamp } from 'firebase/firestore';

// --- STYLING & CONFIGURATION ---

const COLORS = {
  primary: '#2563eb',
  secondary: '#64748b',
  success: '#10b981',
  info: '#0ea5e9',
  warning: '#f59e42',
  danger: '#ef4444',
  light: '#f8fafc',
  dark: '#1e293b',
  text: '#334155',
  textSecondary: '#64748b',
  border: '#e2e8f0',
};

const FONTS = {
  default: 'helvetica',
};

const PAGE_MARGIN = 20;

// --- INTERFACES ---

interface UserDataForPDF {
  name: string;
  uid: string;
  email?: string | null;
  photoURL?: string | null;
  xpData?: Partial<XPData>;
  bio?: string | undefined;
  skills?: string[] | undefined;
  socialLinks?: SocialLinks;
}

interface ProjectData {
  projectName: string;
  link: string;
  description?: string;
}

// --- HELPER FUNCTIONS ---


const formatDate = (date: Timestamp | Date | string | null): string => {
  if (!date) return 'N/A';
  if (date instanceof Timestamp) return date.toDate().toLocaleDateString();
  if (date instanceof Date) return date.toLocaleDateString();
  if (typeof date === 'string') return new Date(date).toLocaleDateString();
  return 'N/A';
};

class PDFBuilder {
  private pdf: jsPDF;
  private y: number;
  private page_width: number;
  private content_width: number;
  private user: UserDataForPDF;
  private comprehensiveData: StudentPortfolioGenerationData | undefined; // Changed from StudentPortfolioGenerationData?
  private projects: ProjectData[];

  constructor(user: UserDataForPDF, projects: ProjectData[], comprehensiveData?: StudentPortfolioGenerationData) {
    this.pdf = new jsPDF();
    this.y = 0;
    this.page_width = this.pdf.internal.pageSize.getWidth();
    this.content_width = this.page_width - PAGE_MARGIN * 2;
    this.user = user;
    this.comprehensiveData = comprehensiveData;
    this.projects = projects;
  }

  private checkPageBreak(requiredSpace: number) {
    if (this.y + requiredSpace > this.pdf.internal.pageSize.getHeight() - PAGE_MARGIN) {
      this.pdf.addPage();
      this.y = PAGE_MARGIN;
    }
  }

  private addHeader() {
    this.pdf.setFillColor(COLORS.primary);
    this.pdf.rect(0, 0, this.page_width, 50, 'F');

    this.pdf.setFont(FONTS.default, 'bold');
    this.pdf.setFontSize(28);
    this.pdf.setTextColor('#ffffff');
    this.pdf.text(this.user.name, PAGE_MARGIN, 30);
    
    this.pdf.setFont(FONTS.default, 'normal');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(COLORS.light);
    this.pdf.text('Student Portfolio', PAGE_MARGIN, 38);
    
    this.y = 60;
  }
  
  private addContactInfo() {
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(COLORS.textSecondary);
    const socialLinks = [];
    if (this.user.email) socialLinks.push(`Email: ${this.user.email}`);
    if (this.user.socialLinks?.github) socialLinks.push(`GitHub: ${this.user.socialLinks.github}`);
    if (this.user.socialLinks?.linkedin) socialLinks.push(`LinkedIn: ${this.user.socialLinks.linkedin}`);
    if (this.user.socialLinks?.portfolio) socialLinks.push(`Portfolio: ${this.user.socialLinks.portfolio}`);
    
    this.pdf.text(socialLinks.join('  |  '), PAGE_MARGIN, 45);
  }

  private addSectionTitle(title: string, color: string = COLORS.primary) {
    this.checkPageBreak(20);
    this.pdf.setFont(FONTS.default, 'bold');
    this.pdf.setFontSize(16);
    this.pdf.setTextColor(color);
    this.pdf.text(title, PAGE_MARGIN, this.y);
    this.y += 8;
    this.pdf.setDrawColor(COLORS.border);
    this.pdf.line(PAGE_MARGIN, this.y, this.page_width - PAGE_MARGIN, this.y);
    this.y += 10;
  }

  private addBio() {
    if (!this.user.bio) return;
    this.addSectionTitle('About Me');
    this.pdf.setFontSize(10);
    this.pdf.setTextColor(COLORS.text);
    const lines = this.pdf.splitTextToSize(this.user.bio, this.content_width);
    this.pdf.text(lines, PAGE_MARGIN, this.y);
    this.y += lines.length * 5 + 10;
  }

  private addMetrics() {
    const metrics = this.comprehensiveData?.portfolioMetrics;
    if (!metrics) return;
    
    this.addSectionTitle('Career Snapshot');
    
    const metricItems = [
      { label: 'Total XP', value: metrics.totalXP.toString() },
      { label: 'Projects Completed', value: metrics.totalProjects.toString() },
      { label: 'Events Attended', value: metrics.totalEvents.toString() },
      { label: 'Leadership Roles', value: metrics.leadershipExperience.toString() }
    ];

    const cardWidth = (this.content_width - 15) / 4;
    let currentX = PAGE_MARGIN;

    metricItems.forEach(item => {
      this.pdf.setFillColor(COLORS.light);
      this.pdf.roundedRect(currentX, this.y, cardWidth, 25, 3, 3, 'F');
      
      this.pdf.setFont(FONTS.default, 'bold');
      this.pdf.setFontSize(18);
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text(item.value, currentX + cardWidth / 2, this.y + 13, { align: 'center' });

      this.pdf.setFont(FONTS.default, 'normal');
      this.pdf.setFontSize(9);
      this.pdf.setTextColor(COLORS.textSecondary);
      this.pdf.text(item.label, currentX + cardWidth / 2, this.y + 20, { align: 'center' });
      
      currentX += cardWidth + 5;
    });
    this.y += 35;
  }
  
  private addSkills() {
    const skillsMatrix = this.comprehensiveData?.skillsMatrix;
    if (!skillsMatrix || skillsMatrix.length === 0) return;
    
    this.addSectionTitle('Skills & Proficiencies');
    
    autoTable(this.pdf, {
      startY: this.y,
      head: [['Skill', 'Proficiency', 'Projects', 'Events', 'Last Used']],
      body: skillsMatrix.slice(0, 10).map(s => [
        s.skill, s.proficiencyLevel, s.projectsUsed, s.eventsUsed, formatDate(s.lastUsed)
      ]),
      theme: 'grid',
      headStyles: { fillColor: COLORS.primary, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 2, font: FONTS.default },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }
    });

    this.y = (this.pdf as any).lastAutoTable.finalY + 15;
  }

  private addProjects() {
    if (!this.projects || this.projects.length === 0) return;
    
    this.addSectionTitle('Featured Projects');

    this.projects.slice(0, 3).forEach((project, index) => {
      this.checkPageBreak(40);
      
      this.pdf.setFont(FONTS.default, 'bold');
      this.pdf.setFontSize(12);
      this.pdf.setTextColor(COLORS.primary);
      this.pdf.text(project.projectName, PAGE_MARGIN, this.y);
      this.y += 6;

      if(project.link) {
        this.pdf.setFont(FONTS.default, 'italic');
        this.pdf.setFontSize(9);
        this.pdf.setTextColor(COLORS.textSecondary);
        this.pdf.textWithLink(project.link, PAGE_MARGIN, this.y, { url: project.link });
        this.y += 8;
      }

      if(project.description) {
        this.pdf.setFont(FONTS.default, 'normal');
        this.pdf.setFontSize(10);
        this.pdf.setTextColor(COLORS.text);
        const lines = this.pdf.splitTextToSize(project.description, this.content_width);
        this.pdf.text(lines, PAGE_MARGIN, this.y);
        this.y += lines.length * 5 + 5;
      }
      
      if (index < this.projects.slice(0, 3).length - 1) {
          this.pdf.setDrawColor(COLORS.border);
          this.pdf.line(PAGE_MARGIN, this.y, PAGE_MARGIN + 30, this.y);
          this.y += 8;
      }
    });
    this.y += 5;
  }
  
  private addEventHistory() {
    const eventHistory = this.comprehensiveData?.eventHistory;
    if (!eventHistory || eventHistory.length === 0) return;
    
    this.addSectionTitle('Event History');
    
    autoTable(this.pdf, {
      startY: this.y,
      head: [['Event', 'Role', 'Type', 'Date']],
      body: eventHistory.slice(0, 5).map(e => [
        e.eventName, e.roleInEvent.replace('_', ' ').toUpperCase(), e.eventType || 'Event', formatDate(e.date?.start)
      ]),
      theme: 'striped',
      headStyles: { fillColor: COLORS.secondary, fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 2, font: FONTS.default },
      margin: { left: PAGE_MARGIN, right: PAGE_MARGIN }
    });

    this.y = (this.pdf as any).lastAutoTable.finalY + 15;
  }
  
  private addFooter() {
      const pageCount = this.pdf.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
          this.pdf.setPage(i);
          this.pdf.setFontSize(8);
          this.pdf.setTextColor(COLORS.textSecondary);
          const text = `Page ${i} of ${pageCount} | Generated on ${new Date().toLocaleDateString()}`;
          this.pdf.text(text, this.page_width / 2, this.pdf.internal.pageSize.getHeight() - 10, { align: 'center' });
      }
  }

  public build() {
    this.addHeader();
    this.addContactInfo();
    this.addBio();
    this.addMetrics();
    this.addSkills();
    this.addProjects();
    this.addEventHistory();
    this.addFooter();
    return this.pdf;
  }
}

export async function generatePortfolioPDF(
  user: UserDataForPDF,
  projects: ProjectData[],
  comprehensiveData?: StudentPortfolioGenerationData
): Promise<jsPDF> {
  try {
    const builder = new PDFBuilder(user, projects, comprehensiveData);
    return builder.build();
  } catch (error) {
    console.error('Error generating PDF:', error);
    throw new Error('Failed to generate portfolio PDF.');
  }
}