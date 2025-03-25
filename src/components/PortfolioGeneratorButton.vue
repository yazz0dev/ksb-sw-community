<template>
  <button @click="generatePdf" class="btn btn-primary btn-sm">Generate PDF Portfolio</button>
</template>

<script setup>
import { defineProps } from 'vue';
import { jsPDF } from 'jspdf'; // Ensure jsPDF is installed: npm install jspdf

// Define the props this component accepts
const props = defineProps({
  user: {
    type: Object,
    required: true,
    validator: (value) => {
      // Basic validation to ensure expected properties exist
      return value && value.uid && value.name && value.xp;
    }
  }
});

const generatePdf = () => {
  if (!props.user) {
      console.error("User data not available for PDF generation.");
      // Optionally show an alert to the user
      return;
  }

  const doc = new jsPDF();
  let yOffset = 20; // Initial Y position

  // --- Header ---
  doc.setFontSize(22);
  doc.text(`Portfolio: ${props.user.name}`, 20, yOffset);
  yOffset += 12;

  // --- Basic Info ---
  doc.setFontSize(14);
  doc.text(`User ID: ${props.user.uid}`, 20, yOffset);
  yOffset += 8;
  doc.text(`Experience Points (XP): ${props.user.xp}`, 20, yOffset);
  yOffset += 12; // More space before next section

  // --- Skills ---
  if (props.user.skills && props.user.skills.length > 0) {
    doc.setFontSize(16);
    doc.text('Skills:', 20, yOffset);
    yOffset += 7;
    doc.setFontSize(12);
    doc.text(`- ${props.user.skills.join(', ')}`, 25, yOffset);
    yOffset += 10;
  }

  // --- Preferred Roles ---
   if (props.user.preferredRoles && props.user.preferredRoles.length > 0) {
    doc.setFontSize(16);
    doc.text('Preferred Roles:', 20, yOffset);
    yOffset += 7;
    doc.setFontSize(12);
    doc.text(`- ${props.user.preferredRoles.join(', ')}`, 25, yOffset);
    yOffset += 10;
  }


  // --- Projects ---
  doc.setFontSize(16);
  doc.text('Projects:', 20, yOffset);
  yOffset += 7;
  doc.setFontSize(12);

  if (props.user.projects && props.user.projects.length > 0) {
    props.user.projects.forEach((project, index) => {
      // Check for page overflow before adding project
      if (yOffset > 270) { // Simple overflow check, adjust margin as needed
        doc.addPage();
        yOffset = 20; // Reset Y offset for new page
         doc.setFontSize(12); // Reset font size
      }
      doc.setFontSize(13);
      doc.text(`${index + 1}. ${project.projectName}`, 25, yOffset);
      yOffset += 6;
      doc.setFontSize(11);
       if (project.description) {
            // Handle potential line breaks in description
            const splitDescription = doc.splitTextToSize(project.description, 160); // Adjust width (180mm - margins)
            doc.text(splitDescription, 30, yOffset);
            yOffset += (splitDescription.length * 5); // Adjust line height spacing
       }
      if (project.githubLink) {
          doc.setTextColor(0, 0, 255); // Blue color for links
          doc.textWithLink('GitHub Link', 30, yOffset, { url: project.githubLink });
          doc.setTextColor(0, 0, 0); // Reset text color
           yOffset += 6;
      }
       yOffset += 4; // Extra space between projects
    });
  } else {
    doc.text('- No projects added yet.', 25, yOffset);
    yOffset += 10;
  }

  // Add more sections as needed (e.g., Events Participated, Ratings Received - fetch this data if required)

  // --- Footer (Example) ---
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      doc.setFontSize(10);
      doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.width / 2, 287, { align: 'center' });
  }


  // --- Save the PDF ---
  // Use UID for a unique filename
  doc.save(`${props.user.uid}_portfolio.pdf`);
};
</script>

<style scoped>
/* Add minimal styling if needed, but rely on global button styles */
button {
    margin-left: var(--space-3); /* Add some space if placed next to other buttons */
}
</style>