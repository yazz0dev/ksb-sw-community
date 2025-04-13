<template>
  <form @submit.prevent="handleSubmit" class="mb-5">
    <!-- Event Details Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h3 class="h4 mb-4">Event Details</h3>

        <div class="mb-3">
          <label class="form-label">Event Format <span class="text-danger">*</span></label>
          <div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="eventFormat" id="formatIndividual" :value="false" v-model="formData.isTeamEvent" @change="handleFormatChange" :disabled="isSubmitting">
              <label class="form-check-label" for="formatIndividual">Individual</label>
            </div>
            <div class="form-check form-check-inline">
              <input class="form-check-input" type="radio" name="eventFormat" id="formatTeam" :value="true" v-model="formData.isTeamEvent" @change="handleFormatChange" :disabled="isSubmitting">
              <label class="form-check-label" for="formatTeam">Team</label>
            </div>
          </div>
        </div>

        <div class="mb-3">
          <label for="eventName" class="form-label">Event Name <span class="text-danger">*</span></label>
          <input
            id="eventName"
            class="form-control"
            type="text"
            v-model="formData.eventName"
            :disabled="isSubmitting"
            placeholder="Enter event name"
            required
          />
        </div>

        <div class="mb-3">
          <label for="eventType" class="form-label">Event Type <span class="text-danger">*</span></label>
           <div class="input-group">
              <span class="input-group-text"><i class="fas fa-tag"></i></span>
              <select
                id="eventType"
                class="form-select"
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
        </div>

        <div class="mb-3">
          <label for="eventDescription" class="form-label">Description <span class="text-danger">*</span></label>
          <textarea
            id="eventDescription"
            class="form-control"
            rows="4"
            v-model="formData.description"
            :disabled="isSubmitting"
            placeholder="Enter event description (supports Markdown)"
            required
          ></textarea>
           <small class="form-text text-muted">You can use Markdown for formatting.</small>
        </div>

        <!-- Team Configuration Section (Conditional) -->
        <template v-if="formData.isTeamEvent">
          <hr class="my-4">
          <h4 class="h5 mb-4">Team Configuration</h4>
          <ManageTeamsComponent
              :initial-teams="formData.teams"
              :students="availableStudents"
              :name-cache="nameCache"
              :is-submitting="isSubmitting"
              :can-auto-generate="true"
              :event-id="eventId || ''"
              @update:teams="updateTeams"
              @error="(msg) => emit('error', msg)"
          />
        </template>
      </div>
    </div>

    <!-- Event Schedule Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h3 class="h4 mb-4">Event Schedule</h3>
        <div class="row g-3">
          <div class="col-md-6">
            <div class="mb-3">
              <label :for="dateFields.startField" class="form-label">{{ dateFields.startLabel }} <span class="text-danger">*</span></label>
              <DatePicker
                  :uid="dateFields.startField"
                  v-model="formData[dateFields.startField]"
                  :enable-time-picker="false"
                  :disabled="isSubmitting"
                  @update:model-value="checkNextAvailableDate"
                  model-type="yyyy-MM-dd"
                  :min-date="new Date()"
                  :input-class-name="!isDateAvailable ? 'form-control is-invalid' : 'form-control'"
                  :auto-apply="true"
                  :teleport="true"
                  :clearable="false"
                  placeholder="Select start date"
                  required
                />
               <div v-if="formData[dateFields.startField] && !isDateAvailable" class="invalid-feedback d-block">
                 <i class="fas fa-exclamation-circle me-1"></i> Date conflict detected
               </div>
               <div v-else-if="formData[dateFields.startField] && isDateAvailable" class="valid-feedback d-block">
                 <i class="fas fa-check-circle me-1"></i> Date available
               </div>
            </div>
          </div>
          <div class="col-md-6">
            <div class="mb-3">
              <label :for="dateFields.endField" class="form-label">{{ dateFields.endLabel }} <span class="text-danger">*</span></label>
               <DatePicker
                  :uid="dateFields.endField"
                  v-model="formData[dateFields.endField]"
                  :enable-time-picker="false"
                  :disabled="isSubmitting || !formData[dateFields.startField]"
                  @update:model-value="checkNextAvailableDate"
                  model-type="yyyy-MM-dd"
                  :min-date="formData[dateFields.startField] ? new Date(formData[dateFields.startField]) : new Date()"
                  :input-class-name="!formData[dateFields.startField] ? 'form-control is-invalid' : 'form-control'"
                  :auto-apply="true"
                  :teleport="true"
                  :clearable="false"
                  placeholder="Select end date"
                  required
                />
              <small v-if="!formData[dateFields.startField]" class="form-text text-muted">Select start date first</small>
            </div>
          </div>
        </div>

        <div v-if="!isDateAvailable && nextAvailableDate && !isRequestForm" class="alert alert-warning mt-4 d-flex align-items-center">
           <div class="flex-shrink-0 me-3">
              <i class="fas fa-exclamation-triangle fa-2x"></i>
           </div>
           <div class="flex-grow-1">
              <h6 class="alert-heading mb-1">Date Conflict Detected</h6>
              <p class="small mb-3">The selected dates conflict with another event. Next available start date is <strong class="fw-semibold">{{ formatDate(nextAvailableDate) }}</strong>.</p>
              <button
                type="button"
                class="btn btn-sm btn-link text-decoration-none p-0 d-inline-flex align-items-center"
                @click="useNextAvailableDate"
                :disabled="isSubmitting"
              >
                 <i class="fas fa-calendar-check me-1"></i>
                 <span>Use Next Available Date</span>
              </button>
           </div>
        </div>
      </div>
    </div>

     <!-- Rating Criteria Card -->
    <div class="card shadow-sm mb-4">
      <div class="card-body p-4 p-lg-5">
        <h3 class="h4 mb-3">Rating Criteria & XP Allocation</h3>
        <p class="small text-secondary mb-4">Define how teams/participants will be rated and earn XP. Total XP cannot exceed 50.</p>
        
        <div v-for="(alloc, index) in formData.xpAllocation" :key="alloc.constraintIndex ?? index" class="mb-4 p-3 bg-light-subtle border rounded">
            <div class="row g-3 align-items-end"> 
                <div class="col-md-5">
                    <label :for="`criteria-label-${index}`" class="form-label form-label-sm">Criteria Label</label>
                    <input :id="`criteria-label-${index}`" class="form-control form-control-sm" type="text" v-model="alloc.constraintLabel" :disabled="isSubmitting" placeholder="e.g., Code Quality">
                </div>
                <div class="col-md-2">
                    <label :for="`criteria-points-${index}`" class="form-label form-label-sm">XP Points</label>
                    <input :id="`criteria-points-${index}`" class="form-control form-control-sm" type="number" v-model.number="alloc.points" :disabled="isSubmitting" min="1" max="50">
                </div>
                 <div class="col-md-3">
                     <label :for="`criteria-role-${index}`" class="form-label form-label-sm">Applies To</label>
                     <select :id="`criteria-role-${index}`" class="form-select form-select-sm" v-model="alloc.role" :disabled="isSubmitting">
                         <option value="Team">Team</option>
                         <option value="Individual">Individual</option>
                     </select>
                 </div>
                <div class="col-md-auto">
                    <button type="button" class="btn btn-sm btn-outline-danger" @click="removeXPAllocation(index)" :disabled="isSubmitting" title="Remove Criteria">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            </div>
        </div>
        
        <div class="d-flex justify-content-between align-items-center">
             <button type="button" class="btn btn-sm btn-outline-primary d-inline-flex align-items-center" @click="addXPAllocation" :disabled="isSubmitting">
                 <i class="fas fa-plus me-1"></i>
                 <span>Add Criteria</span>
             </button>
             <p class="small fw-medium mb-0" :class="{ 'text-danger': totalXP > 50, 'text-success': totalXP > 0 && totalXP <= 50 }">
                 Total XP: {{ totalXP }} / 50
             </p>
        </div>
        <p v-if="totalXP > 50" class="form-text text-danger mt-2">Total XP cannot exceed 50.</p>
      </div>
    </div>

    <!-- Co-organizers Card -->
     <div class="card shadow-sm mb-4">
        <div class="card-body p-4 p-lg-5">
          <h3 class="h4 mb-3">Co-organizers (Optional)</h3>
          <div class="mb-3 dropdown">
              <label for="coOrganizerSearch" class="form-label form-label-sm">Add Co-organizers</label>
              <div class="input-group input-group-sm">
                 <span class="input-group-text"><i class="fas fa-search"></i></span>
                  <input
                      id="coOrganizerSearch"
                      class="form-control"
                      type="text"
                      v-model="coOrganizerSearch"
                      @input="searchUsers"
                      @focus="showCoOrganizerDropdown = true"
                      @blur="handleCoOrganizerBlur"
                      placeholder="Search by name..."
                      :disabled="isSubmitting"
                      aria-haspopup="listbox"
                      :aria-expanded="showCoOrganizerDropdown && filteredUsers.length > 0"
                  >
              </div>
              <ul class="dropdown-menu w-100" :class="{ 'show': showCoOrganizerDropdown && filteredUsers.length > 0 }">
                  <li v-for="user in filteredUsers" :key="user.uid">
                      <a
                          href="#"
                          class="dropdown-item small"
                          @mousedown.prevent="addOrganizer(user.uid)"
                       >
                          {{ user.name }} ({{ user.email }})
                      </a>
                  </li>
                   <li v-if="coOrganizerSearch && filteredUsers.length === 0"><span class="dropdown-item-text small text-muted fst-italic">No users found</span></li>
              </ul>
          </div>

          <!-- Selected Co-organizers -->
          <div v-if="formData.organizers.length > 0" class="mt-3">
              <h6 class="small fw-bold mb-2">Selected Co-organizers:</h6>
              <div class="d-flex flex-wrap gap-2">
                  <span
                      v-for="orgId in formData.organizers"
                      :key="orgId"
                      class="badge rounded-pill bg-secondary-subtle text-secondary-emphasis d-inline-flex align-items-center"
                  >
                      {{ nameCache[orgId] || orgId }}
                      <button
                          type="button"
                          class="btn-close btn-close-sm ms-1"
                          @click="removeOrganizer(orgId)"
                          :disabled="isSubmitting"
                          aria-label="Remove Co-organizer"
                      ></button>
                  </span>
              </div>
          </div>
        </div>
     </div>

      <!-- Submit Button -->
      <div class="text-end">
          <button type="submit" class="btn btn-primary" :disabled="isSubmitting || totalXP > 50 || (!isDateAvailable && !isRequestForm)">
              <span v-if="isSubmitting" class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
              {{ isSubmitting ? 'Submitting...' : (eventId ? 'Update Event' : (isRequestForm ? 'Submit Request' : 'Create Event')) }}
          </button>
      </div>

  </form>
