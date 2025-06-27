<template>
  <div class="event-participant-form">
    <!-- General Participants -->
    <div class="mb-4">
      <h6 class="text-dark mb-2">
        Event Participants <span class="text-danger">*</span>
        <span class="text-muted small">({{ participants.length }} selected)</span>
        <span v-if="validationState.participants.isInvalid" class="text-danger ms-2">
          <i class="fas fa-exclamation-triangle"></i>
        </span>
      </h6>
      
      <!-- Validation message for participants -->
      <div v-if="validationState.participants.message" class="alert alert-sm py-2 mb-3" :class="{
        'alert-danger': validationState.participants.isInvalid,
        'alert-warning': validationState.participants.isWarning,
        'alert-info': !validationState.participants.isInvalid && !validationState.participants.isWarning
      }">
        <i class="fas me-1" :class="{
          'fa-exclamation-triangle': validationState.participants.isInvalid,
          'fa-exclamation-circle': validationState.participants.isWarning,
          'fa-info-circle': !validationState.participants.isInvalid && !validationState.participants.isWarning
        }"></i>
        {{ validationState.participants.message }}
      </div>
      
      <!-- Show helpful message for editing -->
      <p v-if="isEditing && participants.length > 0" class="small text-info mb-3">
        <i class="fas fa-info-circle me-1"></i>
        You are editing an existing event. Current participants are loaded and can be modified.
      </p>
      <p v-else-if="participants.length > 0" class="small text-muted">
        You can add or remove participants as needed below.
      </p>
      <p v-else-if="maxParticipants && participants.length >= maxParticipants" class="small text-muted">
        Maximum participants ({{ maxParticipants }}) reached.
      </p>

      <!-- Search-based UI for adding individual participants -->
      <div class="position-relative mb-3">
        <label class="form-label small fw-medium text-secondary mb-2">
          <i class="fas fa-user-plus text-primary me-1"></i>
          Search & Add Participants
        </label>
        <div class="input-group input-group-sm">
          <span class="input-group-text bg-light">
            <i class="fas fa-search text-muted"></i>
          </span>
          <input
            class="form-control"
            type="text"
            v-model="participantSearch"
            :disabled="isSubmitting || (maxParticipants !== null && participants.length >= maxParticipants)"
            placeholder="Type a name to search..."
            @focus="showParticipantDropdown = true"
            @input="searchParticipants"
            @blur="handleParticipantBlur"
            autocomplete="off"
            :class="{ 'is-invalid': validationState.participants.isInvalid && participants.length === 0 }"
          />
        </div>

        <!-- Participant Search Dropdown -->
        <ul v-if="showParticipantDropdown && filteredParticipants.length > 0" class="search-dropdown">
          <li v-for="user in filteredParticipants" :key="user.uid" class="dropdown-item-wrapper">
            <button class="dropdown-item-custom" type="button" @mousedown.prevent="addParticipantFromSearch(user.uid)">
              <i class="fas fa-user text-muted me-2"></i>
              {{ getUserName(user.uid) }}
            </button>
          </li>
        </ul>
        
        <!-- No Results Message -->
        <div v-else-if="showParticipantDropdown && participantSearch && filteredParticipants.length === 0" class="search-dropdown">
          <div class="no-results">
            <i class="fas fa-search text-muted me-2"></i>
            <span class="text-muted">No matching users found.</span>
          </div>
        </div>
      </div>

      <!-- Bulk Actions for managing participants -->
      <div class="d-flex gap-2 mb-3">
        <!-- Load All Available Participants Button (when no participants are loaded) -->
        <button
          v-if="participants.length === 0 && availableGeneralParticipants.length > 0"
          type="button"
          class="btn btn-outline-primary btn-sm"
          @click="loadAllAvailableParticipants"
          :disabled="isSubmitting"
        >
          <i class="fas fa-users me-1"></i>
          Load All Available Participants ({{ availableGeneralParticipants.length }})
        </button>
        <!-- Add All Available Button (when some participants are already loaded) -->
        <button
          v-if="participants.length > 0 && availableGeneralParticipants.length > 0"
          type="button"
          class="btn btn-sm btn-outline-success"
          @click="loadAllAvailableParticipants"
          :disabled="isSubmitting || (maxParticipants !== null && participants.length >= maxParticipants)"
        >
          <i class="fas fa-user-plus me-1"></i>
          Add All Available ({{ Math.min(availableGeneralParticipants.length, (maxParticipants || Infinity) - participants.length) }})
        </button>
        <button
          v-if="participants.length > 0"
          type="button"
          class="btn btn-sm btn-outline-warning"
          @click="clearAllParticipants"
          :disabled="isSubmitting"
        >
          <i class="fas fa-users-slash me-1"></i>
          Clear All
        </button>
      </div>

      <!-- Info message for Load All button when no participants -->
      <p v-if="participants.length === 0 && availableGeneralParticipants.length > 0" class="small text-muted mb-3">
        <i class="fas fa-info-circle me-1"></i>
        This will automatically add up to {{ maxParticipants || 'all' }} available users as participants.
      </p>

      <!-- Participants list -->
      <div v-if="participants.length > 0" class="compact-grid">
        <div
          v-for="participantId in participants"
          :key="`participant-${participantId}`"
          class="compact-card"
        >
          <div class="compact-card-info">
            <i class="fas fa-user text-primary me-2"></i>
            <span class="compact-card-name">{{ getUserName(participantId) }}</span>
          </div>
          <button
            type="button"
            class="btn-remove-compact"
            @click="removeParticipant(participantId)"
            :disabled="isSubmitting"
            title="Remove participant"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div v-else class="empty-state-compact text-center py-3">
        <i class="fas fa-user-plus text-muted mb-1" style="font-size: 1.5rem; opacity: 0.5;"></i>
        <p class="text-muted small mb-0">No participants added yet</p>
        <small class="text-secondary">Search above or use bulk actions to add participants</small>
      </div>
    </div>

    <!-- Core Participants (Conditional for Individual Event Format) -->
    <div v-if="eventFormat === EventFormat.Individual" class="mb-3">
      <hr class="my-4">
      <h6 class="text-dark mb-2">
        Core Participants <span class="text-danger">*</span>
        <span class="text-muted small">({{ coreParticipants.length }}/{{ maxCoreParticipants }})</span>
        <span v-if="validationState.coreParticipants.isInvalid" class="text-danger ms-2">
          <i class="fas fa-exclamation-triangle"></i>
        </span>
      </h6>

      <!-- Validation message for core participants -->
      <div v-if="validationState.coreParticipants.message" class="alert alert-sm py-2 mb-3" :class="{
        'alert-danger': validationState.coreParticipants.isInvalid,
        'alert-warning': validationState.coreParticipants.isWarning,
        'alert-info': !validationState.coreParticipants.isInvalid && !validationState.coreParticipants.isWarning
      }">
        <i class="fas me-1" :class="{
          'fa-exclamation-triangle': validationState.coreParticipants.isInvalid,
          'fa-exclamation-circle': validationState.coreParticipants.isWarning,
          'fa-info-circle': !validationState.coreParticipants.isInvalid && !validationState.coreParticipants.isWarning
        }"></i>
        {{ validationState.coreParticipants.message }}
      </div>

      <!-- Show helpful message for editing -->
      <p v-if="isEditing" class="small text-info">
        <i class="fas fa-info-circle me-1"></i>
        For 'Individual' events, specify up to {{ maxCoreParticipants }} core participants.
        Current core participants from the existing event are loaded and can be modified.
      </p>
      <p v-else class="small text-muted">
        For 'Individual' events, specify up to {{ maxCoreParticipants }} core participants.
        These users will be prioritized or exclusively available for certain voting criteria.
        Core participants must also be in the main participants list.
      </p>

      <!-- Search-based UI for adding core participants -->
      <div class="position-relative mb-3">
        <label class="form-label small fw-medium text-secondary mb-2">
          <i class="fas fa-star text-warning me-1"></i>
          Search & Add Core Participants
        </label>
        <div class="input-group input-group-sm">
          <span class="input-group-text bg-light">
            <i class="fas fa-search text-muted"></i>
          </span>
          <input
            class="form-control"
            type="text"
            v-model="coreParticipantSearch"
            :disabled="isSubmitting || coreParticipants.length >= maxCoreParticipants || participants.length === 0"
            placeholder="Type a name to search..."
            @focus="showCoreParticipantDropdown = true"
            @input="searchCoreParticipants"
            @blur="handleCoreParticipantBlur"
            autocomplete="off"
            :class="{ 'is-invalid': validationState.coreParticipants.isInvalid && coreParticipants.length === 0 }"
          />
        </div>

        <!-- Core Participant Search Dropdown -->
        <ul v-if="showCoreParticipantDropdown && filteredCoreParticipants.length > 0" class="search-dropdown">
          <li v-for="user in filteredCoreParticipants" :key="user.uid" class="dropdown-item-wrapper">
            <button class="dropdown-item-custom" type="button" @mousedown.prevent="addCoreParticipantFromSearch(user.uid)">
              <i class="fas fa-star text-warning me-2"></i>
              {{ getUserName(user.uid) }}
            </button>
          </li>
        </ul>
        
        <!-- No Results Message -->
        <div v-else-if="showCoreParticipantDropdown && coreParticipantSearch && filteredCoreParticipants.length === 0" class="search-dropdown">
          <div class="no-results">
            <i class="fas fa-search text-muted me-2"></i>
            <span class="text-muted">{{ participants.length === 0 ? 'Add general participants first' : 'No eligible users found' }}</span>
          </div>
        </div>
      </div>

      <!-- Core Participants Display -->
      <div v-if="coreParticipants.length > 0" class="compact-grid">
        <div
          v-for="coreParticipantId in coreParticipants"
          :key="`core-participant-${coreParticipantId}`"
          class="compact-card core-participant-card-compact"
        >
          <div class="compact-card-info">
            <i class="fas fa-star text-warning me-2"></i>
            <span class="compact-card-name">{{ getUserName(coreParticipantId) }}</span>
          </div>
          <button
            type="button"
            class="btn-remove-compact"
            @click="removeCoreParticipant(coreParticipantId)"
            :disabled="isSubmitting"
            title="Remove core participant"
          >
            <i class="fas fa-times"></i>
          </button>
        </div>
      </div>
      <div v-else-if="eventFormat === EventFormat.Individual" class="empty-state-compact text-center py-3">
        <i class="fas fa-star text-muted mb-1" style="font-size: 1.5rem; opacity: 0.5;"></i>
        <p class="text-danger small mb-0">Core participants are required</p>
        <small class="text-secondary">Search above to add core participants</small>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, type PropType } from 'vue';
