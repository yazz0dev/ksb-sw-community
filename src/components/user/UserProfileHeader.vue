<template>
  <div class="section-card shadow-sm rounded-4 animate-fade-in">
    <div class="card-body text-center p-4 p-md-5">
      <!-- Profile Photo Section -->
      <div class="mb-4">
        <div class="profile-photo-container position-relative d-inline-block">
          <img
            :src="user.photoURL || defaultAvatarUrl"
            :alt="user.name || 'Profile Photo'"
            class="profile-photo img-fluid border border-3 border-primary shadow-sm"
            @error="handleImageError"
            ref="profileImageRef"
          />
          <div class="photo-overlay">
            <i class="fas fa-user-circle"></i>
          </div>
        </div>
      </div>

      <!-- User Name & Edit Button -->
      <div class="mb-4">
        <h1 class="h3 fw-semibold text-dark mb-3">{{ user.name || 'User Profile' }}</h1>
        
        <button
          v-if="isCurrentUser"
          @click="emitEditProfile"
          class="btn btn-outline-primary btn-sm-mobile d-inline-flex align-items-center mb-3"
        >
          <i class="fas fa-edit me-2"></i>Edit Profile
        </button>
      </div>

      <!-- Social Links Section -->
      <div v-if="hasSocialLinks" class="social-links-section mb-4">
        <div class="social-links-grid">
          <a 
            v-if="user.socialLinks?.portfolio" 
            :href="user.socialLinks.portfolio" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn btn-sm btn-outline-info d-inline-flex align-items-center social-link"
          >
            <i :class="['fab', socialLinkDetails.icon, 'me-2']" v-if="socialLinkDetails.isFontAwesomeBrand"></i>
            <i :class="['fas', socialLinkDetails.icon, 'me-2']" v-else></i>
            {{ socialLinkDetails.name }}
          </a>

          <a 
            v-if="user.socialLinks?.instagram" 
            :href="instagramUrl" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn btn-sm btn-outline-danger d-inline-flex align-items-center social-link"
          >
            <i class="fab fa-instagram me-2"></i>@{{ user.socialLinks.instagram }}
          </a>
          
          <a 
            v-if="user.socialLinks?.other" 
            :href="user.socialLinks.other" 
            target="_blank" 
            rel="noopener noreferrer" 
            class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center social-link"
          >
            <i class="fas fa-briefcase me-2"></i>Portfolio
          </a>
        </div>
      </div>

      <!-- Bio Section -->
      <div class="bio-section mb-4">
        <div class="bio-container">
          <i class="fas fa-quote-left text-secondary me-2"></i>
          <span v-if="user.bio" class="text-secondary">{{ user.bio }}</span>
          <span v-else class="text-muted fst-italic">No bio provided.</span>
        </div>
      </div>

      <!-- Skills Section -->
      <div v-if="user.skills && user.skills.length > 0" class="skills-section mb-4">
        <div class="info-section-header mb-3">
          <i class="fas fa-code text-primary me-2"></i>
          <span class="fw-semibold text-dark">Skills</span>
        </div>
        <div class="skills-container">
          <span 
            v-for="skill in user.skills" 
            :key="skill" 
            class="skill-badge badge bg-light text-dark border me-2 mb-2"
          >
            {{ skill }}
          </span>
        </div>
      </div>

      <!-- Equipment Section -->
      <div class="equipment-section mb-4">
        <div class="info-section-header mb-3">
          <i class="fas fa-laptop text-primary me-2"></i>
          <span class="fw-semibold text-dark">Equipment</span>
        </div>
        <div class="equipment-status">
          <span 
            class="equipment-badge badge border" 
            :class="user.hasLaptop ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'"
          >
            <i :class="['fas', user.hasLaptop ? 'fa-check-circle' : 'fa-times-circle', 'me-2']"></i>
            {{ user.hasLaptop ? 'Has Laptop' : 'No Laptop' }}
          </span>
        </div>
      </div>

      <!-- Stats Section -->
      <div class="stats-section mb-4">
        <div class="stats-grid">
          <div class="stat-item">
            <div class="stat-value bg-primary-subtle text-primary-emphasis rounded-3 p-3 mb-2">
              <span class="h4 fw-semibold mb-0">{{ stats.participatedCount }}</span>
            </div>
            <small class="stat-label text-muted text-uppercase fw-medium">Participated</small>
          </div>
          <div class="stat-item">
            <div class="stat-value bg-primary-subtle text-primary-emphasis rounded-3 p-3 mb-2">
              <span class="h4 fw-semibold mb-0">{{ stats.organizedCount }}</span>
            </div>
            <small class="stat-label text-muted text-uppercase fw-medium">Organized</small>
          </div>
          <div class="stat-item">
            <div class="stat-value bg-warning-subtle text-warning-emphasis rounded-3 p-3 mb-2">
              <span class="h4 fw-semibold mb-0">{{ user.xpData?.count_wins ?? stats.wonCount }}</span>
            </div>
            <small class="stat-label text-muted text-uppercase fw-medium">Won</small>
          </div>
        </div>
      </div>

      <!-- Total XP Section -->
      <div class="xp-section">
        <div class="xp-header d-flex align-items-center justify-content-center mb-3">
          <i class="fas fa-star text-warning me-2"></i>
          <span class="fw-semibold text-secondary">Total XP Earned</span>
        </div>
        <div class="xp-value-container">
          <span class="xp-value display-5 text-primary fw-bold">{{ user.xpData?.totalCalculatedXp ?? 0 }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { formatRoleName as formatRoleNameForDisplay } from '@/utils/formatters';
import { EnrichedUserData } from '@/types/student';

interface Props {
  user: EnrichedUserData;
  isCurrentUser: boolean;
  stats: {
    participatedCount: number;
    organizedCount: number;
    wonCount: number;
  };
}

const props = defineProps<Props>();
const emit = defineEmits<{
  (e: 'edit-profile'): void;
}>();

const defaultAvatarUrl = '/default-avatar.png';
const profileImageRef = ref<HTMLImageElement | null>(null);

const hasSocialLinks = computed(() => {
  return !!(props.user.socialLinks?.portfolio || 
           props.user.socialLinks?.instagram || 
           props.user.socialLinks?.other);
});

const socialLinkDetails = computed(() => {
  const portfolioLink = props.user.socialLinks?.portfolio;
  if (!portfolioLink) {
    return { name: 'Social Profile', icon: 'fa-link', isFontAwesomeBrand: false };
  }
  const link = portfolioLink.toLowerCase();
  if (link.includes('github.com')) return { name: 'GitHub', icon: 'fa-github', isFontAwesomeBrand: true };
  if (link.includes('linkedin.com')) return { name: 'LinkedIn', icon: 'fa-linkedin', isFontAwesomeBrand: true };
  if (link.includes('twitter.com') || link.includes('x.com')) return { name: 'Twitter/X', icon: 'fa-twitter', isFontAwesomeBrand: true };
  return { name: 'Website', icon: 'fa-link', isFontAwesomeBrand: false };
});

const instagramUrl = computed(() => {
  if (!props.user.socialLinks?.instagram) return '#';
  
  // Clean up the username (remove @ if present and any trailing/leading spaces)
  const username = props.user.socialLinks.instagram.trim().replace(/^@/, '');
  
  // Return the full Instagram URL
  return `https://instagram.com/${username}`;
});

const handleImageError = (e: Event) => {
  const target = e.target as HTMLImageElement | null;
  if (target) {
    target.src = defaultAvatarUrl;
    target.onerror = null; // Prevent infinite loop
  }
};

const emitEditProfile = () => {
  emit('edit-profile');
};

onMounted(() => {
  if (props.user && !props.user.photoURL && profileImageRef.value) {
    profileImageRef.value.src = defaultAvatarUrl;
  }
});
</script>

<style scoped>
/* Profile Photo Styling */
.profile-photo-container {
  transition: transform 0.3s ease;
}

.profile-photo-container:hover {
  transform: scale(1.02);
}

.profile-photo {
  width: 120px;
  height: 120px;
  border-radius: 50%;
  object-fit: cover;
  border-color: var(--bs-primary) !important;
  transition: box-shadow 0.3s ease;
}

.profile-photo:hover {
  box-shadow: var(--bs-box-shadow-lg);
}

.photo-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(var(--bs-primary-rgb), 0.1);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.photo-overlay i {
  font-size: 1.5rem;
  color: var(--bs-primary);
}

.profile-photo-container:hover .photo-overlay {
  opacity: 1;
}

/* Social Links */
.social-links-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  justify-content: center;
}

