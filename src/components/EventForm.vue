<template>
  <form @submit.prevent="handleSubmit" class="mb-6">
    <!-- Event Details Card -->
    <div class="box mb-5">
      <h3 class="title is-4 mb-5">Event Details</h3>

      <div class="field">
        <label class="label">Event Format <span class="has-text-danger">*</span></label>
        <div class="control">
          <label class="radio mr-4">
            <input type="radio" name="eventFormat" :value="false" v-model="formData.isTeamEvent" @change="handleFormatChange" :disabled="isSubmitting">
            Individual
          </label>
          <label class="radio">
            <input type="radio" name="eventFormat" :value="true" v-model="formData.isTeamEvent" @change="handleFormatChange" :disabled="isSubmitting">
            Team
          </label>
        </div>
      </div>

      <div class="field">
        <label class="label">Event Name <span class="has-text-danger">*</span></label>
        <div class="control">
          <input
            class="input"
            type="text"
                            v-model="formData.eventName"
            :disabled="isSubmitting"
                            placeholder="Enter event name"
            required
          />
        </div>
      </div>

      <div class="field">
        <label class="label">Event Type <span class="has-text-danger">*</span></label>
        <div class="control has-icons-left">
          <div class="select is-fullwidth">
            <select
                            v-model="formData.eventType"
              :disabled="isSubmitting"
                            @change="handleEventTypeChange"
              required
                        >
              <option value="" disabled>Select Type</option>
                            <option
                                v-for="type in availableEventTypes"
                                :key="type"
                                :value="type"
                            >{{ type }}</option>
            </select>
          </div>
           <span class="icon is-small is-left">
            <i class="fas fa-tag"></i>
          </span>
        </div>
      </div>

      <div class="field">
        <label class="label">Description <span class="has-text-danger">*</span></label>
        <div class="control">
          <textarea
            class="textarea"
            rows="4"
                            v-model="formData.description"
            :disabled="isSubmitting"
            placeholder="Enter event description (supports Markdown)"
            required
          ></textarea>
           <p class="help is-info is-size-7">You can use Markdown for formatting.</p>
        </div>
      </div>

      <!-- Team Configuration Section (Conditional) -->
      <template v-if="formData.isTeamEvent">
        <hr class="my-5">
        <h4 class="title is-5 mb-4">Team Configuration</h4>
                        <ManageTeamsComponent
                            :initial-teams="formData.teams"
                            :students="availableStudents"
                            :name-cache="nameCache"
                            :is-submitting="isSubmitting"
                            :can-auto-generate="true"
                            :event-id="eventId || ''"
                            @update:teams="updateTeams"
                        />
      </template>
                    </div>

    <!-- Event Schedule Card -->
    <div class="box mb-5">
      <h3 class="title is-4 mb-5">Event Schedule</h3>
      <div class="columns is-multiline">
        <div class="column is-half">
          <div class="field">
            <label class="label">{{ dateFields.startLabel }} <span class="has-text-danger">*</span></label>
            <div class="control">
                            <DatePicker
                                v-model="formData[dateFields.startField]"
                                :enable-time-picker="false"
                                :disabled="isSubmitting"
                                @update:model-value="checkNextAvailableDate"
                                model-type="yyyy-MM-dd"
                                :min-date="new Date()"
                :input-class-name="!isDateAvailable ? 'input is-danger' : 'input'"
                                :auto-apply="true"
                                :teleport="true"
                                :clearable="false"
                                placeholder="Select start date"
                required
              />
            </div>
             <p v-if="formData[dateFields.startField] && !isDateAvailable" class="help is-danger">
               <span class="icon is-small"><i class="fas fa-exclamation-circle"></i></span>
               Date conflict detected
             </p>
              <p v-else-if="formData[dateFields.startField] && isDateAvailable" class="help is-success">
               <span class="icon is-small"><i class="fas fa-check-circle"></i></span>
               Date available
             </p>
          </div>
        </div>
        <div class="column is-half">
          <div class="field">
            <label class="label">{{ dateFields.endLabel }} <span class="has-text-danger">*</span></label>
            <div class="control">
                            <DatePicker
                                v-model="formData[dateFields.endField]"
                                :enable-time-picker="false"
                                :disabled="isSubmitting || !formData[dateFields.startField]"
                                @update:model-value="checkNextAvailableDate"
                                model-type="yyyy-MM-dd"
                                :min-date="formData[dateFields.startField] ? new Date(formData[dateFields.startField]) : new Date()"
                :input-class-name="!isDateAvailable || !formData[dateFields.startField] ? 'input is-danger' : 'input'"
                                :auto-apply="true"
                                :teleport="true"
                                :clearable="false"
                                placeholder="Select end date"
                required
              />
            </div>
            <p v-if="!formData[dateFields.startField]" class="help">Select start date first</p>
          </div>
        </div>
      </div>

      <div v-if="!isDateAvailable && nextAvailableDate" class="notification is-warning is-light mt-4">
         <div class="media">
          <div class="media-left">
            <span class="icon is-medium"><i class="fas fa-exclamation-triangle"></i></span>
          </div>
          <div class="media-content">
             <p class="title is-6 mb-1">Date Conflict Detected</p>
             <p class="is-size-7 mb-3">The selected dates conflict with another event. Next available start date is <strong class="has-text-weight-semibold">{{ formatDate(nextAvailableDate) }}</strong>.</p>
              <button
                type="button"
                class="button is-link is-small"
                @click="useNextAvailableDate"
                :disabled="isSubmitting"
              >
                 <span class="icon is-small"><i class="fas fa-calendar-check"></i></span>
                 <span>Use Next Available Date</span>
              </button>
          </div>
        </div>
      </div>
    </div>

     <!-- Rating Criteria Card -->
    <div class="box mb-5">
        <h3 class="title is-4 mb-5">Rating Criteria & XP Allocation</h3>
        <p class="is-size-7 has-text-grey mb-4">Define how teams/participants will be rated and earn XP. Total XP cannot exceed 50.</p>
        <div v-for="(alloc, index) in formData.xpAllocation" :key="index" class="mb-4 p-4" style="background-color: #fafafa; border-radius: 4px; border: 1px solid #dbdbdb;">
            <div class="columns is-mobile is-vcentered">
                <div class="column">
                    <div class="field">
                        <label class="label is-small">Criteria Label</label>
                        <div class="control">
                            <input class="input is-small" type="text" v-model="alloc.constraintLabel" :disabled="isSubmitting" placeholder="e.g., Code Quality">
                        </div>
                    </div>
                </div>
                <div class="column is-narrow">
                    <div class="field">
                         <label class="label is-small">XP Points</label>
                        <div class="control">
                            <input class="input is-small" type="number" v-model.number="alloc.points" :disabled="isSubmitting" min="1" max="50">
                        </div>
                    </div>
                </div>
                <div class="column is-narrow">
                     <label class="label is-small">&nbsp;</label> <!-- Placeholder for alignment -->
                    <button type="button" class="button is-danger is-outlined is-small" @click="removeXPAllocation(index)" :disabled="isSubmitting">
                        <span class="icon is-small"><i class="fas fa-trash"></i></span>
                    </button>
                </div>
            </div>
            <div class="field">
                 <label class="label is-small">Role</label>
                <div class="control">
                    <div class="select is-small is-fullwidth">
                        <select v-model="alloc.role" :disabled="isSubmitting">
                            <option value="Team">Team (Overall Project/Performance)</option>
                            <option value="Individual">Individual (Contribution/Skill)</option>
                        </select>
                    </div>
                </div>
            </div>
        </div>
        <div class="is-flex is-justify-content-space-between is-align-items-center">
             <button type="button" class="button is-link is-light is-small" @click="addXPAllocation" :disabled="isSubmitting">
                 <span class="icon is-small"><i class="fas fa-plus"></i></span>
                 <span>Add Criteria</span>
             </button>
             <p class="is-size-7 has-text-weight-medium" :class="{ 'has-text-danger': totalXP > 50, 'has-text-success': totalXP > 0 && totalXP <= 50 }">
                 Total XP: {{ totalXP }} / 50
             </p>
        </div>
        <p v-if="totalXP > 50" class="help is-danger mt-2">Total XP cannot exceed 50.</p>
    </div>

    <!-- Co-organizers Card -->
     <div class="box mb-5">
        <h3 class="title is-4 mb-5">Co-organizers (Optional)</h3>
        <div class="field">
            <label class="label is-small">Add Co-organizers</label>
            <div class="control has-icons-left dropdown is-up" :class="{ 'is-active': showCoOrganizerDropdown && filteredUsers.length > 0 }">
                <input
                    class="input is-small"
                    type="text"
                    v-model="coOrganizerSearch"
                    @input="searchUsers"
                    @focus="showCoOrganizerDropdown = true"
                    @blur="() => setTimeout(() => showCoOrganizerDropdown = false, 150)"
                    placeholder="Search by name..."
                    :disabled="isSubmitting"
                >
                 <span class="icon is-small is-left">
                    <i class="fas fa-search"></i>
                  </span>
                <div class="dropdown-menu" style="width: 100%;">
                    <div class="dropdown-content">
                        <a
                            v-for="user in filteredUsers"
                            :key="user.uid"
                            href="#"
                            class="dropdown-item is-size-7"
                            @mousedown.prevent="addOrganizer(user.uid)"
                         >
                            {{ user.name }} ({{ user.email }})
                        </a>
                    </div>
                </div>
            </div>
             <p v-if="!usersLoaded && coOrganizerSearch" class="help is-info">Loading users...</p>
        </div>
        <div v-if="formData.organizers.length > 0" class="tags mt-3">
            <span v-for="orgId in formData.organizers" :key="orgId" class="tag is-light is-medium">
                {{ nameCache[orgId] || orgId }}
                <button class="delete is-small" @click="removeOrganizer(orgId)" :disabled="isSubmitting"></button>
            </span>
        </div>
         <p v-else class="is-size-7 has-text-grey">No co-organizers added.</p>
    </div>


    <!-- Submit Button -->
    <div class="field">
      <div class="control">
        <button
            type="submit"
            class="button is-primary is-medium is-fullwidth"
            :class="{ 'is-loading': isSubmitting }"
            :disabled="!isFormValid || totalXP > 50 || isSubmitting"
        >
            <span class="icon is-small">
               <i :class="['fas', isSubmitting ? 'fa-spinner fa-spin' : 'fa-paper-plane']"></i>
            </span>
            <span>{{ submitButtonText }}</span>
        </button>
      </div>
       <p v-if="!isFormValid" class="help is-danger mt-2">Please fill in all required fields (*).</p>
    </div>
  </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { Timestamp } from 'firebase/firestore';