</template>

<script setup lang="ts">
// @ts-ignore-next-line
// @ts-nocheck
import { ref, computed, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';
import ManageTeamsComponent from './ManageTeamsComponent.vue';
import { Timestamp } from 'firebase/firestore';
import { DateTime } from 'luxon';

// Interfaces (consider moving to a types file)
export interface Team {
  name: string;
  members: string[];
}

export interface Student {
  uid: string;
  name: string;
}

export interface NameCache {
  [key: string]: string;
}

export interface FormData {
  eventName: string;
  eventType: string;
  description: string;
  isTeamEvent: boolean;
  startDate: string | null; // Store as YYYY-MM-DD
  endDate: string | null;   // Store as YYYY-MM-DD
  desiredStartDate?: string | null; // For requests
  desiredEndDate?: string | null; // For requests
  teams: Team[];
  xpAllocation: { constraintLabel: string; points: number; role: 'Team' | 'Individual'; constraintIndex?: number }[];
  organizers: string[];
  status?: string; // Added for edit mode
}

// Props definition using defineProps macro
const props = defineProps<{
  initialData?: FormData | null;
  isSubmitting?: boolean;
  availableEventTypes?: string[];
  isRequestForm?: boolean;
  eventId?: string | null;
}>();

// Default values for props if not provided (handled slightly differently in <script setup>)
const availableEventTypes = computed(() => props.availableEventTypes ?? ['Workshop', 'Competition', 'Seminar', 'Hackathon', 'Other']);
const isSubmitting = computed(() => props.isSubmitting ?? false);
const isRequestForm = computed(() => props.isRequestForm ?? false);
const eventId = computed(() => props.eventId ?? null);

// Emits definition using defineEmits macro
const emit = defineEmits<{ 
  (e: 'submit', payload: FormData): void
  (e: 'error', message: string): void
}>();

const store = useStore();
const formData = ref<FormData>(initializeFormData());
const availableStudents = ref<Student[]>([]);
const nameCache = ref<NameCache>({});
const allUsers = ref<{ uid: string; name: string; email: string }[]>([]);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);
const nextAvailableDate = ref<Date | null>(null);
const isDateAvailable = ref(true); // Assume available initially