import type { UserData } from '@/types/student';
import { EventFormat } from '@/types/event';

const props = defineProps({
  participants: {
    type: Array as PropType<string[]>,
    required: true,
  },
  coreParticipants: {
    type: Array as PropType<string[]>,
    required: true,
  },
  allUsers: {
    type: Array as PropType<UserData[]>,
    required: true,
  },
  eventFormat: {
    type: String as PropType<EventFormat>,
    required: true,
  },
  isSubmitting: {
    type: Boolean,
    default: false,
  },
  isEditing: {
    type: Boolean,
    default: false,
  },
  maxParticipants: {
    type: Number,
    default: null, 
  },
  maxCoreParticipants: {
    type: Number,
    default: 10,
  },
  nameCache: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
});

const emit = defineEmits(['update:participants', 'update:coreParticipants', 'validity-change']);

// Search states
const participantSearch = ref('');
const coreParticipantSearch = ref('');
const showParticipantDropdown = ref(false);
const showCoreParticipantDropdown = ref(false);

const localNameCache = ref<Record<string, string>>({ ...props.nameCache });

watch(() => props.nameCache, (newNameCache) => {
  localNameCache.value = { ...newNameCache };
}, { deep: true });

const getUserName = (uid: string): string | undefined => {
  if (!uid) return undefined;
  return localNameCache.value[uid] || undefined;
};

