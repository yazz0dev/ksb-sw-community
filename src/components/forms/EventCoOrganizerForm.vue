<template>
  <div>
    <!-- Search Input -->
    <div class="mb-3 dropdown">
      <label for="coOrganizerSearch" class="form-label small">Search & Add Co-organizers</label>
      <input
        id="coOrganizerSearch"
        class="form-control form-control-sm"
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
      <small id="coOrganizerHelp" class="form-text text-muted">Add other students who will help manage the event.</small>

      <!-- Dropdown Results -->
      <ul v-if="showCoOrganizerDropdown && filteredUsers.length > 0" class="dropdown-menu show w-100 shadow-sm">
        <li v-for="user in filteredUsers" :key="user.uid">
          <button class="dropdown-item py-1 px-3" type="button" @mousedown.prevent="addOrganizer(user.uid)">
            {{ user.name }}
          </button>
        </li>
      </ul>
       <p v-else-if="showCoOrganizerDropdown && coOrganizerSearch && filteredUsers.length === 0" class="dropdown-menu show w-100 text-muted small p-2 fst-italic">
           No matching users found.
       </p>
    </div>

    <!-- Selected Co-organizers -->
    <div v-if="localOrganizers.length > 0" class="mt-3">
      <label class="form-label small mb-1">Selected Co-organizers:</label>
      <div class="d-flex flex-wrap gap-2">
        <span v-for="uid in localOrganizers" :key="uid" class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis d-inline-flex align-items-center">
          <i class="fas fa-user me-1"></i>
          {{ nameCache[uid] || uid }}
          <button
             type="button"
             class="btn-close btn-close-sm ms-1"
             aria-label="Remove co-organizer"
             @click="removeOrganizer(uid)"
             :disabled="isSubmitting"
             style="filter: brightness(0) invert(1);"
           ></button>
        </span>
      </div>
    </div>
     <p v-else class="text-muted small fst-italic">No co-organizers added yet.</p>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs, watch, onMounted, PropType } from 'vue'; // Added PropType
import { useStore } from 'vuex';

// Local User interface definition - make email optional
interface User {
  uid: string;
  name: string;
  email?: string; // Make email optional
}

// Correctly define props using PropType for complex types
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
  allUsers: {
      type: Array as PropType<User[]>, // Use the local User interface
      required: true
  }
});


const emit = defineEmits(['update:organizers']);
// Removed toRefs as props are accessed directly via props.variable
// const { organizers, isSubmitting, nameCache, currentUserUid, allUsers } = toRefs(props);

const store = useStore();
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
.dropdown-menu { max-height: 250px; overflow-y: auto; font-size: 0.9rem; }
.btn-close-sm { padding: 0.2em 0.4em; width: 0.8em; height: 0.8em; }
.badge { padding: 0.4em 0.7em; font-size: 0.85rem; }
</style>