const dateFields = computed(() => {
    return isRequestForm.value
        ? { startLabel: 'Desired Start Date', endLabel: 'Desired End Date', startField: 'desiredStartDate', endField: 'desiredEndDate' }
        : { startLabel: 'Start Date', endLabel: 'End Date', startField: 'startDate', endField: 'endDate' };
});

 const totalXP = computed(() => {
  return formData.value.xpAllocation.reduce((sum, alloc) => sum + (Number(alloc.points) || 0), 0);
});

function initializeFormData(): FormData {
  const defaults: FormData = {
    eventName: '',
    eventType: '',
    description: '',
    isTeamEvent: false,
    startDate: null,
    endDate: null,
    desiredStartDate: null,
    desiredEndDate: null,
    teams: [],
    xpAllocation: [],
    organizers: [],
    status: isRequestForm.value ? 'Pending' : 'Approved', // Use computed prop default
  };

  if (props.initialData) {
    const initial = { ...props.initialData };
    // Convert Timestamps to YYYY-MM-DD strings if they exist
    const formatTimestamp = (ts: any) => {
      if (ts instanceof Timestamp) {
        return DateTime.fromJSDate(ts.toDate()).toISODate();
      }
      if (typeof ts === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(ts)) {
         return ts; // Already in correct format
      }
      if (ts instanceof Date) {
          return DateTime.fromJSDate(ts).toISODate();
      }
      return null;
    };

    initial.startDate = formatTimestamp(initial.startDate);
    initial.endDate = formatTimestamp(initial.endDate);
    initial.desiredStartDate = formatTimestamp(initial.desiredStartDate);
    initial.desiredEndDate = formatTimestamp(initial.desiredEndDate);

    // Ensure xpAllocation has constraintIndex for keys if needed
    initial.xpAllocation = (initial.xpAllocation || []).map((alloc, index) => ({
        ...alloc,
        constraintIndex: alloc.constraintIndex ?? index // Assign index if missing
    }));


    return { ...defaults, ...initial };
  }
  return defaults;
}


