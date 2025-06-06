<template>
  <div 
    class="student-card"
    :class="{ 
      'student-card-simple': variant === 'simple',
      'student-card-leaderboard': variant === 'leaderboard',
      'student-card-ranked': variant === 'ranked'
    }"
  >
    <!-- Simple Variant (minimal) -->
    <div v-if="variant === 'simple'" class="simple-content d-flex align-items-center p-3">
      <div class="user-info-container d-flex align-items-center flex-grow-1">
        <div class="user-icon me-2">
          <i class="fas fa-user text-primary"></i>
        </div>
        <p class="username-text fw-medium text-dark mb-0">
          {{ name || `User (${userId.substring(0, 5)}...)` }}
        </p>
      </div>
      <span v-if="showXp && displayValue !== null" class="xp-badge badge bg-light text-dark border rounded-pill">
        <i class="fas fa-star me-1 text-warning"></i>
        {{ displayValue }} XP
      </span>
    </div>

    <!-- Leaderboard/Ranked Variant (enhanced) -->
    <div v-else class="enhanced-content d-flex align-items-center p-3">
      <!-- Rank Badge (if ranked) -->
      <div v-if="variant === 'ranked'" class="rank-container me-3">
        <div v-if="rank !== null && rank <= 3" :class="['rank-badge', `rank-${rank}`]">
          <span class="rank-number">{{ rank }}</span>
          <div class="rank-shine"></div>
        </div>
        <div v-else-if="rank !== null" class="rank-display">
          <span class="rank-text">#{{ rank }}</span>
        </div>
      </div>

      <!-- User Info -->
      <div class="user-content d-flex align-items-center flex-grow-1">
        <!-- Avatar -->
        <div v-if="showAvatar" class="avatar-container me-3">
          <img
            :src="photoURL || defaultAvatarUrl"
            :alt="name || 'User'"
            @error="handleImageError"
            class="user-avatar"
          />
          <div class="avatar-status"></div>
        </div>
        
        <!-- User Details -->
        <div class="user-details flex-grow-1">
          <div class="user-name-section mb-1">
            <router-link
              v-if="linkToProfile"
              :to="{ name: 'PublicProfile', params: { userId } }"
              class="user-link fw-semibold text-decoration-none"
            >
              {{ name || `User ${userId.substring(0, 6)}` }}
            </router-link>
            <span v-else class="user-name fw-semibold text-dark">
              {{ name || `User ${userId.substring(0, 6)}` }}
            </span>
          </div>
          
          <div v-if="showXp && displayValue !== null" class="xp-section">
            <span class="xp-label text-muted small me-1">XP:</span>
            <span class="xp-value fw-semibold text-primary">{{ displayValue }}</span>
          </div>
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
/* Base Student Card */
.student-card {
  border-radius: var(--bs-border-radius-lg);
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color-translucent);
  transition: all 0.3s ease;
  overflow: hidden;
}

.student-card:hover {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow-sm);
}

/* Simple Variant */
.student-card-simple {
  background: linear-gradient(135deg, var(--bs-light), var(--bs-white));
  border-left: 3px solid var(--bs-primary);
}

.student-card-simple:hover {
  background: linear-gradient(135deg, var(--bs-white), var(--bs-primary-subtle));
  border-left-color: var(--bs-primary-emphasis);
}

.simple-content {
  min-height: 3.5rem;
}

.user-info-container {
  min-width: 0; /* Allow text truncation */
}

.user-icon {
  width: 1.75rem;
  height: 1.75rem;
  border-radius: 50%;
  background: var(--bs-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.username-text {
  font-size: 0.95rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--bs-dark);
}

.xp-badge {
  font-size: 0.8rem;
  font-weight: 600;
  padding: 0.4rem 0.75rem;
  border: 1px solid var(--bs-border-color) !important;
  white-space: nowrap;
  transition: all 0.3s ease;
}

.xp-badge:hover {
  background-color: var(--bs-warning-subtle) !important;
  color: var(--bs-warning-emphasis) !important;
  border-color: var(--bs-warning) !important;
}

/* Enhanced Variants (Leaderboard/Ranked) */
.student-card-leaderboard,
.student-card-ranked {
  background: var(--bs-white);
  border: 1px solid var(--bs-border-color);
}

.student-card-leaderboard:hover,
.student-card-ranked:hover {
  background: var(--bs-light);
  border-color: var(--bs-primary);
}

.enhanced-content {
  min-height: 4rem;
}

/* Rank System */
.rank-container {
  display: flex;
  align-items: center;
  justify-content: center;
}

.rank-badge {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
  transition: all 0.3s ease;
  border: 2px solid;
}

.rank-badge:hover {
  transform: scale(1.1);
}

.rank-number {
  font-weight: 700;
  font-size: 1.1rem;
  color: var(--bs-white);
  position: relative;
  z-index: 2;
}

.rank-shine {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent);
  transform: rotate(45deg);
  transition: all 0.6s ease;
  opacity: 0;
}

