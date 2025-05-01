<template>
  <div>
    <div class="mb-3 dropdown">
      <label for="coOrganizerSearch" class="form-label">Search Users</label>
      <input
        id="coOrganizerSearch"
        class="form-control"
        type="text"
        v-model="coOrganizerSearch"
        :disabled="isSubmitting"
        placeholder="Type a name or email to search"
        @focus="showCoOrganizerDropdown = true"
        @input="searchUsers"
        @blur="handleCoOrganizerBlur"
        autocomplete="off"
      />
      <ul v-if="showCoOrganizerDropdown && filteredUsers.length" class="dropdown-menu show w-100">
        <li v-for="user in filteredUsers" :key="user.uid">
          <button class="dropdown-item" type="button" @mousedown.prevent="addOrganizer(user.uid)">
            {{ user.name }} <span class="text-muted small">({{ user.email }})</span>
          </button>
        </li>
      </ul>
    </div>

    <div v-if="localOrganizers.length" class="mb-3">
      <label class="form-label">Selected Co-organizers:</label>
      <div class="d-flex flex-wrap gap-2">
        <span v-for="uid in localOrganizers" :key="uid" class="badge bg-secondary">
          {{ nameCache[uid] || uid }}
          <button type="button" class="btn-close btn-close-white ms-2" aria-label="Remove" @click="removeOrganizer(uid)" :disabled="isSubmitting"></button>
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, toRefs, watch } from 'vue';

interface User {
  uid: string;
  name: string;
  email: string;
}

interface Props {
  organizers: string[];
  isSubmitting: boolean;
  nameCache: Record<string, string>;
  currentUserUid: string | null;
  allUsers: User[];
}

const emit = defineEmits(['update:organizers']);
const props = defineProps<Props>();
const { organizers, isSubmitting, nameCache, currentUserUid, allUsers } = toRefs(props);

import { useStore } from 'vuex';
const store = useStore();
const localOrganizers = ref<string[]>([...organizers.value]);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);

// Fetch all users on mount
import { onMounted } from 'vue';
onMounted(async () => {
  await store.dispatch('user/fetchAllUsers');
});

watch(organizers, (newVal) => {
  localOrganizers.value = [...newVal];
});

const filteredUsers = computed(() => {
  if (!coOrganizerSearch.value) return [];
  const searchLower = coOrganizerSearch.value.toLowerCase();
  return allUsers.value.filter(user => {
    if (!user || !user.uid) return false;
    if (currentUserUid.value && user.uid === currentUserUid.value) return false;
    if (localOrganizers.value.includes(user.uid)) return false;
    const nameMatch = user.name?.toLowerCase().includes(searchLower);
    const emailMatch = user.email?.toLowerCase().includes(searchLower);
    return nameMatch || emailMatch;
  });
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

function searchUsers() {
  showCoOrganizerDropdown.value = true;
}

function handleCoOrganizerBlur() {
  setTimeout(() => {
    showCoOrganizerDropdown.value = false;
  }, 150);
}
</script>

<style scoped>
.dropdown-menu {
  max-height: 200px;
  overflow-y: auto;
}
</style>
