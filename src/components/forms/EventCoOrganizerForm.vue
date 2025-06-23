// src/components/forms/EventCoOrganizerForm.vue
<template>
  <div class="co-organizer-form">
    <!-- Compact Search Section -->
    <div class="mb-3">
      <div class="position-relative">
        <label for="coOrganizerSearch" class="form-label small fw-medium text-secondary mb-2">
          <i class="fas fa-user-plus text-primary me-1"></i>
          Search & Add Co-organizers
        </label>
        <div class="input-group input-group-sm">
          <span class="input-group-text bg-light">
            <i class="fas fa-search text-muted"></i>
          </span>
          <input
            id="coOrganizerSearch"
            class="form-control"
            type="text"
            v-model="coOrganizerSearch"
            :disabled="isSubmitting"
            placeholder="Type a name to search..."
            @focus="showCoOrganizerDropdown = true"
            @input="searchUsers"
            @blur="handleCoOrganizerBlur"
            autocomplete="off"
          />
        </div>
        <div class="form-text small text-muted mt-1">
          <i class="fas fa-info-circle me-1"></i>
          Add other students who will help manage the event.
        </div>

        <!-- Compact Dropdown Results -->
        <ul v-if="showCoOrganizerDropdown && filteredUsers.length > 0" class="search-dropdown">
          <li v-for="user in filteredUsers" :key="user.uid" class="dropdown-item-wrapper">
            <button class="dropdown-item-custom" type="button" @mousedown.prevent="addOrganizer(user.uid)">
              <i class="fas fa-user text-muted me-2"></i>
              {{ user.name || `User (${user.uid.substring(0,5)}...)` }}
            </button>
          </li>
        </ul>
        
        <!-- No Results Message -->
        <div v-else-if="showCoOrganizerDropdown && coOrganizerSearch && filteredUsers.length === 0" class="search-dropdown">
          <div class="no-results">
            <i class="fas fa-search text-muted me-2"></i>
            <span class="text-muted">No matching users found.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Compact Selected Co-organizers Section -->
    <div class="selected-organizers-section">
      <div class="d-flex align-items-center justify-content-between mb-2">
        <label class="form-label small fw-medium text-secondary mb-0">
          <i class="fas fa-users text-primary me-1"></i>
          Selected Co-organizers
        </label>
        <span v-if="localOrganizers.length > 0" class="badge bg-primary-subtle text-primary-emphasis">
          {{ localOrganizers.length }}
        </span>
      </div>
      
      <div v-if="localOrganizers.length > 0" class="compact-grid">
        <div v-for="uid in localOrganizers" :key="uid" class="compact-card">
          <div class="compact-card-info">
            <i class="fas fa-user text-primary me-2"></i>
            <span class="compact-card-name">{{ nameCache[uid] || `User (${uid.substring(0,5)}...)` }}</span>
          </div>
          <button
            type="button"
            class="btn-remove-compact"
            @click="removeOrganizer(uid)"
            :disabled="isSubmitting"
            title="Remove co-organizer"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div v-else class="empty-state-compact text-center py-3">
        <i class="fas fa-user-plus text-muted mb-1" style="font-size: 1.5rem; opacity: 0.5;"></i>
        <p class="text-muted small mb-0">No co-organizers added</p>
        <small class="text-secondary">Search above to add co-organizers</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import type { UserData } from '@/types/student'; // Correctly import UserData
 // Correctly import UserData

const props = defineProps({
  organizers: {
      type: Array as PropType<string[]>,
      required: true
  },
  isSubmitting: {
      type: Boolean,
      default: false
  },
  nameCache: {
      type: Object as PropType<Record<string, string>>,
      required: true
  },
  currentUserUid: {
      type: String as PropType<string | null>,
      default: null
  },
  allUsers: { // This prop expects UserData[]
      type: Array as PropType<UserData[]>,
      required: true
  }
});

const emit = defineEmits(['update:organizers', 'validity-change']);

const localOrganizers = ref<string[]>([...props.organizers]);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);

watch(() => props.organizers, (newVal) => {
  localOrganizers.value = [...newVal];
}, { deep: true });

const filteredUsers = computed(() => {
  if (!coOrganizerSearch.value) return [];
  const searchLower = coOrganizerSearch.value.toLowerCase().trim();
  if (searchLower.length < 2) return [];

  return (props.allUsers || []).filter(user => {
    if (!user?.uid || !user.name) return false;
    if (user.uid === props.currentUserUid || localOrganizers.value.includes(user.uid)) return false;
    return user.name.toLowerCase().includes(searchLower);
  }).slice(0, 10);
});

function addOrganizer(userId: string) {
  if (!localOrganizers.value.includes(userId)) {
    localOrganizers.value.push(userId);
    emitOrganizersUpdate();
  }
  coOrganizerSearch.value = '';
  showCoOrganizerDropdown.value = false;
}

function removeOrganizer(userId: string) {
  const idx = localOrganizers.value.indexOf(userId);
  if (idx !== -1) {
    localOrganizers.value.splice(idx, 1);
    emitOrganizersUpdate();
  }
}

function emitOrganizersUpdate() {
  emit('update:organizers', [...localOrganizers.value]);
}

// Add validation computed property (organizers are optional, so always valid)
const isOrganizersValid = computed(() => true); // Co-organizers are optional

// Watch organizers validity and emit changes
watch(isOrganizersValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });

function searchUsers() { showCoOrganizerDropdown.value = true; }
function handleCoOrganizerBlur() { setTimeout(() => { showCoOrganizerDropdown.value = false; }, 200); }
</script>

<style scoped>
.co-organizer-form {
  --border-radius: 6px;
}

/* Compact Search Input */
.input-group-text {
  border-color: var(--bs-border-color);
  background: var(--bs-light-bg-subtle);
}

.form-control:focus {
  border-color: var(--primary-color);
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
}

/* Compact Selected Organizers */
.selected-organizers-section {
  background: var(--bs-body-bg);
  border: 1px solid var(--bs-border-color-translucent);
  border-radius: var(--border-radius);
  padding: 0.75rem;
}

/* Form Labels */
.form-label {
  color: var(--bs-body-color);
  margin-bottom: 0.25rem;
}

.form-text {
  font-size: 0.8rem;
  color: var(--bs-secondary);
}

/* Badge */
.badge {
  font-size: 0.75em;
  padding: 0.3em 0.5em;
  border-radius: 0.25rem;
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .form-text {
    font-size: 0.75rem;
  }
  
  .selected-organizers-section {
    padding: 0.5rem;
  }
}

@media (max-width: 480px) {
  .empty-state-compact {
    padding: 1.5rem 0.5rem;
  }
}
</style>