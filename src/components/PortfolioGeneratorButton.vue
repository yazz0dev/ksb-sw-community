<template>
  <button
    @click="generatePDF"
    :disabled="isGenerating"
    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors disabled:opacity-50"
  >
    <i :class="['fas', isGenerating ? 'fa-spinner fa-spin' : 'fa-file-pdf', 'mr-2']"></i>
    {{ isGenerating ? 'Generating...' : 'Generate Portfolio PDF' }}
  </button>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
