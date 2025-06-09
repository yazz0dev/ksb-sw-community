<template>
  <div class="event-participant-form">
    <!-- General Participants -->
    <div class="mb-4">
      <h6 class="text-dark mb-2">Event Participants <span class="text-muted small">({{ participants.length }} selected)</span></h6>
      
      <p class="small text-muted" v-if="eventFormat === EventFormat.Individual && !isEditing">
        Participants are auto-populated for new 'Individual' events (up to {{ maxParticipantsToShowInMessage }}). You can remove them if needed below.
      </p>
      <p class="small text-muted" v-else-if="maxParticipants && participants.length >= maxParticipants && showAddGeneralParticipantUI">
        Maximum participants ({{ maxParticipants }}) reached.
      </p>

      <!-- UI for adding general participants -->
      <div v-if="showAddGeneralParticipantUI" class="d-flex gap-2 mb-3">
        <select
          class="form-select form-select-sm flex-grow-1"
          v-model="selectedParticipantToAdd"
          :disabled="isSubmitting || (maxParticipants !== null && participants.length >= maxParticipants) || availableGeneralParticipants.length === 0"
        >
          <option value="" disabled>{{ availableGeneralParticipants.length > 0 ? 'Select participant to add...' : 'No more users available or all added' }}</option>
          <option v-for="user in availableGeneralParticipants" :key="`gen-user-${user.uid}`" :value="user.uid">
            {{ getUserName(user.uid) }}
          </option>
        </select>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          @click="addParticipant"
          :disabled="!selectedParticipantToAdd || isSubmitting || (maxParticipants !== null && participants.length >= maxParticipants)"
        >
          <i class="fas fa-plus me-1"></i> Add
        </button>
      </div>

      <div v-if="participants.length > 0" class="border p-2 rounded bg-light-subtle mb-3" style="min-height: 50px;">
        <div class="d-flex flex-wrap gap-2">
          <span
            v-for="participantId in participants"
            :key="`participant-${participantId}`"
            class="badge rounded-pill bg-secondary text-white d-flex align-items-center ps-2 pe-1 py-1"
          >
            {{ getUserName(participantId) }}
            <button
              type="button"
              class="btn-close btn-close-white ms-1"
              @click="removeParticipant(participantId)"
              :disabled="isSubmitting"
              aria-label="Remove participant"
              style="font-size: 0.6em; line-height: 1;"
            ></button>
          </span>
        </div>
      </div>
      <p v-else class="small text-muted fst-italic">
        No participants added yet.
        <span v-if="eventFormat === EventFormat.Individual && !isEditing"> (Auto-populated for new 'Individual' events)</span>
        <span v-else-if="showAddGeneralParticipantUI"> Use the selection above to add participants.</span>
      </p>
    </div>

    <!-- Core Participants (Conditional for Individual Event Format) -->
    <div v-if="eventFormat === EventFormat.Individual" class="mb-3">
      <hr class="my-4">
      <h6 class="text-dark mb-2">
        Core Participants <span class="text-danger">*</span>
        <span class="text-muted small">({{ coreParticipants.length }}/{{ maxCoreParticipants }})</span>
      </h6>
      <p class="small text-muted">
        For 'Individual' events, specify up to {{ maxCoreParticipants }} core participants.
        These users will be prioritized or exclusively available for certain voting criteria.
        Core participants must also be in the main participants list.
      </p>
       <p class="small text-warning" v-if="coreParticipants.length >= maxCoreParticipants && availableCoreParticipantsForSelection.length > 0">
        Maximum core participants ({{ maxCoreParticipants }}) reached. Remove one to add another.
      </p>
      <div class="d-flex gap-2 mb-3">
        <select
          class="form-select form-select-sm flex-grow-1"
          v-model="selectedCoreParticipantToAdd"
          :disabled="isSubmitting || coreParticipants.length >= maxCoreParticipants || availableCoreParticipantsForSelection.length === 0"
        >
          <option value="" disabled>{{ availableCoreParticipantsForSelection.length > 0 ? 'Select core participant to add...' : (participants.length === 0 ? 'Add general participants first' : 'No eligible users or all added') }}</option>
          <option v-for="user in availableCoreParticipantsForSelection" :key="`core-user-${user.uid}`" :value="user.uid">
            {{ getUserName(user.uid) }}
          </option>
        </select>
        <button
          type="button"
          class="btn btn-sm btn-outline-primary"
          @click="addCoreParticipant"
          :disabled="!selectedCoreParticipantToAdd || isSubmitting || coreParticipants.length >= maxCoreParticipants"
        >
          <i class="fas fa-plus me-1"></i> Add Core
        </button>
      </div>
      <div v-if="coreParticipants.length > 0" class="border p-2 rounded bg-light-subtle" style="min-height: 50px;">
        <div class="d-flex flex-wrap gap-2">
          <span
            v-for="coreParticipantId in coreParticipants"
            :key="`core-participant-${coreParticipantId}`"
            class="badge rounded-pill bg-info text-white d-flex align-items-center ps-2 pe-1 py-1"
          >
            <i class="fas fa-star me-1" style="font-size: 0.8em;"></i>
            {{ getUserName(coreParticipantId) }}
            <button
              type="button"
              class="btn-close btn-close-white ms-1"
              @click="removeCoreParticipant(coreParticipantId)"
              :disabled="isSubmitting"
              aria-label="Remove core participant"
              style="font-size: 0.6em; line-height: 1;"
            ></button>
          </span>
        </div>
      </div>
      <p v-else-if="eventFormat === EventFormat.Individual" class="small text-danger fst-italic">Core participants are required for 'Individual' events.</p>
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
  isEditing: { // New prop
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

const emit = defineEmits(['update:participants', 'update:coreParticipants']);

const selectedParticipantToAdd = ref('');
const selectedCoreParticipantToAdd = ref('');

// Used for the descriptive message about auto-populated participants
const maxParticipantsToShowInMessage = computed(() => props.maxParticipants || 'the defined limit');

const showAddGeneralParticipantUI = computed(() => {
  return props.eventFormat !== EventFormat.Individual || props.isEditing;
});

const localNameCache = ref<Record<string, string>>({ ...props.nameCache });

watch(() => props.nameCache, (newNameCache) => {
  localNameCache.value = { ...newNameCache };
}, { deep: true });


const getUserName = (uid: string): string => {
  if (localNameCache.value[uid]) {
    return localNameCache.value[uid];
  }
  const user = props.allUsers.find(u => u.uid === uid);
  return user?.name || user?.email || `UID: ${uid.substring(0, 6)}...`;
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

const addParticipant = () => {
  if (selectedParticipantToAdd.value && !props.participants.includes(selectedParticipantToAdd.value)) {
    if (props.maxParticipants === null || props.participants.length < props.maxParticipants) {
      const updatedParticipants = [...props.participants, selectedParticipantToAdd.value];
      emit('update:participants', updatedParticipants);
    }
  }
  selectedParticipantToAdd.value = '';
};

const removeParticipant = (uid: string) => {
  const updatedParticipants = props.participants.filter(pId => pId !== uid);
  emit('update:participants', updatedParticipants);
  if (props.coreParticipants.includes(uid)) {
    const updatedCoreParticipants = props.coreParticipants.filter(cpId => cpId !== uid);
    emit('update:coreParticipants', updatedCoreParticipants);
  }
};

const addCoreParticipant = () => {
  if (selectedCoreParticipantToAdd.value &&
      !props.coreParticipants.includes(selectedCoreParticipantToAdd.value) &&
      props.participants.includes(selectedCoreParticipantToAdd.value)) { 
    if (props.coreParticipants.length < props.maxCoreParticipants) {
      const updatedCoreParticipants = [...props.coreParticipants, selectedCoreParticipantToAdd.value];
      emit('update:coreParticipants', updatedCoreParticipants);
    }
  }
  selectedCoreParticipantToAdd.value = '';
};

const removeCoreParticipant = (uid: string) => {
  const updatedCoreParticipants = props.coreParticipants.filter(cpId => cpId !== uid);
  emit('update:coreParticipants', updatedCoreParticipants);
};

watch(() => props.participants, (newParticipants, oldParticipants) => {
  if (JSON.stringify(newParticipants) !== JSON.stringify(oldParticipants)) {
    const updatedCoreParticipants = props.coreParticipants.filter(cpId => newParticipants.includes(cpId));
    if (updatedCoreParticipants.length !== props.coreParticipants.length) {
      emit('update:coreParticipants', updatedCoreParticipants);
    }
  }
}, { deep: true });

</script>

<style scoped>
.event-participant-form .badge .btn-close {
  padding: 0.1em 0.25em; 
  margin-left: 0.35rem;
}
.event-participant-form .list-group-item {
  font-size: 0.9rem;
}
.event-participant-form .btn-sm.py-0 {
    line-height: 1.2; 
}
</style>
