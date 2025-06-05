<template>
  <div class="card shadow-sm">
    <div class="card-body text-center p-4">
      <div class="mb-4">
        <img
          :src="user.photoURL || defaultAvatarUrl"
          :alt="user.name || 'Profile Photo'"
          class="img-fluid rounded-circle border border-3 border-primary shadow-sm"
          style="width: 110px; height: 110px; object-fit: cover;"
          @error="handleImageError"
          ref="profileImageRef"
        />
      </div>
      <h1 class="h4 mb-2">{{ user.name || 'User Profile' }}</h1>

      <button
        v-if="isCurrentUser"
        @click="emitEditProfile"
        class="btn btn-sm btn-outline-primary mb-3"
      >
        <i class="fas fa-edit me-1"></i> Edit Profile
      </button>

      <div v-if="user.socialLinks?.portfolio" class="mb-3">
        <a :href="user.socialLinks.portfolio" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-info d-inline-flex align-items-center">
          <i :class="['fab', socialLinkDetails.icon, 'me-2']" v-if="socialLinkDetails.isFontAwesomeBrand"></i>
          <i :class="['fas', socialLinkDetails.icon, 'me-2']" v-else></i>
          {{ socialLinkDetails.name }}
        </a>
      </div>

      <div v-if="user.socialLinks?.instagram" class="mb-3">
        <a :href="instagramUrl" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-danger d-inline-flex align-items-center">
          <i class="fab fa-instagram me-2"></i> @{{ user.socialLinks.instagram }}
        </a>
      </div>
      
      <div v-if="user.socialLinks?.other" class="mb-3">
        <a :href="user.socialLinks.other" target="_blank" rel="noopener noreferrer" class="btn btn-sm btn-outline-secondary d-inline-flex align-items-center">
          <i class="fas fa-briefcase me-2"></i> Portfolio Link
        </a>
      </div>

      <p v-if="user.bio" class="text-muted small mb-3">{{ user.bio }}</p>
      <p v-else class="text-muted small fst-italic mb-3">No bio provided.</p>

      <div v-if="user.skills && user.skills.length > 0" class="mb-3">
        <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-code me-1"></i> Skills</h6>
        <div>
          <span v-for="skill in user.skills" :key="skill" class="badge bg-light text-dark border me-1 mb-1">{{ skill }}</span>
        </div>
      </div>

      <div class="mb-3">
        <h6 class="text-secondary small fw-semibold mb-2"><i class="fas fa-laptop me-1"></i> Equipment</h6>
        <div>
          <span class="badge border me-1 mb-1" :class="user.hasLaptop ? 'bg-success-subtle text-success-emphasis' : 'bg-danger-subtle text-danger-emphasis'">
            <i :class="['fas', user.hasLaptop ? 'fa-check-circle' : 'fa-times-circle', 'me-1']"></i>
            {{ user.hasLaptop ? 'Has Laptop' : 'No Laptop' }}
          </span>
        </div>
      </div>

      <div class="d-flex justify-content-around mb-4">
        <div class="text-center">
          <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
            <h5 class="h5 mb-0">{{ stats.participatedCount }}</h5>
          </div>
          <small class="text-muted text-uppercase">Participated</small>
        </div>
        <div class="text-center">
          <div class="bg-primary-subtle text-primary-emphasis p-2 rounded mb-1">
            <h5 class="h5 mb-0">{{ stats.organizedCount }}</h5>
          </div>
          <small class="text-muted text-uppercase">Organized</small>
        </div>
        <div class="text-center">
          <div class="bg-warning-subtle text-warning-emphasis p-2 rounded mb-1">
            <h5 class="h5 mb-0">{{ user.xpData?.count_wins ?? stats.wonCount }}</h5>
          </div>
          <small class="text-muted text-uppercase">Won</small>
        </div>
      </div>
      <div class="mb-3">
        <p class="small fw-semibold text-secondary mb-1">
          <i class="fas fa-star text-warning me-1"></i> Total XP Earned
        </p>
        <p class="fs-2 text-primary fw-bold">{{ user.xpData?.totalCalculatedXp ?? 0 }}</p>
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
.badge.bg-light {
  border: 1px solid var(--bs-border-color-translucent);
}
</style>
