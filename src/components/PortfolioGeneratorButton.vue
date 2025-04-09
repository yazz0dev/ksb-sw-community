<template>
  <button
    @click="generatePDF"
    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
  >
    <i class="fas fa-file-pdf mr-2"></i>Generate Portfolio PDF
  </button>
</template>

<script setup lang="ts">
import { defineProps } from 'vue';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable';

// Define an interface for the project object
interface Project {
  projectName: string;
  link: string;
  description?: string; // Optional description
}

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  projects: {
    type: Array as () => Project[], // Use the Project interface here
    required: true
  }
});

const generatePDF = async () => {
  const pdf = new jsPDF();
  pdf.setFontSize(22);
  pdf.text(`Portfolio of ${props.user.name}`, 20, 20);

  pdf.setFontSize(16);
  pdf.text('User Profile', 20, 40);

  pdf.setFontSize(12);
  let yPosition = 50;
  pdf.text(`Name: ${props.user.name}`, 20, yPosition);
  yPosition += 10;
  pdf.text(`Role: ${props.user.role}`, 20, yPosition);
  yPosition += 10;

  if (props.user.xpByRole) {
    pdf.text('XP Breakdown:', 20, yPosition);
    yPosition += 10;
    for (const role in props.user.xpByRole) {
      if (props.user.xpByRole.hasOwnProperty(role)) {
        pdf.text(`- ${role}: ${props.user.xpByRole[role]} XP`, 30, yPosition);
        yPosition += 10;
      }
    }
  }


  pdf.text('Projects', 20, yPosition);
  yPosition += 10;

  if (props.projects && props.projects.length > 0) {
    // Explicitly type the 'project' parameter in the map function
    const projectData = props.projects.map((project: Project) => [
      project.projectName,
      project.link,
      project.description || '',
    ]);

    (pdf as any).autoTable({ // Type assertion to bypass jsPDF type limitations
      head: [['Project Name', 'Link', 'Description']],
      body: projectData,
      startY: yPosition,
      margin: { left: 20, right: 20 },
      columnStyles: { 1: { cellWidth: 'auto' } } // Adjust column widths as needed
    });
  } else {
    pdf.text('No projects to display.', 30, yPosition);
  }


  pdf.save(`portfolio-${props.user.name}.pdf`);
};
</script>
