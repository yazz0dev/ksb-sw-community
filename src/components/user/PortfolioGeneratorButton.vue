<template>
  <div class="portfolio-generator-container">
    <button
      type="button"
      class="portfolio-btn btn btn-primary btn-sm-mobile d-inline-flex align-items-center shadow-sm"
      :class="{
        'btn-disabled': !isEligible,
        'btn-generating': isGenerating,
        'btn-success': isEligible && !isGenerating
      }"
      @click="generatePDF"
      :disabled="isGenerating || !isEligible"
      :title="getButtonTitle"
    >
      
      <!-- Button Text -->
      <span class="btn-text">{{ buttonText }}</span>
      
      <!-- Enhancement Badge -->
      <div v-if="comprehensiveData && isEligible" class="enhancement-badge ms-2">
        <i class="fas fa-star text-warning" title="Enhanced portfolio with comprehensive data"></i>
      </div>
      
      <!-- Progress Indicator -->
      <div v-if="isGenerating" class="progress-indicator">
        <div class="progress-bar"></div>
      </div>
    </button>
    
    <!-- Eligibility Info -->
    <div v-if="!isEligible" class="eligibility-info mt-2">
      <small class="text-muted d-flex align-items-center">
        <i class="fas fa-info-circle me-1 text-info"></i>
        Requires participation in at least {{ requiredEvents }} event{{ requiredEvents === 1 ? '' : 's' }}
        <span class="text-primary ms-1">({{ eventParticipationCount }}/{{ requiredEvents }})</span>
      </small>
      <div class="progress mt-1" style="height: 4px;">
        <div 
          class="progress-bar bg-info" 
          :style="{ width: eligibilityPercentage + '%' }"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs } from 'vue';
import { generatePortfolioPDF } from '@/utils/pdfGenerator';
import type { StudentPortfolioGenerationData, UserForPortfolio } from '@/types/student';

interface Project {
  projectName: string;
  link: string;
  description?: string | null | undefined;
}

const props = defineProps<{
  user: UserForPortfolio;
  projects: Project[];
  eventParticipationCount: number;
  comprehensiveData?: StudentPortfolioGenerationData;
}>();

// Use toRefs to avoid reactivity issues
const { user, projects, eventParticipationCount, comprehensiveData } = toRefs(props);

const isGenerating = ref(false);
const requiredEvents = 1; // Changed from 5 to 1

const isEligible = computed(() => eventParticipationCount.value >= requiredEvents);

const eligibilityPercentage = computed(() => 
  Math.min(100, (eventParticipationCount.value / requiredEvents) * 100)
);

const buttonText = computed(() => {
  if (isGenerating.value) return 'Generating...';
  if (!isEligible.value) return 'Portfolio Locked';
  return 'Generate Portfolio PDF';
});

const getButtonTitle = computed(() => {
  if (!isEligible.value) {
    return `Requires participation in at least ${requiredEvents} event. Current: ${eventParticipationCount.value}`;
  }
  if (isGenerating.value) return 'Generating your portfolio PDF...';
  return 'Generate and download your portfolio as a PDF';
});

const emit = defineEmits<{
  (e: 'error', message: string): void;
  (e: 'success', message: string): void;
}>();

const generatePDF = async () => {
  if (isGenerating.value || !isEligible.value) return;
  
  isGenerating.value = true;

  try {
    const userForPDF = {
      ...user.value,
      xpData: user.value.xpData || {}
    };
    
    const projectsForPDF = projects.value.map(project => ({
      ...project,
      description: project.description || ''
    }));
    
    // Always call generatePortfolioPDF with comprehensive data (or undefined)
    const pdf = await generatePortfolioPDF(userForPDF, projectsForPDF, comprehensiveData?.value);
    
    const userNameForFile = user.value.name || user.value.uid || 'user';
    const timestamp = new Date().toISOString().split('T')[0];
    const fileName = `portfolio-${userNameForFile.toLowerCase().replace(/\s+/g, '-')}-${timestamp}.pdf`;
    
    pdf.save(fileName);
    
    // Enhanced success message based on whether comprehensive data was available
    const successMessage = comprehensiveData?.value 
      ? 'Enhanced portfolio PDF with comprehensive data generated successfully!' 
      : 'Portfolio PDF generated successfully!';
    emit('success', successMessage);
  } catch (error) {
    console.error('PDF generation failed:', error);
    const errorMessage = error instanceof Error ? error.message : 'Failed to generate PDF. Please try again.';
    emit('error', errorMessage);
  } finally {
    isGenerating.value = false;
  }
};
</script>