const filteredUsers = computed(() => {
  if (!coOrganizerSearch.value) return [];
  const searchLower = coOrganizerSearch.value.toLowerCase();
  return allUsers.value.filter(user =>
    user.uid !== store.getters['user/userId'] && // Exclude self
    !formData.value.organizers.includes(user.uid) && // Exclude already added
    (user.name?.toLowerCase().includes(searchLower) || user.email?.toLowerCase().includes(searchLower))
  );
});

const fetchInitialData = async () => {
  try {
    // Fetch students only if it's a team event or potentially could become one
    // Optimisation: Maybe fetch only when isTeamEvent becomes true?
    if (store.getters['user/isAdmin']) {
        await store.dispatch('user/fetchAllStudents');
        availableStudents.value = store.state.user.studentList.map((s: any) => ({ uid: s.uid, name: s.name })); // Adapt based on actual structure
        nameCache.value = store.getters['user/userNameCache']; // Ensure cache is populated

        // Fetch all users for co-organizer dropdown
         await store.dispatch('user/fetchAllUsers'); // Assuming an action exists
         allUsers.value = store.state.user.allUsersList || []; // Adapt based on actual state name
    }

  } catch (error) {
    console.error("Error fetching initial form data:", error);
    emit('error', 'Failed to load necessary data for the form.');
  }
};

