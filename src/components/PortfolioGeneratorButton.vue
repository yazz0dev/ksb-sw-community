<template>
  <button
    @click="generatePDF"
    class="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-light transition-colors"
  >
    <i class="fas fa-file-pdf mr-2"></i>Generate Portfolio PDF
  </button>
</template>

<script setup>

const props = defineProps({
  user: {
    type: Object,
    required: true
  },
  projects: {
    type: Array,
    required: true
  }
});

const generatePDF = async () => {
  // TODO: Implement PDF generation logic
  console.log('Generating PDF for:', props.user.name);
  console.log('Projects:', props.projects);
};
</script>