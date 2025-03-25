// /src/views/PortfolioView.vue (Bootstrap styling)
<template>
    <div class="container">
      <h2>My Portfolio</h2>
      <button @click="generatePdf" class="btn btn-primary">Generate PDF</button>
    </div>
  </template>
 
  <script>
  import { useStore } from 'vuex';
   import { jsPDF } from 'jspdf'; // Import jsPDF
  import { computed } from 'vue';
 
  export default {
    setup() {
      const store = useStore();
 
         const userData = computed(() => store.getters.getUser);
 
      const generatePdf = () => {
        const doc = new jsPDF();
 
         // Basic user info
         doc.setFontSize(22);
         doc.text(`Portfolio of ${userData.value.name}`, 20, 20);
         doc.setFontSize(16);
         doc.text(`Register Number: ${userData.value.registerNumber}`, 20, 30);
         doc.text(`XP: ${userData.value.xp}`, 20, 40);
 
         // Projects (example)
         doc.setFontSize(18);
         doc.text('Projects:', 20, 60);
         doc.setFontSize(12);
         let yOffset = 70;
         if(userData.value.projects.length)
         {
             userData.value.projects.forEach((project) => {
               doc.text(`- ${project.projectName} (${project.githubLink})`, 20, yOffset);
               yOffset += 10;
             });
         }else{
              doc.text(`- No Project added`, 20, yOffset);
               yOffset += 10;
         }
         // Add other sections (events, ratings, etc.) as needed, using doc.text()
 
        doc.save(`${userData.value.registerNumber}_portfolio.pdf`); // Save the PDF
      };
 
      return {
        generatePdf,
      };
    },
  };
  </script>