const availableGeneralParticipants = computed(() => {
  return props.allUsers.filter(user => user.uid && !props.participants.includes(user.uid));
});

const availableCoreParticipantsForSelection = computed(() => {
  return props.allUsers.filter(user =>
    user.uid &&
    props.participants.includes(user.uid) && 
    !props.coreParticipants.includes(user.uid) 
  );
});

// Search filtering
const filteredParticipants = computed(() => {
  if (!participantSearch.value) return [];
  const searchLower = participantSearch.value.toLowerCase().trim();
  if (searchLower.length < 2) return [];

  return availableGeneralParticipants.value.filter(user => {
    if (!user?.uid || !user.name) return false;
    return user.name.toLowerCase().includes(searchLower);
  }).slice(0, 10);
});

const filteredCoreParticipants = computed(() => {
  if (!coreParticipantSearch.value) return [];
  const searchLower = coreParticipantSearch.value.toLowerCase().trim();
  if (searchLower.length < 2) return [];

  return availableCoreParticipantsForSelection.value.filter(user => {
    if (!user?.uid || !user.name) return false;
    return user.name.toLowerCase().includes(searchLower);
  }).slice(0, 10);
});

// Search handlers
const searchParticipants = () => {
  showParticipantDropdown.value = true;
};

const handleParticipantBlur = () => {
  setTimeout(() => { showParticipantDropdown.value = false; }, 200);
};

