<template>
  <div 
    class="user-card"
    :class="{ 
      'user-card-simple': variant === 'simple',
      'user-card-leaderboard': variant === 'leaderboard',
      'user-card-ranked': variant === 'ranked'
    }"
  >
    <!-- Simple Variant (original) -->
    <div v-if="variant === 'simple'" class="d-flex align-items-center p-3">
      <p class="fs-7 fw-medium text-primary mb-0 username-text">
        <i class="fas fa-user me-1 text-secondary fa-xs"></i> 
        {{ name || `User (${userId.substring(0, 5)}...)` }}
      </p>
      <span v-if="showXp && displayValue !== null" class="ms-2 badge bg-light text-dark border">
        {{ displayValue }} XP
      </span>
    </div>

    <!-- Leaderboard/Ranked Variant -->
    <div v-else class="d-flex align-items-center">
      <!-- Rank Badge (if ranked) -->
      <div v-if="variant === 'ranked'" class="rank-container me-2">
        <div v-if="rank !== null && rank <= 3" :class="['rank-badge', `rank-${rank}`]">
          {{ rank }}
        </div>
        <span v-else-if="rank !== null" class="rank-number">{{ rank }}</span>
      </div>

      <!-- User Info -->
      <div class="d-flex align-items-center">
        <img
          v-if="showAvatar"
          :src="photoURL || defaultAvatarUrl"
          :alt="name || 'User'"
          @error="handleImageError"
          class="user-avatar me-2"
        />
        <div class="user-info">
          <router-link
            v-if="linkToProfile"
            :to="{ name: 'PublicProfile', params: { userId } }"
            class="user-link"
          >
            {{ name || `User ${userId.substring(0, 6)}` }}
          </router-link>
          <span v-else class="user-name">
            {{ name || `User ${userId.substring(0, 6)}` }}
          </span>
          
          <span v-if="showXp && displayValue !== null" class="xp-value ms-2">
            {{ displayValue }} XP
          </span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed } from 'vue';
import { useProfileStore } from '@/stores/profileStore';

interface Props {
  userId: string;
  variant?: 'simple' | 'leaderboard' | 'ranked';
  rank?: number | null;
  displayValue?: number | null;
  showXp?: boolean;
  showAvatar?: boolean;
  linkToProfile?: boolean;
  photoURL?: string | null;
}

const props = withDefaults(defineProps<Props>(), {
  variant: 'simple',
  rank: null,
  displayValue: null,
  showXp: false,
  showAvatar: true,
  linkToProfile: true,
  photoURL: null
});

const studentStore = useProfileStore();
const name = ref<string | null>(null);
const defaultAvatarUrl: string = '/default-avatar.png';
const imgError = ref<boolean>(false);

const fetchUserData = async (): Promise<void> => {
  // Fetch name from cache or store
  const cachedName = studentStore.getCachedStudentName(props.userId);
  if (cachedName) {
    name.value = cachedName;
  } else {
    name.value = `User (${props.userId.substring(0, 5)}...)`; // Fallback if not fetching here
  }
};

const handleImageError = () => {
  imgError.value = true;
};

onMounted(fetchUserData);

</script>

<style scoped>
/* Base styles */
.fs-7 {
  font-size: 0.875rem !important;
}

.user-card-simple {
  background-color: var(--bs-light);
  border-bottom: 1px solid var(--bs-border-color-translucent);
  transition: background-color 0.2s ease-in-out;
}

.user-card-simple:hover {
  background-color: var(--bs-tertiary-bg);
}

.username-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.fa-xs {
  font-size: 0.75em;
  vertical-align: baseline;
}

/* Leaderboard/Ranked styles */
.user-card-leaderboard,
.user-card-ranked {
  padding: 0.75rem;
  display: flex;
  align-items: center;
}

.rank-badge {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  color: white;
  font-size: 1rem;
  position: relative;
  overflow: hidden;
}

.rank-badge::before {
  content: '';
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.3), transparent);
  transform: rotate(45deg);
  transition: all 0.6s;
  opacity: 0;
}

.rank-badge:hover::before {
  opacity: 1;
  transform: rotate(45deg) translate(50%, 50%);
}

.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffa500, #ff8c00);
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
  border: 2px solid #ffed4e;
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #e8e8e8, #c0c0c0, #a9a9a9);
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.4);
  border: 2px solid #f0f0f0;
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #daa520, #cd7f32, #8b4513);
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
  border: 2px solid #f4a460;
}

.rank-number {
  font-weight: 500;
  color: var(--bs-secondary);
  width: 2rem;
  text-align: center;
  display: inline-block;
}

.user-link {
  color: var(--bs-primary);
  text-decoration: none;
  font-weight: 500;
  transition: color 0.2s ease;
}

.user-link:hover {
  text-decoration: underline;
}

.user-name {
  font-weight: 500;
}

.user-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--bs-border-color-translucent);
}

.xp-value {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--bs-secondary);
}

.user-info {
  display: flex;
  align-items: center;
}
</style>
