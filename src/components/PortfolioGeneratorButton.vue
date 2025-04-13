<template>
  <CButton
    @click="generatePDF"
    :isDisabled="isGenerating"
    :isLoading="isGenerating"
    leftIcon={<CIcon :name="isGenerating ? 'fa-spinner fa-spin' : 'fa-file-pdf'" />}
    colorScheme="primary"
    size="sm"
    shadow="sm"
    _hover={{ bg: 'primary-dark' }}
    _focus={{ boxShadow: 'outline' }}
    _disabled={{ opacity: 0.5 }}
  >
    {{ isGenerating ? 'Generating...' : 'Generate Portfolio PDF' }}
  </CButton>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { Button as CButton, Icon as CIcon } from '@chakra-ui/vue-next';
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