<style scoped>
/* Portfolio Generator Container */
.portfolio-generator-container {
  display: inline-block;
  position: relative;
}

/* Portfolio Button - Extending base button styles */
.portfolio-btn {
  min-width: 180px;
  
  &.btn-disabled {
    cursor: not-allowed;
  }

  &.btn-generating {
    cursor: progress;
    
    &::after {
      content: '';
      position: absolute;
      top: 0;
      left: -100%;
      width: 100%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
      animation: shimmer 1.5s infinite;
      z-index: 2;
    }
  }
}

/* Button Icon */
.btn-icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.25rem;
  height: 1.25rem;
}

.btn-icon .spinner-border-sm {
  width: 1rem;
  height: 1rem;
}

/* Button Text */
.btn-text {
  transition: all 0.3s ease;
  font-size: 0.9rem;
}

.portfolio-btn:disabled .btn-text {
  opacity: 0.8;
}

/* Progress Indicator */
.progress-indicator {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 3px;
  background: rgba(255,255,255,0.2);
  overflow: hidden;
}

.progress-indicator .progress-bar {
  height: 100%;
  background: rgba(255,255,255,0.6);
  animation: progressSlide 2s infinite;
}

/* Eligibility Info */
.eligibility-info {
  max-width: 100%;
}

.eligibility-info small {
  font-size: 0.8rem;
  line-height: 1.4;
}

.eligibility-info .progress {
  border-radius: 2px;
  background-color: var(--bs-gray-200);
}

.eligibility-info .progress-bar {
  transition: width 0.6s ease;
  border-radius: 2px;
}

/* Enhancement Badge */
.enhancement-badge {
  display: flex;
  align-items: center;
  opacity: 0.8;
  transition: opacity 0.3s ease;
}

.portfolio-btn:hover .enhancement-badge {
  opacity: 1;
}

/* Responsive Design */
@media (max-width: 768px) {
  .portfolio-btn {
    min-width: 160px;
    padding: 0.5rem 1rem;
  }
  
  .btn-text {
    font-size: 0.85rem;
  }
  
  .eligibility-info {
    width: 100%;
  }
  
  .eligibility-info small {
    font-size: 0.75rem;
  }
}

@media (max-width: 480px) {
  .portfolio-generator-container {
    width: 100%;
  }
  
  .portfolio-btn {
    width: 100%;
    min-width: auto;
    padding: 0.625rem 1rem;
    justify-content: center;
  }
  
  .btn-text {
    font-size: 0.8rem;
  }
  
  .eligibility-info small {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.25rem;
  }
  
  .eligibility-info .text-primary {
    margin-left: 0 !important;
  }
}

/* Animations */
@keyframes shimmer {
  0% {
    left: -100%;
  }
  100% {
    left: 100%;
  }
}

@keyframes progressSlide {
  0% {
    transform: translateX(-100%);
  }
  50% {
    transform: translateX(0%);
  }
  100% {
    transform: translateX(100%);
  }
}

/* Disabled state styling */
.portfolio-btn:disabled {
  transform: none !important;
  box-shadow: none !important;
}

.portfolio-btn:disabled:hover {
  transform: none !important;
  box-shadow: none !important;
}

/* Focus states for accessibility */
.portfolio-btn:focus {
  outline: 2px solid var(--bs-primary);
  outline-offset: 2px;
}

.portfolio-btn:focus:not(:focus-visible) {
  outline: none;
}
</style>