onMounted(() => {
    formData.value = initializeFormData(); // Re-initialize on mount
    fetchInitialData();
    checkNextAvailableDate(); // Initial check if dates are pre-filled
});

// Re-initialize form when initialData changes (e.g., switching between create/edit)
watch(() => props.initialData, () => {
    formData.value = initializeFormData();
    checkNextAvailableDate(); // Re-check dates
}, { deep: true });

const handleFormatChange = () => {
  if (!formData.value.isTeamEvent) {
    formData.value.teams = []; // Clear teams if switching to individual
  }
  // Optionally reset XP allocation roles if needed
};

const handleEventTypeChange = () => {
    // If specific logic is needed when event type changes
};

 const updateTeams = (newTeams: Team[]) => {
    formData.value.teams = newTeams;
 };

const addXPAllocation = () => {
  formData.value.xpAllocation.push({
    constraintLabel: '',
    points: 5, // Default points
    role: 'Team', // Default role
    constraintIndex: formData.value.xpAllocation.length // Assign next index
  });
};

const removeXPAllocation = (index: number) => {
  formData.value.xpAllocation.splice(index, 1);
  // Re-index if needed, although using a unique key/id is better
  // formData.value.xpAllocation.forEach((alloc, idx) => alloc.constraintIndex = idx);
};

 const addOrganizer = (userId: string) => {
  if (!formData.value.organizers.includes(userId)) {
    formData.value.organizers.push(userId);
  }
  coOrganizerSearch.value = '';
  showCoOrganizerDropdown.value = false;
};

const removeOrganizer = (userId: string) => {
  formData.value.organizers = formData.value.organizers.filter(id => id !== userId);
};

 const searchUsers = () => {
  showCoOrganizerDropdown.value = coOrganizerSearch.value.length > 0;
  // Implement debouncing if fetching users dynamically instead of from pre-fetched list
};

const handleSubmit = () => {
  if (totalXP.value > 50) {
      emit('error', 'Total XP allocated cannot exceed 50.');
      return;
  }
  if (!isDateAvailable.value && !isRequestForm.value) { // Use computed prop default
       emit('error', 'Selected dates conflict with another event. Please choose different dates or use the suggestion.');
       return;
  }

  // Convert YYYY-MM-DD strings back to Date objects or Timestamps before emitting
  const dataToSubmit = JSON.parse(JSON.stringify(formData.value));
   const stringToDate = (dateString: string | null | undefined): Date | null => { // Allow undefined
        return dateString ? DateTime.fromISO(dateString).toJSDate() : null;
    };

  // Explicitly pass string | null to stringToDate
  dataToSubmit.startDate = stringToDate(formData.value.startDate ?? null);
  dataToSubmit.endDate = stringToDate(formData.value.endDate ?? null);
  dataToSubmit.desiredStartDate = stringToDate(formData.value.desiredStartDate ?? null);
  dataToSubmit.desiredEndDate = stringToDate(formData.value.desiredEndDate ?? null);

  // Remove constraintIndex before submitting if it was only for UI keying
   dataToSubmit.xpAllocation = dataToSubmit.xpAllocation.map((alloc: any) => {
       const { constraintIndex, ...rest } = alloc;
       return rest;
   });

  emit('submit', dataToSubmit);
};

 const checkNextAvailableDate = async () => {
    const startField = dateFields.value.startField as keyof FormData;
    const endField = dateFields.value.endField as keyof FormData;
    const startDateString = formData.value[startField];
    const endDateString = formData.value[endField];

    if (!startDateString || !endDateString || isRequestForm.value) { // Use computed prop default
        isDateAvailable.value = true; // Assume available if dates incomplete or it's a request
        nextAvailableDate.value = null;
        return;
    }

    try {
         // Fix 3: More explicit type checking before datetime operations
         if (typeof startDateString !== 'string' || typeof endDateString !== 'string') {
             // If dates are not valid strings, treat as unavailable or handle appropriately
             isDateAvailable.value = true; // Or false depending on desired behavior for invalid input
             nextAvailableDate.value = null;
             console.warn("Attempted date availability check with invalid date strings.");
             return;
         }

         // Now TypeScript knows these are strings
         const startDate = DateTime.fromISO(startDateString).toJSDate();
         const endDate = DateTime.fromISO(endDateString).toJSDate();

         if (!startDate || !endDate || isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
             throw new Error("Invalid date format for availability check.");
         }

         const result = await store.dispatch('events/checkDateAvailability', {
            startDate: startDate,
            endDate: endDate,
            excludeEventId: eventId.value // Use computed prop default
         });
        isDateAvailable.value = result.isAvailable;
        nextAvailableDate.value = result.nextAvailableDate instanceof Timestamp
            ? result.nextAvailableDate.toDate()
            : (result.nextAvailableDate instanceof Date ? result.nextAvailableDate : null); // Ensure it's Date or null
    } catch (error) {
        console.error('Error checking date availability:', error);
        isDateAvailable.value = true; // Assume available on error
        nextAvailableDate.value = null;
        emit('error', 'Could not verify date availability.');
    }
};