import type { XPAllocation, EventCreateDTO, EventRequest, EventTeam, EventFormData, UserProfile } from '../types';
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css'; // Import datepicker CSS
import ManageTeamsComponent from './ManageTeamsComponent.vue'; // Assuming path is correct

// Helper Functions (Keep unchanged)
const getStartOfDayUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};
const getEndOfDayUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
};
const formatDate = (date: Date | null): string => {
  if (!date) return 'N/A';
  return new Intl.DateTimeFormat('en-US', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
};

// Props & Emits (Keep unchanged)
const props = defineProps({
    eventId: { type: String, required: false },
    initialData: { type: Object, default: () => ({}) }
});
const emit = defineEmits(['submit', 'error']);

// Store & State
const store = useStore();
const isSubmitting = ref(false);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);
const usersLoaded = ref(false);
const nextAvailableDate = ref<Date | null>(null);
const isDateAvailable = ref(true);
const teamsList = ref<EventTeam[]>([]);
const isUpdatingTeamsInternally = ref(false);
const availableStudents = ref<UserProfile[]>([]); // For team assignment
const nameCache = ref<Record<string, string>>({}); // For displaying names

const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');
const allUsers = ref<UserProfile[]>([]); // Store all users for co-organizer search

const defaultFormData: EventFormData = {
    isTeamEvent: false,
    eventType: '',
    eventName: '',
    description: '',
    startDate: '',
    endDate: '',
    desiredStartDate: '',
    desiredEndDate: '',
    location: '', // Keep location if needed
    organizers: [],
    xpAllocation: [],
    teams: [],
};

