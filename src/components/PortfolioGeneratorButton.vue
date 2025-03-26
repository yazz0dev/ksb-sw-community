<template>
  <button @click="generatePdf" class="btn btn-primary btn-sm">Generate PDF Portfolio</button>
</template>

<script setup>
import { defineProps, computed } from 'vue';
import { jsPDF } from 'jspdf';
import 'jspdf-autotable'; // Import autoTable if needed for complex layouts

const props = defineProps({
  user: {
    type: Object,
    required: true,
    validator: (value) => {
      return value && value.uid && value.name && typeof value.xpByRole === 'object';
    }
  },
  // --- NEW: Accept projects prop ---
  projects: {
      type: Array,
      required: true,
      default: () => []
  }
});

// Calculate total XP from the user prop's map
const totalXp = computed(() => {
    if (!props.user || !props.user.xpByRole) return 0;
    return Object.values(props.user.xpByRole).reduce((sum, val) => sum + (val || 0), 0);
});

// Helper to format role keys for display
const formatRoleName = (roleKey) => {
    if (!roleKey) return '';
    return roleKey.replace(/([A-Z])/g, ' $1').replace(/^./, (str) => str.toUpperCase());
};

const generatePdf = () => {
  if (!props.user) {
      console.error("User data not available for PDF generation.");
      return;
  }

  const doc = new jsPDF();
  let yOffset = 20;
  const leftMargin = 20;
  const contentWidth = doc.internal.pageSize.width - leftMargin * 2;

  doc.setFontSize(22);
  doc.text(`Portfolio: ${props.user.name}`, leftMargin, yOffset);
  yOffset += 12;

  doc.setFontSize(14);
  doc.text(`User ID: ${props.user.uid}`, leftMargin, yOffset);
  yOffset += 8;
  doc.text(`Total Experience Points (XP): ${totalXp.value}`, leftMargin, yOffset);
  yOffset += 12;

  // Skills
  if (props.user.skills && props.user.skills.length > 0) {
    doc.setFontSize(16); doc.text('Skills:', leftMargin, yOffset); yOffset += 7;
    doc.setFontSize(12); doc.text(`- ${props.user.skills.join(', ')}`, leftMargin + 5, yOffset); yOffset += 10;
  }

  // Preferred Roles
   if (props.user.preferredRoles && props.user.preferredRoles.length > 0) {
    doc.setFontSize(16); doc.text('Preferred Roles:', leftMargin, yOffset); yOffset += 7;
    doc.setFontSize(12); doc.text(`- ${props.user.preferredRoles.join(', ')}`, leftMargin + 5, yOffset); yOffset += 10;
  }

   // XP Breakdown
   if (props.user.xpByRole && Object.keys(props.user.xpByRole).length > 0) {
       doc.setFontSize(16); doc.text('XP Breakdown:', leftMargin, yOffset); yOffset += 7;
       doc.setFontSize(11);
       for (const [role, xp] of Object.entries(props.user.xpByRole)) {
           if (yOffset > 270) { doc.addPage(); yOffset = 20; doc.setFontSize(11); } // Add page break check
           doc.text(`- ${formatRoleName(role)}: ${xp || 0}`, leftMargin + 5, yOffset);
           yOffset += 6;
       }
       yOffset += 4; // Extra space after breakdown
   }


  // Projects - Use the projects prop
  doc.setFontSize(16); doc.text('Event Projects / Submissions:', leftMargin, yOffset); yOffset += 7;
  doc.setFontSize(12);
  if (props.projects && props.projects.length > 0) {
    props.projects.forEach((project, index) => {
      if (yOffset > 260) { doc.addPage(); yOffset = 20; doc.setFontSize(12); } // Check page break earlier

      // Project Name and Event Context
      doc.setFontSize(13);
      const projectTitle = `${index + 1}. ${project.projectName}`;
      doc.text(projectTitle, leftMargin + 5, yOffset); yOffset += 6;

      doc.setFontSize(10); // Smaller font for event context
      doc.setTextColor(100); // Muted color
      const eventContext = `(From Event: ${project.eventName || 'N/A'})`;
      doc.text(eventContext, leftMargin + 5, yOffset); yOffset += 6;
      doc.setTextColor(0); // Reset color
      doc.setFontSize(11); // Reset font size for description/link

       // Description (with wrapping)
       if (project.description) {
            const splitDescription = doc.splitTextToSize(`Description: ${project.description}`, contentWidth - 10); // Adjust width for indent
            if (yOffset + (splitDescription.length * 5) > 275) { doc.addPage(); yOffset = 20; doc.setFontSize(11); } // Check break before drawing text
            doc.text(splitDescription, leftMargin + 10, yOffset); yOffset += (splitDescription.length * 5);
       }

      // Link
      if (project.link) {
          if (yOffset > 275) { doc.addPage(); yOffset = 20; doc.setFontSize(11); } // Check break
          doc.setTextColor(0, 0, 255); // Blue for link
          doc.textWithLink('View Submission Link', leftMargin + 10, yOffset, { url: project.link });
          doc.setTextColor(0, 0, 0); // Reset color
          yOffset += 6;
      }
       yOffset += 4; // Space between projects
    });
  } else {
    doc.setFontSize(11);
    doc.text('- No project submissions found from completed events.', leftMargin + 5, yOffset); yOffset += 10;
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