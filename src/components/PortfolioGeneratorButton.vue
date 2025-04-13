<template>
  <button
    class="button is-primary is-small has-shadow"
    @click="generatePDF"
    :disabled="isGenerating"
    :class="{ 'is-loading': isGenerating }"
    style="transition: background-color 0.2s;"
  >
    <span class="icon is-small">
      <i :class="['fas', isGenerating ? 'fa-spinner fa-spin' : 'fa-file-pdf']"></i>
    </span>
    <span>{{ isGenerating ? 'Generating...' : 'Generate Portfolio PDF' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
// Removed Chakra UI imports
// import { Button as CButton, Icon as CIcon } from '@chakra-ui/vue-next';
import { generatePortfolioPDF } from '../utils/pdfGenerator';

// Define an interface for the project object
interface Project {
  projectName: string;
  link: string;
  description?: string;
}

interface User {
  name: string;
  xpByRole?: Record<string, number>;
  [key: string]: any;
}

const props = defineProps<{
  user: User;
  projects: Project[];
}>();

const isGenerating = ref(false);

const emit = defineEmits<{
  (e: 'error', message: string): void;
}>();

const generatePDF = async () => {
  if (isGenerating.value) return;
  isGenerating.value = true;
  
  try {
    const pdf = await generatePortfolioPDF(props.user, props.projects);
    pdf.save(`portfolio-${props.user.name.toLowerCase().replace(/\s+/g, '-')}.pdf`);
  } catch (error) {
    console.error('PDF generation failed:', error);
    emit('error', 'Failed to generate PDF. Please try again.');
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style scoped>
.button.has-shadow {
  box-shadow: 0 1px 3px rgba(0,0,0,0.1), 0 1px 2px rgba(0,0,0,0.06); /* Approximate shadow-sm */
}

.button:hover {
  background-color: var(--color-primary-dark); /* Assuming you have this variable */
}

.button:focus {
  /* Bulma handles focus outlines, but you can customize if needed */
  /* box-shadow: 0 0 0 3px rgba(66, 153, 225, 0.6); */ 
}

.button:disabled {
  opacity: 0.5;
}
</style>