const formData = ref<EventFormData>(JSON.parse(JSON.stringify(defaultFormData)));

// Event Types (Adjust based on team/individual)
const individualEventTypes = ['Workshop', 'Seminar', 'Presentation', 'Competition (Individual)', 'Training', 'Guest Lecture', 'Other'];
const teamEventTypes = ['Project', 'Competition (Team)', 'Hackathon', 'Collaboration', 'Study Group', 'Other'];
const availableEventTypes = computed(() => formData.value.isTeamEvent ? teamEventTypes : individualEventTypes);

// Date Field Logic
const dateFields = computed(() => ({
    startField: isAdmin.value ? 'startDate' : 'desiredStartDate',
    endField: isAdmin.value ? 'endDate' : 'desiredEndDate',
    startLabel: isAdmin.value ? 'Start Date' : 'Desired Start Date',
    endLabel: isAdmin.value ? 'End Date' : 'Desired End Date',
}));

// Watchers
watch(() => props.initialData, (newData) => {
  if (newData && Object.keys(newData).length > 0) {
    // Deep clone and merge, ensuring all default keys exist
     formData.value = { ...JSON.parse(JSON.stringify(defaultFormData)), ...JSON.parse(JSON.stringify(newData)) };
     // Ensure nested arrays are properly initialized if missing in newData
     formData.value.xpAllocation = formData.value.xpAllocation || [];
     formData.value.organizers = formData.value.organizers || [];
     formData.value.teams = formData.value.teams || [];
     teamsList.value = formData.value.teams; // Sync internal teams list
  } else {
    formData.value = JSON.parse(JSON.stringify(defaultFormData));
    teamsList.value = [];
  }
}, { immediate: true, deep: true });

