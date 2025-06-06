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
      <!-- Button Icon -->
      <div class="btn-icon me-2">
        <span v-if="isGenerating" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
        <i v-else-if="!isEligible" class="fas fa-lock"></i>
        <i v-else class="fas fa-file-pdf"></i>
      </div>
      
      <!-- Button Text -->
      <span class="btn-text">{{ buttonText }}</span>
      
      <!-- Progress Indicator -->
      <div v-if="isGenerating" class="progress-indicator">
        <div class="progress-bar"></div>
      </div>
    </button>
    
    <!-- Eligibility Info -->
    <div v-if="!isEligible" class="eligibility-info mt-2">
      <small class="text-muted d-flex align-items-center">
        <i class="fas fa-info-circle me-1 text-info"></i>
        Requires participation in at least {{ requiredEvents }} events
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
import { ref, computed } from 'vue';
import { generatePortfolioPDF } from '@/utils/pdfGenerator';
import type { XPData } from '@/types/xp'; // Import XPData for user prop
 // Import XPData for user prop

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
const requiredEvents = 5;

const isEligible = computed(() => props.eventParticipationCount >= requiredEvents);

const eligibilityPercentage = computed(() => 
  Math.min(100, (props.eventParticipationCount / requiredEvents) * 100)
);

const buttonText = computed(() => {
  if (isGenerating.value) return 'Generating...';
  if (!isEligible.value) return 'Portfolio Locked';
  return 'Generate Portfolio PDF';
});

const getButtonTitle = computed(() => {
  if (!isEligible.value) {
    return `Requires participation in at least ${requiredEvents} events. Current: ${props.eventParticipationCount}`;
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
    // Adapt user data for pdfGenerator if its signature changed
    // For now, assuming pdfGenerator can handle the UserForPortfolio structure,
    // especially how it accesses XP (e.g., props.user.xpData?.xp_developer)
    const pdf = await generatePortfolioPDF(props.user, props.projects);
    const userNameForFile = props.user.name || props.user.uid || 'user';
    const fileName = `portfolio-${userNameForFile.toLowerCase().replace(/\s+/g, '-')}.pdf`;
    
    pdf.save(fileName);
    
    emit('success', 'Portfolio PDF generated successfully!');
  } catch (error) {
    console.error('PDF generation failed:', error);
    emit('error', 'Failed to generate PDF. Please try again.');
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

/* Button Base Styles */
.portfolio-btn {
  min-width: 180px;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: none;
  font-weight: 600;
  text-transform: none;
  letter-spacing: 0.3px;
  background: linear-gradient(135deg, var(--bs-primary), var(--bs-primary-emphasis));
  border: 1px solid var(--bs-primary);
}

/* Button States */
.portfolio-btn.btn-success:not(:disabled):hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(var(--bs-primary-rgb), 0.4);
  background: linear-gradient(135deg, var(--bs-primary-emphasis), var(--bs-primary));
}

.portfolio-btn.btn-disabled {
  background: linear-gradient(135deg, var(--bs-secondary), var(--bs-secondary-emphasis));
  border-color: var(--bs-secondary);
  color: var(--bs-white);
  cursor: not-allowed;
  opacity: 0.7;
}

.portfolio-btn.btn-generating {
  background: linear-gradient(135deg, var(--bs-info), var(--bs-info-emphasis));
  border-color: var(--bs-info);
  cursor: progress;
}

.portfolio-btn.btn-generating::before {
  content: '';
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent);
  animation: shimmer 1.5s infinite;
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