const useNextAvailableDate = () => {
    if (nextAvailableDate.value) {
         const startField = dateFields.value.startField as keyof FormData;
         const endField = dateFields.value.endField as keyof FormData;
         const currentEndDateString = formData.value[endField];
         const currentStartDateString = formData.value[startField];

         if (!currentStartDateString || !currentEndDateString) return; // Should not happen if button is visible

         try {
             // Fix: Ensure dates are strings before parsing
             if (typeof currentStartDateString !== 'string' || typeof currentEndDateString !== 'string') {
                 emit('error', 'Current date values are invalid.');
                 return;
             }
             const currentStart = DateTime.fromISO(currentStartDateString);
             const currentEnd = DateTime.fromISO(currentEndDateString);

             if (!currentStart.isValid || !currentEnd.isValid) {
                 throw new Error("Current dates are invalid.")
             }

             const duration = currentEnd.diff(currentStart);
             const nextStart = DateTime.fromJSDate(nextAvailableDate.value);
             const nextEnd = nextStart.plus(duration);

             const nextStartDateISO: string | null = nextStart.isValid ? nextStart.toISODate() : null;
             const nextEndDateISO: string | null = nextEnd.isValid ? nextEnd.toISODate() : null;

            if (startField === 'startDate') {
                formData.value.startDate = nextStartDateISO;
            } else if (startField === 'desiredStartDate') {
                formData.value.desiredStartDate = nextStartDateISO;
            }

            if (endField === 'endDate') {
                formData.value.endDate = nextEndDateISO;
            } else if (endField === 'desiredEndDate') {
                formData.value.desiredEndDate = nextEndDateISO;
            }

            // Re-check availability after setting new dates
           checkNextAvailableDate();
         } catch(error) {
            console.error("Error calculating next available date: ", error);
            emit('error', 'Failed to calculate suggested dates.');
         }
    }
};

 const formatDate = (date: Date | Timestamp | string | null | undefined): string => { // Accept string too
    if (!date) return '';
    let dateTime: DateTime | null = null; // Renamed variable to avoid redeclaration
    if (date instanceof Timestamp) dateTime = DateTime.fromJSDate(date.toDate());
    else if (date instanceof Date) dateTime = DateTime.fromJSDate(date);
    else if (typeof date === 'string') dateTime = DateTime.fromISO(date); // Handle ISO string input
    
    return dateTime && dateTime.isValid ? dateTime.toLocaleString(DateTime.DATE_MED) : ''; // Check validity
};

const handleCoOrganizerBlur = () => {
  // Use standard global setTimeout
  setTimeout(() => {
    showCoOrganizerDropdown.value = false;
  }, 150);
};

</script>


<style scoped>
/* Add styles for DatePicker validation states if needed */
/* :deep(.dp__input_invalid) { border-color: var(--bs-danger); } */
/* :deep(.dp__input_valid) { border-color: var(--bs-success); } */

/* Ensure dropdown menu displays correctly */
.dropdown-menu.show {
    display: block;
}

/* Style selected co-organizer badges */
.badge .btn-close {
    padding: 0.25em 0.4em;
}
</style>
