<template>
  <button
    type="button"
    class="btn btn-primary btn-sm shadow-sm d-inline-flex align-items-center"
    @click="generatePDF"
    :disabled="isGenerating || !isEligible" 
    :title="!isEligible ? 'Requires participation in at least 5 events' : 'Generate Portfolio PDF'"
    style="transition: background-color 0.2s;"
  >
    <span v-if="isGenerating" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
    <i v-else class="fas fa-file-pdf me-2"></i>
    <span>{{ isGenerating ? 'Generating...' : 'Generate Portfolio PDF' }}</span>
  </button>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'; // Import computed
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
  eventParticipationCount: number; // Add new prop for event count
}>();

const isGenerating = ref(false);

// Computed property to check eligibility
const isEligible = computed(() => props.eventParticipationCount >= 5);

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
.btn {
    min-width: 150px; /* Optional: give button a min-width */
}
</style>