watch(() => formData.value.isTeamEvent, (isTeam) => {
  if (!isTeam) {
    formData.value.teams = []; // Clear teams if switching to individual
    teamsList.value = [];
  }
   // Reset event type if it's not valid for the new format
  if (!availableEventTypes.value.includes(formData.value.eventType)) {
       formData.value.eventType = '';
   }
});

// Methods
const handleFormatChange = () => {
  // Reset dependent fields if needed, e.g., teams or event type
    formData.value.eventType = '';
    if (!formData.value.isTeamEvent) {
        formData.value.teams = [];
    teamsList.value = [];
    }
};

const handleEventTypeChange = () => {
    // Placeholder for future logic if needed
};

const updateTeams = (newTeams: EventTeam[]) => {
  if (isUpdatingTeamsInternally.value) return;
  formData.value.teams = [...newTeams];
  teamsList.value = [...newTeams]; // Keep internal ref synced
};

const checkNextAvailableDate = async () => {
    const start = formData.value[dateFields.value.startField];
    const end = formData.value[dateFields.value.endField];
    if (!start || !end) {
        isDateAvailable.value = true; // Cannot check availability without both dates
        nextAvailableDate.value = null;
        return;
    }

    try {
        const startDateUTC = getStartOfDayUTC(start);
        const endDateUTC = getEndOfDayUTC(end);

        if (endDateUTC < startDateUTC) {
             isDateAvailable.value = false;
             nextAvailableDate.value = null; // Invalid range
             emit('error', 'End date cannot be before start date.');
             return;
        }

        const checkResult = await store.dispatch('events/checkDateAvailability', {
            startDate: startDateUTC,
            endDate: endDateUTC,
            excludeEventId: props.eventId // Exclude current event if editing
        });

        isDateAvailable.value = checkResult.available;
        nextAvailableDate.value = checkResult.nextAvailableDate ? new Date(checkResult.nextAvailableDate) : null;
    } catch (error) {
        console.error("Error checking date availability:", error);
        isDateAvailable.value = false; // Assume unavailable on error
        nextAvailableDate.value = null;
        emit('error', 'Could not verify date availability. Please try again.');
    }
};