const searchCoreParticipants = () => {
  showCoreParticipantDropdown.value = true;
};

const handleCoreParticipantBlur = () => {
  setTimeout(() => { showCoreParticipantDropdown.value = false; }, 200);
};

// Add/remove functions
const addParticipantFromSearch = (uid: string) => {
  if (!props.participants.includes(uid)) {
    if (props.maxParticipants === null || props.participants.length < props.maxParticipants) {
      const updatedParticipants = [...props.participants, uid];
      emit('update:participants', updatedParticipants);
    }
  }
  participantSearch.value = '';
  showParticipantDropdown.value = false;
};

const addCoreParticipantFromSearch = (uid: string) => {
  if (!props.coreParticipants.includes(uid)) {
    if (props.coreParticipants.length < props.maxCoreParticipants) {
      const updatedCoreParticipants = [...props.coreParticipants, uid];
      emit('update:coreParticipants', updatedCoreParticipants);
      
      // For Individual events, also ensure this participant is in the main participants array
      if (props.eventFormat === EventFormat.Individual && !props.participants.includes(uid)) {
        const updatedParticipants = [...props.participants, uid];
        emit('update:participants', updatedParticipants);
      }
    }
  }
  coreParticipantSearch.value = '';
  showCoreParticipantDropdown.value = false;
};

const removeParticipant = (uid: string) => {
  const updatedParticipants = props.participants.filter(pId => pId !== uid);
  emit('update:participants', updatedParticipants);
  
  // If this participant was also a core participant, remove them from there too
  if (props.coreParticipants.includes(uid)) {
    const updatedCoreParticipants = props.coreParticipants.filter(cpId => cpId !== uid);
    emit('update:coreParticipants', updatedCoreParticipants);
  }
};

const removeCoreParticipant = (uid: string) => {
  const updatedCoreParticipants = props.coreParticipants.filter(cpId => cpId !== uid);
  emit('update:coreParticipants', updatedCoreParticipants);
  
  // For Individual events, keep them in the main participants array
  // For Team events, they might not be in participants array at all
};

// Enhanced validation state
const validationState = ref({
  participants: {
    isInvalid: false,
    isWarning: false,
    message: ''
  },
  coreParticipants: {
    isInvalid: false,
    isWarning: false,
    message: ''
  }
});

// Enhanced validation computed property
const isParticipantsValid = computed(() => {
  // Update validation state for participants
  updateParticipantsValidation();
  
  // During editing, we should be more lenient about validation
  // as users might have valid existing data
  const hasParticipants = props.participants.length > 0;
  
  // For Individual events, also check core participants
  if (props.eventFormat === EventFormat.Individual) {
    const hasCoreParticipants = props.coreParticipants.length > 0;
    return hasParticipants && hasCoreParticipants;
  }
  
  return hasParticipants;
});

// Function to update participants validation state
const updateParticipantsValidation = () => {
  const participantCount = props.participants.length;
  const maxParticipants = props.maxParticipants;
  const availableCount = availableGeneralParticipants.value.length;
  
  // Reset validation state
  validationState.value.participants = {
    isInvalid: false,
    isWarning: false,
    message: ''
  };
  
  if (participantCount === 0) {
    validationState.value.participants.isInvalid = true;
    if (props.isEditing) {
      validationState.value.participants.message = 'At least one participant is required. Current participants may have been removed.';
    } else {
      validationState.value.participants.message = 'At least one participant is required for the event.';
    }
  } else if (maxParticipants && participantCount >= maxParticipants && availableCount > 0) {
    validationState.value.participants.isWarning = true;
    validationState.value.participants.message = `Maximum participants (${maxParticipants}) reached. ${availableCount} more users are available.`;
  } else if (participantCount > 0 && availableCount > 0) {
    validationState.value.participants.message = `${participantCount} participants selected. ${availableCount} more users available to add.`;
  } else if (participantCount > 0 && availableCount === 0) {
    validationState.value.participants.message = `All available users (${participantCount}) have been added as participants.`;
  }
  
  // Update core participants validation for Individual events
  if (props.eventFormat === EventFormat.Individual) {
    updateCoreParticipantsValidation();
  }
};