.social-link {
  transition: all 0.3s ease;
  border-width: 1.5px;
}

.social-link:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow-sm);
}

/* Bio Section */
.bio-container {
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 1rem;
  background: var(--bs-light);
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color-translucent);
}

/* Info Section Headers */
.info-section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

/* Skills */
.skills-container {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.25rem;
}

.skill-badge {
  border-color: var(--bs-border-color) !important;
  transition: all 0.3s ease;
  padding: 0.4rem 0.8rem;
}

.skill-badge:hover {
  background-color: var(--bs-primary-subtle) !important;
  color: var(--bs-primary-emphasis) !important;
  border-color: var(--bs-primary) !important;
  transform: translateY(-1px);
}

/* Equipment */
.equipment-status {
  display: flex;
  justify-content: center;
}

.equipment-badge {
  padding: 0.5rem 1rem;
  font-weight: 500;
  transition: transform 0.3s ease;
}

.equipment-badge:hover {
  transform: scale(1.05);
}

/* Stats Grid */
.stats-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.stat-item {
  text-align: center;
}

.stat-value {
  transition: all 0.3s ease;
  border: 1px solid var(--bs-border-color-translucent);
}

.stat-value:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow-sm);
}

.stat-label {
  font-size: 0.75rem;
  letter-spacing: 0.5px;
}