const useNextAvailableDate = () => {
    if (nextAvailableDate.value) {
        const nextStartDateStr = nextAvailableDate.value.toISOString().split('T')[0];
        
        // Calculate potential end date (e.g., same duration or default 1 day)
        const start = formData.value[dateFields.value.startField];
        const end = formData.value[dateFields.value.endField];
        let duration = 0; // Default duration 0 days (same day event)
        if (start && end) {
             try {
                 duration = getEndOfDayUTC(end).getTime() - getStartOfDayUTC(start).getTime();
             } catch (e) { /* ignore date parsing errors here */ }
        }
        
        const nextEndDate = new Date(nextAvailableDate.value.getTime() + duration);
        const nextEndDateStr = nextEndDate.toISOString().split('T')[0];

        formData.value[dateFields.value.startField] = nextStartDateStr;
        formData.value[dateFields.value.endField] = nextEndDateStr;
        
        // Re-check availability for the new dates
        nextTick(() => {
        checkNextAvailableDate();
        });
    }
};

const addXPAllocation = () => {
    formData.value.xpAllocation.push({ constraintLabel: '', points: 10, role: 'Team' });
};

const removeXPAllocation = (index: number) => {
    formData.value.xpAllocation.splice(index, 1);
};

const totalXP = computed(() => {
    return formData.value.xpAllocation.reduce((sum, alloc) => sum + (Number(alloc.points) || 0), 0);
});


// Co-organizer Methods
const loadUsers = async () => {
    if (usersLoaded.value) return;
    try {
        // Assuming 'user/fetchAllUsers' fetches { uid, name, email } needed for display and ID
        allUsers.value = await store.dispatch('user/fetchAllUsers');
        // Update name cache with fetched users
        allUsers.value.forEach(user => {
            nameCache.value[user.uid] = user.name;
        });
        usersLoaded.value = true;
    } catch (error) {
        console.error("Failed to load users:", error);
        // Handle error appropriately
    }
};

const filteredUsers = computed(() => {
    if (!coOrganizerSearch.value) return [];
    const searchTerm = coOrganizerSearch.value.toLowerCase();
    const currentUserId = store.state.user.user?.uid; // Exclude self
    return allUsers.value.filter(user =>
        user.uid !== currentUserId && // Exclude self
        !formData.value.organizers.includes(user.uid) && // Exclude already added
        user.name.toLowerCase().includes(searchTerm)
    ).slice(0, 5); // Limit results
});

const searchUsers = () => {
    loadUsers(); // Ensure users are loaded when searching
    showCoOrganizerDropdown.value = true;
};

const addOrganizer = (uid: string) => {
    if (!formData.value.organizers.includes(uid)) {
        formData.value.organizers.push(uid);
    }
    coOrganizerSearch.value = '';
    showCoOrganizerDropdown.value = false;
};

const removeOrganizer = (uid: string) => {
    formData.value.organizers = formData.value.organizers.filter(orgId => orgId !== uid);
};


// Form Validation
const isFormValid = computed(() => {
    const data = formData.value;
    const datesValid = !!data[dateFields.value.startField] && !!data[dateFields.value.endField] && isDateAvailable.value;
    const requiredFields = !!data.eventName && !!data.eventType && !!data.description && datesValid;
    
    const teamConfigValid = data.isTeamEvent ? data.teams.length > 0 && data.teams.every(t => t.members.length > 0) : true;
    
    const xpValid = totalXP.value <= 50 && formData.value.xpAllocation.every(a => a.constraintLabel && a.points > 0 && a.role);

    return requiredFields && teamConfigValid && xpValid;
});

// Submit Logic
const submitButtonText = computed(() => {
    if (isSubmitting.value) return 'Processing...';
    return isAdmin.value ? 'Update Event' : 'Submit Request';
});