.rank-badge:hover .rank-shine {
  opacity: 1;
  transform: rotate(45deg) translateX(100%);
}

/* Top 3 ranks with enhanced styling */
.rank-badge.rank-1 {
  background: linear-gradient(135deg, #ffd700, #ffed4e, #ffa500);
  border-color: #ffed4e;
  box-shadow: 0 4px 12px rgba(255, 215, 0, 0.4);
}

.rank-badge.rank-2 {
  background: linear-gradient(135deg, #c0c0c0, #e8e8e8, #a9a9a9);
  border-color: #e8e8e8;
  box-shadow: 0 4px 12px rgba(192, 192, 192, 0.4);
}

.rank-badge.rank-3 {
  background: linear-gradient(135deg, #cd7f32, #daa520, #8b4513);
  border-color: #daa520;
  box-shadow: 0 4px 12px rgba(205, 127, 50, 0.4);
}

.rank-display {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  background: var(--bs-secondary-subtle);
  border-radius: 50%;
  border: 2px solid var(--bs-secondary);
}

.rank-text {
  font-weight: 600;
  font-size: 0.9rem;
  color: var(--bs-secondary-emphasis);
}

/* Avatar */
.avatar-container {
  position: relative;
}

.user-avatar {
  width: 2.75rem;
  height: 2.75rem;
  border-radius: 50%;
  object-fit: cover;
  border: 2px solid var(--bs-border-color);
  transition: all 0.3s ease;
}

.user-avatar:hover {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 2px rgba(var(--bs-primary-rgb), 0.2);
}

.avatar-status {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 0.75rem;
  height: 0.75rem;
  background: var(--bs-success);
  border: 2px solid var(--bs-white);
  border-radius: 50%;
}

/* User Details */
.user-details {
  min-width: 0; /* Allow text truncation */
}

.user-link {
  color: var(--bs-primary);
  transition: color 0.3s ease;
  font-size: 1rem;
}

.user-link:hover {
  color: var(--bs-primary-emphasis);
  text-decoration: underline !important;
}

.user-name {
  font-size: 1rem;
  color: var(--bs-dark);
}

.xp-section {
  display: flex;
  align-items: center;
}

.xp-label {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.xp-value {
  font-size: 0.9rem;
  color: var(--bs-primary);
}

/* Responsive Design */
@media (max-width: 768px) {
  .enhanced-content {
    padding: 0.75rem !important;
  }
  
  .rank-badge {
    width: 2.5rem;
    height: 2.5rem;
  }
  
  .rank-number {
    font-size: 1rem;
  }
  
  .rank-display {
    width: 2rem;
    height: 2rem;
  }
  
  .rank-text {
    font-size: 0.8rem;
  }
  
  .user-avatar {
    width: 2.25rem;
    height: 2.25rem;
  }
  
  .avatar-status {
    width: 0.6rem;
    height: 0.6rem;
  }
  
  .user-link,
  .user-name {
    font-size: 0.95rem;
  }
  
  .xp-value {
    font-size: 0.85rem;
  }
}

@media (max-width: 480px) {
  .simple-content,
  .enhanced-content {
    padding: 0.625rem !important;
  }
  
  .enhanced-content {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.75rem;
  }
  
  .rank-container {
    align-self: flex-end;
    margin: 0 !important;
  }
  
  .user-content {
    width: 100%;
  }
  
  .user-link,
  .user-name {
    font-size: 0.9rem;
  }
  
  .username-text {
    font-size: 0.9rem;
  }
  
  .xp-badge {
    font-size: 0.75rem;
    padding: 0.3rem 0.6rem;
  }
}
</style>
