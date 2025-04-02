<template>
  <button @click="generatePDF" class="btn btn-primary">
    <i class="fas fa-file-pdf me-2"></i>Generate Portfolio PDF
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