/* XP Section */
.xp-header {
  font-size: 0.95rem;
}

.xp-value-container {
  padding: 1rem;
  background: linear-gradient(135deg, var(--bs-primary-subtle), var(--bs-light));
  border-radius: var(--bs-border-radius-lg);
  border: 1px solid var(--bs-border-color-translucent);
  transition: all 0.3s ease;
}

.xp-value-container:hover {
  transform: translateY(-2px);
  box-shadow: var(--bs-box-shadow);
}

.xp-value {
  font-size: 2.5rem;
  text-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

/* Responsive Design */
@media (max-width: 768px) {
  .profile-photo {
    width: 100px;
    height: 100px;
  }
  
  .social-links-grid {
    flex-direction: column;
    align-items: center;
  }
  
  .social-link {
    width: 100%;
    max-width: 250px;
  }
  
  .stats-grid {
    gap: 0.75rem;
  }
  
  .stat-value {
    padding: 0.75rem !important;
  }
  
  .stat-value .h4 {
    font-size: 1.25rem;
  }
  
  .xp-value {
    font-size: 2rem;
  }
}

@media (max-width: 480px) {
  .card-body {
    padding: 1.5rem !important;
  }
  
  .stats-grid {
    grid-template-columns: 1fr;
    gap: 0.5rem;
  }
  
  .stat-item {
    display: flex;
    align-items: center;
    justify-content: space-between;
    text-align: left;
  }
  
  .stat-value {
    padding: 0.5rem 1rem !important;
    margin-bottom: 0 !important;
  }
  
  .stat-value .h4 {
    font-size: 1.1rem;
    margin-bottom: 0;
  }
}
</style>
