// src/components/forms/EventCoOrganizerForm.vue
<template>
  <div class="co-organizer-form">
    <!-- Search Input Section -->
    <div class="mb-4">
      <div class="position-relative dropdown">
        <label for="coOrganizerSearch" class="form-label fw-medium">
          <i class="fas fa-user-plus text-primary me-1"></i>
          Search & Add Co-organizers
        </label>
        <input
          id="coOrganizerSearch"
          class="form-control search-input"
          type="text"
          v-model="coOrganizerSearch"
          :disabled="isSubmitting"
          placeholder="Type a name to search..."
          @focus="showCoOrganizerDropdown = true"
          @input="searchUsers"
          @blur="handleCoOrganizerBlur"
          autocomplete="off"
          aria-describedby="coOrganizerHelp"
        />
        <div id="coOrganizerHelp" class="form-text">
          <i class="fas fa-info-circle text-info me-1"></i>
          Add other students who will help manage the event.
        </div>

        <!-- Dropdown Results -->
        <ul v-if="showCoOrganizerDropdown && filteredUsers.length > 0" class="search-dropdown shadow-lg">
          <li v-for="user in filteredUsers" :key="user.uid" class="dropdown-item-wrapper">
            <button class="dropdown-item-custom" type="button" @mousedown.prevent="addOrganizer(user.uid)">
              <i class="fas fa-user text-muted me-2"></i>
              {{ user.name || `User (${user.uid.substring(0,5)}...)` }}
            </button>
          </li>
        </ul>
        
        <!-- No Results Message -->
        <div v-else-if="showCoOrganizerDropdown && coOrganizerSearch && filteredUsers.length === 0" class="search-dropdown shadow-lg">
          <div class="no-results">
            <i class="fas fa-search text-muted me-2"></i>
            <span class="text-muted fst-italic">No matching users found.</span>
          </div>
        </div>
      </div>
    </div>

    <!-- Selected Co-organizers Section -->
    <div class="selected-organizers-section">
      <label class="form-label fw-medium mb-3">
        <i class="fas fa-users text-primary me-1"></i>
        Selected Co-organizers
        <span v-if="localOrganizers.length > 0" class="badge bg-primary-subtle text-primary-emphasis ms-2">
          {{ localOrganizers.length }}
        </span>
      </label>
      
      <div v-if="localOrganizers.length > 0" class="organizers-grid">
        <div v-for="uid in localOrganizers" :key="uid" class="organizer-badge">
          <div class="organizer-info">
            <i class="fas fa-user me-2"></i>
            <span class="organizer-name">{{ nameCache[uid] || `User (${uid.substring(0,5)}...)` }}</span>
          </div>
          <button
            type="button"
            class="remove-btn"
            aria-label="Remove co-organizer"
            @click="removeOrganizer(uid)"
            :disabled="isSubmitting"
            title="Remove co-organizer"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      
      <div v-else class="empty-state">
        <i class="fas fa-user-plus text-muted fs-2 mb-2"></i>
        <p class="text-muted fst-italic mb-0">No co-organizers added yet.</p>
        <small class="text-secondary">Use the search above to add co-organizers.</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, PropType } from 'vue';
import { UserData } from '@/types/student'; // Correctly import UserData

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

const emit = defineEmits(['update:organizers']);

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

function searchUsers() { showCoOrganizerDropdown.value = true; }
function handleCoOrganizerBlur() { setTimeout(() => { showCoOrganizerDropdown.value = false; }, 200); }
</script>

<style scoped>
.co-organizer-form {
  background: var(--bs-card-bg);
}

/* Search Input */
.search-input {
  border: 1px solid var(--bs-input-border-color);
  border-radius: var(--bs-border-radius);
  font-size: 0.95rem;
  padding: 0.75rem;
  transition: border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out;
}

.search-input:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.25rem rgba(var(--bs-primary-rgb), 0.25);
}

/* Dropdown Styles */
.search-dropdown {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  z-index: 1000;
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  max-height: 300px;
  overflow-y: auto;
  margin-top: 0.25rem;
}

.dropdown-item-wrapper {
  list-style: none;
  margin: 0;
  padding: 0;
}

.dropdown-item-custom {
  width: 100%;
  padding: 0.75rem 1rem;
  background: none;
  border: none;
  text-align: left;
  font-size: 0.9rem;
  color: var(--bs-body-color);
  transition: background-color 0.15s ease;
  display: flex;
  align-items: center;
}

.dropdown-item-custom:hover {
  background-color: var(--bs-primary-bg-subtle);
  color: var(--bs-primary);
}

.no-results {
  padding: 1rem;
  text-align: center;
  color: var(--bs-secondary);
  font-size: 0.9rem;
}

/* Selected Organizers */
.selected-organizers-section {
  background: var(--bs-light);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius);
  padding: 1.5rem;
}

.organizers-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.organizer-badge {
  display: flex;
  align-items: center;
  background: var(--bs-card-bg);
  border: 1px solid var(--bs-border-color);
  border-radius: var(--bs-border-radius-lg);
  padding: 0.5rem 0.75rem;
  gap: 0.5rem;
  font-size: 0.9rem;
  box-shadow: var(--bs-box-shadow-sm);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.organizer-badge:hover {
  transform: translateY(-1px);
  box-shadow: var(--bs-box-shadow);
}

.organizer-info {
  display: flex;
  align-items: center;
  color: var(--bs-body-color);
  font-weight: 500;
}

.organizer-name {
  max-width: 150px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.remove-btn {
  background: var(--bs-danger);
  color: white;
  border: none;
  border-radius: 50%;
  width: 1.5rem;
  height: 1.5rem;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  transition: all 0.2s ease;
  flex-shrink: 0;
}

.remove-btn:hover:not(:disabled) {
  background: var(--bs-danger);
  transform: scale(1.1);
}

.remove-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

/* Empty State */
.empty-state {
  text-align: center;
  padding: 2rem 1rem;
  color: var(--bs-secondary);
}

.form-label {
  color: var(--bs-body-color);
  margin-bottom: 0.5rem;
}

.form-text {
  font-size: 0.875rem;
  color: var(--bs-secondary);
  margin-top: 0.25rem;
}

/* Responsive Design */
@media (max-width: 768px) {
  .search-input {
    font-size: 0.9rem;
    padding: 0.625rem;
  }
  
  .selected-organizers-section {
    padding: 1rem;
  }
  
  .organizers-grid {
    gap: 0.5rem;
  }
  
  .organizer-badge {
    font-size: 0.85rem;
    padding: 0.4rem 0.6rem;
  }
  
  .organizer-name {
    max-width: 120px;
  }
  
  .remove-btn {
    width: 1.25rem;
    height: 1.25rem;
    font-size: 0.7rem;
  }
  
  .empty-state {
    padding: 1.5rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .organizers-grid {
    flex-direction: column;
  }
  
  .organizer-badge {
    justify-content: space-between;
  }
  
  .organizer-name {
    max-width: none;
  }
}
</style>