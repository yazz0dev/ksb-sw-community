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
import { ref, computed } from 'vue';
import { generatePortfolioPDF } from '@/utils/pdfGenerator';
import { XPData } from '@/types/xp'; // Import XPData for user prop

interface Project {
  projectName: string;
  link: string;
  description?: string;
}

// User prop now reflects the structure where XP data is nested
interface UserForPortfolio {
  name: string;
  uid: string; // Added UID for pdf naming
  xpData?: Partial<XPData>; // XP data is now nested and partial to allow for cases where it might not be fully populated yet
  // Other profile fields if needed by pdfGenerator
  skills?: string[];
  bio?: string;
}

const props = defineProps<{
  user: UserForPortfolio; // Use the updated UserForPortfolio interface
  projects: Project[];
  eventParticipationCount: number;
}>();

const isGenerating = ref(false);
const isEligible = computed(() => props.eventParticipationCount >= 5);

const emit = defineEmits<{
  (e: 'error', message: string): void;
}>();

const generatePDF = async () => {
  if (isGenerating.value) return;
  isGenerating.value = true;

  try {
    // Adapt user data for pdfGenerator if its signature changed
    // For now, assuming pdfGenerator can handle the UserForPortfolio structure,
    // especially how it accesses XP (e.g., props.user.xpData?.xp_developer)
    const pdf = await generatePortfolioPDF(props.user, props.projects);
    const userNameForFile = props.user.name || props.user.uid || 'user';
    pdf.save(`portfolio-${userNameForFile.toLowerCase().replace(/\s+/g, '-')}.pdf`);
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
    min-width: 150px;
}
</style>