const handleSubmit = () => {
    if (!isFormValid.value || totalXP.value > 50) {
        emit('error', 'Please correct the errors in the form.');
        return;
    }
    isSubmitting.value = true;

    // Prepare data: Convert date strings to Timestamps for Firestore
    const submissionData = JSON.parse(JSON.stringify(formData.value));
    try {
         submissionData[dateFields.value.startField] = Timestamp.fromDate(getStartOfDayUTC(submissionData[dateFields.value.startField]));
         submissionData[dateFields.value.endField] = Timestamp.fromDate(getEndOfDayUTC(submissionData[dateFields.value.endField]));
    } catch (e) {
         console.error("Date conversion error before submit:", e);
         emit('error', 'Invalid date format encountered.');
         isSubmitting.value = false;
         return;
    }

    // Clean up unnecessary fields based on admin status
    if (isAdmin.value) {
        delete submissionData.desiredStartDate;
        delete submissionData.desiredEndDate;
    } else {
        delete submissionData.startDate;
        delete submissionData.endDate;
    }
    
    // Ensure points are numbers
    submissionData.xpAllocation = submissionData.xpAllocation.map(alloc => ({
        ...alloc,
        points: Number(alloc.points) || 0
    }));

    emit('submit', submissionData);

    // Resetting submit state is handled by the parent view after promise resolves/rejects
    // But we can add a timeout failsafe
    setTimeout(() => { isSubmitting.value = false; }, 10000); // Reset after 10s if parent doesn't
};


// Lifecycle
onMounted(() => {
    loadUsers(); // Load users for co-organizer search
    if (props.initialData && Object.keys(props.initialData).length > 0) {
         formData.value = { ...JSON.parse(JSON.stringify(defaultFormData)), ...JSON.parse(JSON.stringify(props.initialData)) };
         formData.value.xpAllocation = formData.value.xpAllocation || [];
         formData.value.organizers = formData.value.organizers || [];
         formData.value.teams = formData.value.teams || [];
         teamsList.value = formData.value.teams;
         // Pre-fill name cache for initial organizers
        if (formData.value.organizers.length > 0) {
            store.dispatch('user/fetchUserNames', formData.value.organizers).then(names => {
                nameCache.value = { ...nameCache.value, ...names };
            });
        }
         if (formData.value[dateFields.value.startField] && formData.value[dateFields.value.endField]) {
             checkNextAvailableDate(); // Check availability on load if editing
        }
    } else {
         formData.value = JSON.parse(JSON.stringify(defaultFormData));
         teamsList.value = [];
    }

     // Load students needed for ManageTeamsComponent
    store.dispatch('user/fetchStudents').then(students => {
        availableStudents.value = students;
        // Update name cache
         students.forEach(student => {
            nameCache.value[student.uid] = student.name;
        });
    });
});

</script>

<style>
/* Scoped styles are okay, but for datepicker overrides, global might be needed */
.dp__input {
  font-size: 0.875rem; /* Match Bulma input size */
  border-radius: 4px;
  border: 1px solid #dbdbdb;
  padding: calc(0.5em - 1px) 1em;
   line-height: 1.5;
   height: 2.5em; /* Match Bulma input height */
   box-shadow: inset 0 0.0625em 0.125em rgba(10, 10, 10, 0.05);
   width: 100%;
   background-color: white;
    color: #363636;
}
.dp__input:focus {
     border-color: #485fc7; /* Bulma primary */
     box-shadow: 0 0 0 0.125em rgba(72, 95, 199, 0.25);
}
.dp__input.is-danger,
.input.is-danger { /* Ensure our custom class targets Bulma too */
    border-color: #f14668; /* Bulma danger */
}
.dp__input.is-danger:focus {
    box-shadow: 0 0 0 0.125em rgba(241, 70, 104, 0.25);
}

/* Style placeholder */
.dp__input_placeholder {
     color: #7a7a7a; /* Bulma input placeholder color */
      opacity: 0.5;
}

/* Ensure dropdown menu position for datepicker */
.dp__menu {
  z-index: 50 !important; /* Ensure it appears above other elements */
}

/* Adjust Chakra compatibility classes if they exist */
.chakra-input {
    /* Apply Bulma input styles here if using this class */
     font-size: 1rem;
     border-radius: 4px;
     border: 1px solid #dbdbdb;
     padding: calc(0.5em - 1px) 1em;
      line-height: 1.5;
      height: 2.5em; 
      box-shadow: inset 0 0.0625em 0.125em rgba(10, 10, 10, 0.05);
    width: 100%;
       background-color: white;
       color: #363636;
}
.chakra-input.error {
    border-color: #f14668; /* Bulma danger */
}
</style>
