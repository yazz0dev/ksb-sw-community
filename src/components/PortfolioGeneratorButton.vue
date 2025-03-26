<template>
  <button @click="generatePdf" class="btn btn-primary btn-sm">Generate PDF Portfolio</button>
</template>

<script setup>
import { defineProps, computed } from 'vue'; // Import computed
import { jsPDF } from 'jspdf';

const props = defineProps({
  user: {
    type: Object,
    required: true,
    validator: (value) => {
      // Now expects xpByRole instead of xp
      return value && value.uid && value.name && typeof value.xpByRole === 'object';
    }
  }
});

// Calculate total XP from the map
const totalXp = computed(() => {
    if (!props.user || !props.user.xpByRole) return 0;
    return Object.values(props.user.xpByRole).reduce((sum, val) => sum + (val || 0), 0);
});

const generatePdf = () => {
  if (!props.user) {
      console.error("User data not available for PDF generation.");
      return;
  }

  const doc = new jsPDF();
  let yOffset = 20;

  doc.setFontSize(22);
  doc.text(`Portfolio: ${props.user.name}`, 20, yOffset);
  yOffset += 12;

  doc.setFontSize(14);
  doc.text(`User ID: ${props.user.uid}`, 20, yOffset);
  yOffset += 8;
  // Use the calculated totalXp
  doc.text(`Total Experience Points (XP): ${totalXp.value}`, 20, yOffset);
  yOffset += 12;

  // Skills
  if (props.user.skills && props.user.skills.length > 0) {
    doc.setFontSize(16); doc.text('Skills:', 20, yOffset); yOffset += 7;
    doc.setFontSize(12); doc.text(`- ${props.user.skills.join(', ')}`, 25, yOffset); yOffset += 10;
  }

  // Preferred Roles
   if (props.user.preferredRoles && props.user.preferredRoles.length > 0) {
    doc.setFontSize(16); doc.text('Preferred Roles:', 20, yOffset); yOffset += 7;
    doc.setFontSize(12); doc.text(`- ${props.user.preferredRoles.join(', ')}`, 25, yOffset); yOffset += 10;
  }

   // Optional: XP Breakdown in PDF
   if (props.user.xpByRole) {
       doc.setFontSize(16); doc.text('XP Breakdown:', 20, yOffset); yOffset += 7;
       doc.setFontSize(11);
       for (const [role, xp] of Object.entries(props.user.xpByRole)) {
           // Format role name for display
           const roleName = role.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
           doc.text(`- ${roleName}: ${xp || 0}`, 25, yOffset);
           yOffset += 6;
       }
       yOffset += 4; // Extra space after breakdown
   }


  // Projects
  doc.setFontSize(16); doc.text('Projects:', 20, yOffset); yOffset += 7;
  doc.setFontSize(12);
  if (props.user.projects && props.user.projects.length > 0) {
    props.user.projects.forEach((project, index) => {
      if (yOffset > 270) { doc.addPage(); yOffset = 20; doc.setFontSize(12); }
      doc.setFontSize(13); doc.text(`${index + 1}. ${project.projectName}`, 25, yOffset); yOffset += 6;
      doc.setFontSize(11);
       if (project.description) {
            const splitDescription = doc.splitTextToSize(project.description, 160);
            doc.text(splitDescription, 30, yOffset); yOffset += (splitDescription.length * 5);
       }
      if (project.githubLink) {
          doc.setTextColor(0, 0, 255);
          doc.textWithLink('GitHub Link', 30, yOffset, { url: project.githubLink });
          doc.setTextColor(0, 0, 0); yOffset += 6;
      }
       yOffset += 4;
    });
  } else {
    doc.text('- No projects added yet.', 25, yOffset); yOffset += 10;
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i); doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, 287, { align: 'center' });
  }

  doc.save(`${props.user.uid}_portfolio.pdf`);
};
</script>

<style scoped>
button { margin-left: var(--space-3); }
</style>