// Function to update core participants validation state
const updateCoreParticipantsValidation = () => {
  const coreCount = props.coreParticipants.length;
  const maxCoreParticipants = props.maxCoreParticipants;
  const availableCoreCount = availableCoreParticipantsForSelection.value.length;
  
  // Reset validation state
  validationState.value.coreParticipants = {
    isInvalid: false,
    isWarning: false,
    message: ''
  };
  
  if (props.eventFormat === EventFormat.Individual) {
    if (coreCount === 0) {
      validationState.value.coreParticipants.isInvalid = true;
      if (props.participants.length === 0) {
        validationState.value.coreParticipants.message = 'Add general participants first, then select core participants.';
      } else if (props.isEditing) {
        validationState.value.coreParticipants.message = 'At least one core participant is required. Previous core participants may have been removed.';
      } else {
        validationState.value.coreParticipants.message = 'At least one core participant is required for Individual events.';
      }
    } else if (coreCount >= maxCoreParticipants && availableCoreCount > 0) {
      validationState.value.coreParticipants.isWarning = true;
      validationState.value.coreParticipants.message = `Maximum core participants (${maxCoreParticipants}) reached. ${availableCoreCount} more eligible users available.`;
    } else if (coreCount > 0 && availableCoreCount > 0) {
      validationState.value.coreParticipants.message = `${coreCount} core participants selected. ${availableCoreCount} more eligible users available.`;
    } else if (coreCount > 0 && availableCoreCount === 0) {
      validationState.value.coreParticipants.message = `All eligible participants (${coreCount}) have been selected as core participants.`;
    }
  }
};

// Update the participant sync watcher
watch(() => props.participants, (newParticipants, oldParticipants) => {
  if (JSON.stringify(newParticipants) !== JSON.stringify(oldParticipants)) {
    // For Individual events, coreParticipants must be a subset of participants
    if (props.eventFormat === EventFormat.Individual) {
      const updatedCoreParticipants = props.coreParticipants.filter(cpId => newParticipants.includes(cpId));
      if (updatedCoreParticipants.length !== props.coreParticipants.length) {
        emit('update:coreParticipants', updatedCoreParticipants);
      }
    }
  }
}, { deep: true });

const loadAllAvailableParticipants = () => {
  if (props.isSubmitting) return;
  
  const maxToAdd = props.maxParticipants ? props.maxParticipants - props.participants.length : availableGeneralParticipants.value.length;
  const participantsToAdd = availableGeneralParticipants.value
    .slice(0, maxToAdd)
    .map(user => user.uid!)
    .filter(Boolean);
  
  if (participantsToAdd.length > 0) {
    const updatedParticipants = [...props.participants, ...participantsToAdd];
    emit('update:participants', updatedParticipants);
  }
};

const clearAllParticipants = () => {
  if (props.isSubmitting) return;
  
  emit('update:participants', []);
  // Also clear core participants since they depend on regular participants
  emit('update:coreParticipants', []);
};

// Watch for changes to trigger validation updates
watch(() => [props.participants, props.coreParticipants, props.eventFormat, availableGeneralParticipants.value.length], () => {
  updateParticipantsValidation();
}, { deep: true, immediate: true });

// Watch participants validity and emit changes
watch(isParticipantsValid, (newValid) => {
  emit('validity-change', newValid);
}, { immediate: true });
</script>

<style scoped>
.event-participant-form {
  --border-radius: 6px;
}

/* Search Input Styles */
.input-group-text {
  border-color: var(--bs-border-color);
  background: var(--bs-light-bg-subtle);
}

.form-control:focus {
  border-color: var(--bs-primary);
  box-shadow: 0 0 0 0.2rem rgba(13, 110, 253, 0.15);
}

.core-participant-card-compact {
  background: linear-gradient(135deg, var(--bs-warning-bg-subtle) 0%, var(--bs-light-bg-subtle) 100%);
  border-color: var(--bs-warning-border-subtle);
}

/* Form Labels */
.form-label {
  color: var(--bs-body-color);
  margin-bottom: 0.25rem;
}
</style>
