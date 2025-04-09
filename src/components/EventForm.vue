<!-- src/components/EventForm.vue -->
<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <!-- Basic Info Section -->
        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <h3 class="text-lg font-medium text-text-primary">Event Details</h3>

                <!-- Event Format Selection (Moved to top) -->
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-text-secondary">Event Format <span class="text-error">*</span></label>
                    <div class="flex gap-4">
                        <label class="inline-flex items-center">
                            <input
                                type="radio"
                                v-model="formData.isTeamEvent"
                                :value="false"
                                class="form-radio text-primary focus:ring-primary"
                                :disabled="isSubmitting"
                                @change="handleFormatChange"
                            >
                            <span class="ml-2 text-sm text-text-secondary">Individual</span>
                        </label>
                        <label class="inline-flex items-center">
                            <input
                                type="radio"
                                v-model="formData.isTeamEvent"
                                :value="true"
                                class="form-radio text-primary focus:ring-primary"
                                :disabled="isSubmitting"
                                @change="handleFormatChange"
                            >
                            <span class="ml-2 text-sm text-text-secondary">Team</span>
                        </label>
                    </div>
                </div>
                
                <!-- Event Name -->
                <div>
                    <label for="eventName" class="block text-sm font-medium text-text-secondary">Event Name <span class="text-error">*</span></label>
                    <input
                        type="text"
                        id="eventName"
                        v-model="formData.eventName"
                        required
                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                        :disabled="isSubmitting"
                    >
                </div>

                <!-- Event Type -->
                <div>
                    <label for="eventType" class="block text-sm font-medium text-text-secondary">Event Type <span class="text-error">*</span></label>
                    <select
                        id="eventType"
                        v-model="formData.eventType"
                        required
                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                        :disabled="isSubmitting"
                        @change="handleEventTypeChange"
                    >
                        <option value="">Select Type</option>
                        <option v-for="type in availableEventTypes" 
                                :key="type" 
                                :value="type">{{ type }}</option>
                    </select>
                </div>

                <!-- Description -->
                <div>
                    <label for="description" class="block text-sm font-medium text-text-secondary">Description <span class="text-error">*</span></label>
                    <textarea
                        id="description"
                        v-model="formData.description"
                        rows="4"
                        required
                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                        :disabled="isSubmitting"
                    ></textarea>
                </div>

                <!-- Team Configuration (shown only when isTeamEvent is true) -->
                <div v-if="formData.isTeamEvent" class="space-y-4 border-t border-border pt-4">
                    <h4 class="text-md font-medium text-text-primary">Team Configuration</h4>
                    
                    <!-- Add Teams Management Component -->
                    <ManageTeamsComponent 
                        :initial-teams="formData.teams"
                        :students="availableStudents"
                        :name-cache="nameCache"
                        :is-submitting="isSubmitting"
                        :can-auto-generate="true"
                        @update:teams="updateTeams"
                    />
                </div>
            </div>
        </div>

        <!-- Dates Section -->
        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <h3 class="text-lg font-medium text-text-primary">Event Schedule</h3>
                
                <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <!-- Start Date -->
                    <div class="space-y-2">
                        <label :for="isAdmin ? 'startDate' : 'desiredStartDate'" class="block text-sm font-medium text-text-secondary">
                            {{ isAdmin ? 'Start Date' : 'Desired Start Date' }} <span class="text-error">*</span>
                        </label>
                        <div class="flex space-x-2">
                            <!-- Datepicker component -->
                            <DatePicker
                              v-model="formData[isAdmin ? 'startDate' : 'desiredStartDate']"
                              :config="{
                                format: 'yyyy-MM-dd', // Adjust format to match your needs
                                autoApply: true,
                              }"
                              :disabled="isSubmitting"
                              @change="checkNextAvailableDate"
                              class="flex-1"
                            />
                        </div>
                        <div v-if="nextAvailableDate" class="text-sm">
                            <span v-if="isDateAvailable" class="text-success">
                                <i class="fas fa-check-circle mr-1"></i> Selected date is available!
                            </span>
                            <span v-else class="text-warning">
                                <i class="fas fa-exclamation-circle mr-1"></i>
                                Next available: {{ formatDate(nextAvailableDate) }}
                            </span>
                        </div>
                    </div>

                    <!-- End Date -->
                    <div>
                        <label :for="isAdmin ? 'endDate' : 'desiredEndDate'" class="block text-sm font-medium text-text-secondary">
                            {{ isAdmin ? 'End Date' : 'Desired End Date' }} <span class="text-error">*</span>
                        </label>
                        <!-- Datepicker component for End Date -->
                        <DatePicker
                          v-model="formData[isAdmin ? 'endDate' : 'desiredEndDate']"
                          :config="{
                            format: 'yyyy-MM-dd', // Keep format consistent
                            autoApply: true,
                            minDate: formData[isAdmin ? 'startDate' : 'desiredStartDate'] // Use minDate prop
                          }"
                          :disabled="isSubmitting"
                          @change="checkNextAvailableDate"
                          class="flex-1 block"
                        />
                        <button
                            type="button"
                            @click="findNextAvailableDate"
                            class="px-3 py-1 text-sm rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors mt-2 sm:mt-0 sm:ml-2 inline-flex items-center"
                            :disabled="isSubmitting"
                        >
                            <i class="fas fa-calendar-plus"></i> Find Next
                        </button>
                    </div>

                </div>
            </div>
        </div>

        <!-- XP Allocation Section -->
        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <div class="flex justify-between items-center">
                    <h3 class="text-lg font-medium text-text-primary">Rating Criteria & XP</h3>
                    <button
                        type="button"
                        @click="addAllocation"
                        class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors"
                        :disabled="isSubmitting || formData.xpAllocation.length >= 4"
                    >
                        <i class="fas fa-plus mr-1.5"></i> Add Criteria
                    </button>
                </div>
                
                <!-- Add total XP display -->
                <div class="text-sm text-text-secondary">
                    Total XP: {{ totalXP }}/50
                </div>

                <!-- XP Allocations List -->
                <div class="space-y-3">
                    <div
                        v-for="(alloc, index) in formData.xpAllocation"
                        :key="index"
                        class="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3 bg-background rounded-md border border-border"
                    >
                        <!-- Criteria Label -->
                        <div>
                            <label :for="'criteria-'+index" class="block text-sm font-medium text-text-secondary">Criteria</label>
                            <input
                                :id="'criteria-'+index"
                                type="text"
                                v-model="alloc.constraintLabel"
                                required
                                placeholder="e.g., Functionality"
                                class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                                :disabled="isSubmitting"
                            >
                        </div>

                        <!-- Role -->
                        <div>
                            <label :for="'role-'+index" class="block text-sm font-medium text-text-secondary">Role</label>
                            <select
                                :id="'role-'+index"
                                v-model="alloc.role"
                                required
                                class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                                :disabled="isSubmitting"
                            >
                                <option value="fullstack">Fullstack</option>
                                <option value="presenter">Presenter</option>
                                <option value="designer">Designer</option>
                                <option value="problemSolver">Problem Solver</option>
                            </select>
                        </div>

                        <!-- Points -->
                        <div class="relative">
                            <label :for="'points-'+index" class="block text-sm font-medium text-text-secondary">
                                XP Points: {{ alloc.points }}
                            </label>
                            <div class="flex items-center space-x-2">
                                <input
                                    :id="'points-'+index"
                                    type="range"
                                    v-model="alloc.points"
                                    min="1"
                                    max="50"
                                    step="1"
                                    class="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                    :disabled="isSubmitting"
                                    @input="validatePoints(index)"
                                >
                                <button
                                    type="button"
                                    @click="removeAllocation(index)"
                                    class="text-error hover:text-error-dark transition-colors"
                                    :disabled="isSubmitting"
                                >
                                    <i class="fas fa-trash-alt"></i>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                <p v-if="formData.xpAllocation.length === 0" class="text-sm text-text-secondary italic">
                    Add rating criteria to define how participants will be evaluated and earn XP.
                </p>
            </div>
        </div>

        <!-- Co-organizers Section -->
        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <h3 class="text-lg font-medium text-text-primary">Co-organizers</h3>
                
                <div class="flex items-center space-x-2">
                    <div class="flex-1 relative">
                        <input
                            type="text"
                            v-model="coOrganizerSearch"
                            placeholder="Search users to add as co-organizers..."
                            class="block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50"
                            :disabled="isSubmitting"
                            @focus="showCoOrganizerDropdown = true"
                            @blur="hideCoOrganizerDropdown"
                        >
                        
                        <!-- Dropdown for co-organizer selection -->
                        <div v-if="showCoOrganizerDropdown && filteredUsers.length > 0" class="absolute z-10 mt-1 w-full bg-surface shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                            <div
                                v-for="user in filteredUsers"
                                :key="user.uid"
                                class="cursor-pointer select-none relative py-2 pl-3 pr-9 text-text-primary hover:bg-primary-light hover:text-white"
                                @mousedown="addCoOrganizer(user)"
                            >
                                {{ user.name || user.uid }}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Selected co-organizers -->
                <div v-if="formData.organizers.length > 0" class="flex flex-wrap gap-2">
                    <span
                        v-for="orgId in formData.organizers"
                        :key="orgId"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-sm bg-primary-light text-white"
                    >
                        {{ getUserName(orgId) }}
                        <button
                            type="button"
                            @click="removeCoOrganizer(orgId)"
                            class="ml-1.5 inline-flex items-center justify-center h-4 w-4 rounded-full hover:bg-primary-dark focus:outline-none"
                            :disabled="isSubmitting"
                        >
                            <i class="fas fa-times text-xs"></i>
                            <span class="sr-only">Remove co-organizer</span>
                        </button>
                    </span>
                </div>
                <p v-else class="text-sm text-text-secondary italic">
                    No co-organizers added yet.
                </p>
            </div>
        </div>

        <!-- Submit Button -->
        <div class="flex justify-end">
            <button
                type="submit"
                class="inline-flex items-center px-4 py-2 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                :disabled="isSubmitting"
            >
                <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-save mr-2"></i>
                {{ submitButtonText }}
            </button>
        </div>
    </form>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
import { useStore } from 'vuex';
import { Timestamp } from 'firebase/firestore';
import { XPAllocation, EventCreateDTO, EventRequest, EventTeam, EventFormData } from '../types/event';
import ManageTeamsComponent from './ManageTeamsComponent.vue';
import DatePicker from '@vuepic/vue-datepicker'; // Import from package
import '@vuepic/vue-datepicker/dist/main.css'; // Import datepicker CSS

// Define form data with proper typing
const props = defineProps({
    eventId: {
        type: String,
        required: false
    },
    initialData: {
        type: Object,
        default: () => ({})
    }
});

declare const window: Window & typeof globalThis;

const emit = defineEmits(['submit']);
const store = useStore();

// Form state
const isSubmitting = ref(false);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);

const isAdmin = computed(() => store.getters['user/getUser']?.role === 'Admin');

// Form data with defaults
const formData = ref<EventFormData>({
    // Format selection (moved to top)
    isTeamEvent: false,
    eventType: '',
    
    // Basic event details
    eventName: '',
    description: '',
    startDate: '',
    endDate: '',
    desiredStartDate: '',
    desiredEndDate: '',
    location: '',
    
    // Other fields
    organizers: [],
    xpAllocation: [],
    teams: [
        { teamName: '', members: [], ratings: [], submissions: [] },
        { teamName: '', members: [], ratings: [], submissions: [] }
    ], // Add teams array
});

// Add available event types
const individualEventTypes = [
    'Workshop',
    'Presentation',
    'Individual Project',
    'Training Session',
    'Tutorial'
];

const teamEventTypes = [
    'Hackathon',
    'Team Project',
    'Group Challenge',
    'Team Competition',
    'Collaborative Workshop'
];

const availableEventTypes = computed(() => {
    return formData.value.isTeamEvent ? teamEventTypes : individualEventTypes;
});

// Update the handleFormatChange function to avoid circular updates:
const handleFormatChange = async () => {
    formData.value.eventType = '';
    
    // Create new teams array without causing circular updates
    if (formData.value.isTeamEvent) {
        // Ensure we have the latest student data
        const initialTeams = [
            { teamName: 'Team 1', members: [], ratings: [], submissions: [] },
            { teamName: 'Team 2', members: [], ratings: [], submissions: [] }
        ];
        
        // Set teams without triggering the watcher in ManageTeamsComponent
        // by temporarily disabling the watch
        const updatingFlag = isUpdatingTeamsInternally;
        updatingFlag.value = true;
        formData.value.teams = JSON.parse(JSON.stringify(initialTeams));
        teamsList.value = JSON.parse(JSON.stringify(initialTeams));
        
        // Re-enable the watch after a delay
        setTimeout(() => {
            updatingFlag.value = false;
        }, 0);
    } else {
        const updatingFlag = isUpdatingTeamsInternally;
        updatingFlag.value = true;
        formData.value.teams = [];
        teamsList.value = [];
        
        setTimeout(() => {
            updatingFlag.value = false;
        }, 0);
    }
};

const handleEventTypeChange = () => {
    // Reset team-related fields when switching to individual
    if (!formData.value.isTeamEvent) {
        formData.value.teams = [];
    }
};

// Computed
const submitButtonText = computed(() => {
    if (isSubmitting.value) return 'Saving...';
    if (props.eventId) return 'Update Event';
    return isAdmin.value ? 'Create Event' : 'Submit Request';
});

const filteredUsers = computed(() => {
    // Ensure users are loaded before attempting to filter
    if (!usersLoaded.value) return []; 

    const search = coOrganizerSearch.value.trim().toLowerCase();
    if (!search) return []; 
    
    const allUsers = store.getters['user/getAllUsers'] || [];
    const currentUserId = store.getters['user/userId']; 
    
    // Add logging to check data
    // console.log("All Users for filtering:", allUsers); 
    // console.log("Current User ID:", currentUserId);
    // console.log("Search Term:", search);

    return allUsers
        .filter(user => {
            if (!user || !user.uid) return false; // Basic check for valid user object

            if (user.uid === currentUserId || 
                formData.value.organizers.includes(user.uid) ||
                user.role === 'Admin') {
                return false;
            }
            
            const userName = (user.name || '').toLowerCase();
            const userUid = user.uid.toLowerCase(); 
            return userName.includes(search) || userUid.includes(search);
        })
        .slice(0, 10);
});

const addAllocation = () => {
    if (formData.value.xpAllocation.length >= 4) {
        alert('Maximum 4 criteria allowed');
        return;
    }
    
    const remainingXP = 50 - totalXP.value;
    if (remainingXP <= 0) {
        alert('Maximum total XP of 50 reached');
        return;
    }

    // Create a new array to avoid triggering the watcher during modification
    const newAllocations = [...formData.value.xpAllocation];
    newAllocations.push({
        constraintIndex: newAllocations.length,
        constraintLabel: '',
        role: 'fullstack', // Default role
        points: Math.min(10, remainingXP) // Default points or remaining XP
    });
    
    // Replace the entire array at once
    formData.value.xpAllocation = newAllocations;
};

const removeAllocation = (index: number) => {
    formData.value.xpAllocation.splice(index, 1);
    // Update constraint indices
    formData.value.xpAllocation.forEach((alloc, idx) => {
        alloc.constraintIndex = idx;
    });
};

const addCoOrganizer = (user: { uid: string }) => {
    if (!formData.value.organizers.includes(user.uid)) {
        formData.value.organizers.push(user.uid);
    }
    coOrganizerSearch.value = '';
    // Explicitly hide dropdown after selection
    showCoOrganizerDropdown.value = false; 
};

const removeCoOrganizer = (userId: string) => {
    const index = formData.value.organizers.indexOf(userId);
    if (index > -1) {
        formData.value.organizers.splice(index, 1);
    }
};

// Update handleSubmit to include client-side validation aligned with backend check
const handleSubmit = async () => {
    isSubmitting.value = true; // Set submitting flag early

    // --- Client-side Date Validation ---
    const startField = isAdmin.value ? 'startDate' : 'desiredStartDate';
    const endField = isAdmin.value ? 'endDate' : 'desiredEndDate';
    const proposedStartDateStr = formData.value[startField]; // Should be 'YYYY-MM-DD'
    const proposedEndDateStr = formData.value[endField];   // Should be 'YYYY-MM-DD'

    if (!proposedStartDateStr || !proposedEndDateStr) {
        alert('Please select both start and end dates.');
        isSubmitting.value = false;
        return;
    }

    // Convert YYYY-MM-DD string to Date objects representing start/end of day UTC for reliable comparison
    // Important: new Date('YYYY-MM-DD') can be timezone-dependent. Use UTC for consistency.
    const getStartOfDayUTC = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    };
    const getEndOfDayUTC = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    };

    let proposedStartUTC, proposedEndUTC;
    try {
        proposedStartUTC = getStartOfDayUTC(proposedStartDateStr);
        proposedEndUTC = getEndOfDayUTC(proposedEndDateStr); // Use end of the selected end day

        if (isNaN(proposedStartUTC.getTime()) || isNaN(proposedEndUTC.getTime())) {
            throw new Error("Invalid date format selected.");
        }
    } catch (e) {
        alert(e.message || "Invalid date format selected.");
        isSubmitting.value = false;
        return;
    }

    // Ensure end date is not before start date (day-based)
    if (proposedEndUTC < proposedStartUTC) {
         alert('End date cannot be before start date.');
         isSubmitting.value = false;
         return;
    }

    // --- Client-side Date Validation (Day-based UTC) ---
    const events = store.getters['events/getAllEvents'] || [];
    const existingEvents = events
        .filter(event =>
            ['Approved', 'InProgress'].includes(event.status) &&
            event.id !== props.eventId &&
            event.startDate && event.endDate // Ensure dates exist (should be Timestamps)
        )
        .map(event => {
            try {
                // Convert Firestore Timestamps to UTC Date objects for comparison
                const eventStartUTC = getStartOfDayUTC(event.startDate.toDate().toISOString().split('T')[0]);
                const eventEndUTC = getEndOfDayUTC(event.endDate.toDate().toISOString().split('T')[0]);

                if (isNaN(eventStartUTC.getTime()) || isNaN(eventEndUTC.getTime())) return null;

                return {
                    name: event.eventName,
                    start: eventStartUTC,
                    end: eventEndUTC
                };
            } catch (e) {
                console.warn(`Skipping event ${event.id} in client conflict check due to date issue:`, e);
                return null;
            }
        })
        .filter(Boolean);

    const checkOverlapDayBased = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
        // Check if day ranges overlap (inclusive)
        return start1 <= end2 && end1 >= start2;
    };

    const conflictingEvent = existingEvents.find(event =>
        checkOverlapDayBased(proposedStartUTC, proposedEndUTC, event.start, event.end)
    );

    if (conflictingEvent) {
        alert(`Date conflict detected with event "${conflictingEvent.name}" on the same day(s). Please choose different dates.`);
        isSubmitting.value = false;
        return;
    }
    // --- End Client-side Date Validation ---

    try {
        const baseEventData: Omit<EventCreateDTO, 'startDate' | 'endDate'> = {
            // ... other fields ...
            eventName: formData.value.eventName,
            eventType: formData.value.eventType,
            description: formData.value.description,
            isTeamEvent: formData.value.isTeamEvent,
            location: formData.value.location,
            organizers: formData.value.organizers,
            xpAllocation: formData.value.xpAllocation,
            teams: formData.value.teams
        };

        // For saving, use the start of the selected day (UTC or local based on backend needs)
        // Let's use the UTC start date objects we created for consistency
        if (isAdmin.value) {
            const adminEventData: EventCreateDTO = {
                ...baseEventData,
                startDate: proposedStartUTC, // Save start of day UTC
                endDate: proposedEndUTC      // Save end of day UTC (or start of next day depending on backend interpretation)
                                             // Using end of day UTC seems safer for inclusive checks
            };
            const newEventId = await store.dispatch('events/createEvent', adminEventData);
            emit('submit', adminEventData);
        } else {
            const userEventData: Omit<EventRequest, 'requestedAt'> = {
                ...baseEventData,
                desiredStartDate: Timestamp.fromDate(proposedStartUTC), // Convert UTC Date to Timestamp
                desiredEndDate: Timestamp.fromDate(proposedEndUTC),     // Convert UTC Date to Timestamp
                requester: store.getters['user/userId'],
                teams: []
            };
            await store.dispatch('events/requestEvent', userEventData);
            emit('submit', userEventData);
        }
    } catch (error) {
        console.error('Form submission error:', error);
        alert(error.message || 'Failed to submit form');
    } finally {
        isSubmitting.value = false;
    }
};

// Add new state for date availability
const nextAvailableDate = ref<Date | null>(null);
const isDateAvailable = ref(true);

// Add new methods for date handling
const formatDate = (date: Date): string => {
    if (!date) return '';
    return date.toLocaleDateString('en-CA'); // Use 'en-CA' for YYYY-MM-DD format, or adjust as needed
};

// Update checkNextAvailableDate to use the day-based check for consistency
const checkNextAvailableDate = async () => {
    const startField = isAdmin.value ? 'startDate' : 'desiredStartDate';
    const endField = isAdmin.value ? 'endDate' : 'desiredEndDate';
    const selectedStartDateStr = formData.value[startField];
    const selectedEndDateStr = formData.value[endField];

    if (!selectedStartDateStr) {
        nextAvailableDate.value = null;
        isDateAvailable.value = true;
        return;
    }

    const getStartOfDayUTC = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
    };
    const getEndOfDayUTC = (dateStr: string): Date => {
        const [year, month, day] = dateStr.split('-').map(Number);
        return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
    };

    const checkStartUTC = getStartOfDayUTC(selectedStartDateStr);
    // Use end date if available, otherwise assume single day event for check
    const checkEndUTC = selectedEndDateStr ? getEndOfDayUTC(selectedEndDateStr) : getEndOfDayUTC(selectedStartDateStr);

    if (isNaN(checkStartUTC.getTime()) || isNaN(checkEndUTC.getTime())) {
        isDateAvailable.value = false; // Mark as unavailable if dates are invalid
        nextAvailableDate.value = null;
        console.warn("Invalid date selected for checking.");
        return;
    }
     if (checkEndUTC < checkStartUTC) {
         isDateAvailable.value = false; // End date is before start date
         nextAvailableDate.value = null;
         console.warn("End date is before start date.");
         return;
     }

    const events = store.getters['events/getAllEvents'] || [];
    const existingEvents = events
        .filter(event =>
            ['Approved', 'InProgress'].includes(event.status) &&
            event.startDate && event.endDate
        )
        .map(event => {
             try {
                const eventStartUTC = getStartOfDayUTC(event.startDate.toDate().toISOString().split('T')[0]);
                const eventEndUTC = getEndOfDayUTC(event.endDate.toDate().toISOString().split('T')[0]);
                if (isNaN(eventStartUTC.getTime()) || isNaN(eventEndUTC.getTime())) return null;
                return { name: event.eventName, start: eventStartUTC, end: eventEndUTC };
            } catch { return null; }
        })
        .filter(Boolean);

    const checkOverlapDayBased = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
        return start1 <= end2 && end1 >= start2;
    };

    const conflictingEvent = existingEvents.find(event =>
        checkOverlapDayBased(checkStartUTC, checkEndUTC, event.start, event.end)
    );

    if (conflictingEvent) {
        isDateAvailable.value = false;
        nextAvailableDate.value = null; // Clear specific suggestion for now
        console.warn(`Selected date range conflicts with "${conflictingEvent.name}" on the same day(s).`);
    } else {
        isDateAvailable.value = true;
        nextAvailableDate.value = null; // No conflict, clear suggestion
    }
};

// Update findNextAvailableDate to suggest the next available *day* without recursive updates
const findNextAvailableDate = async () => {
    const events = store.getters['events/getAllEvents'] || [];
    const startField = isAdmin.value ? 'startDate' : 'desiredStartDate';
    const endField = isAdmin.value ? 'endDate' : 'desiredEndDate';

    // Start searching from tomorrow or day after current selection
    let searchDate = formData.value[startField]
        ? new Date(formData.value[startField] + 'T00:00:00Z') // Treat input as UTC start
        : new Date();
    searchDate.setUTCDate(searchDate.getUTCDate() + 1); // Start check from next day
    searchDate.setUTCHours(0, 0, 0, 0);

    const getStartOfDayUTC = (date: Date): Date => {
        const d = new Date(date);
        d.setUTCHours(0, 0, 0, 0);
        return d;
    };
     const getEndOfDayUTC = (date: Date): Date => {
        const d = new Date(date);
        d.setUTCHours(23, 59, 59, 999);
        return d;
    };

    const existingEvents = events
        .filter(event =>
            ['Approved', 'InProgress'].includes(event.status) &&
            event.startDate && event.endDate
        )
        .map(event => {
             try {
                const eventStartUTC = getStartOfDayUTC(event.startDate.toDate());
                const eventEndUTC = getEndOfDayUTC(event.endDate.toDate());
                if (isNaN(eventStartUTC.getTime()) || isNaN(eventEndUTC.getTime())) return null;
                return { start: eventStartUTC, end: eventEndUTC };
            } catch { return null; }
        })
        .filter(Boolean)
        .sort((a, b) => a.start.getTime() - b.start.getTime()); // Sort by start date

    const checkOverlapDayBased = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
        return start1 <= end2 && end1 >= start2;
    };

    let found = false;
    let attempts = 0; // Prevent infinite loop
    const maxAttempts = 365; // Search up to a year ahead

    while (!found && attempts < maxAttempts) {
        const checkStartUTC = getStartOfDayUTC(searchDate);
        const checkEndUTC = getEndOfDayUTC(searchDate); // Assume single day for finding next available start

        const isConflicting = existingEvents.some(event =>
            checkOverlapDayBased(checkStartUTC, checkEndUTC, event.start, event.end)
        );

        if (!isConflicting) {
            found = true;
            const nextAvailableDayStr = searchDate.toISOString().split('T')[0]; // Format as YYYY-MM-DD
            const endDate = new Date(searchDate);
            const endDateStr = endDate.toISOString().split('T')[0];

            // Store the found date object first
            nextAvailableDate.value = searchDate;
            isDateAvailable.value = true;
            
            // Update form fields in the next tick to avoid recursive updates
            nextTick(() => {
                // Update form fields without triggering the watcher
                formData.value[startField] = nextAvailableDayStr;
                formData.value[endField] = endDateStr;
                
                // Call checkNextAvailableDate in the next tick to avoid recursive updates
                nextTick(() => {
                    checkNextAvailableDate();
                });
            });
            break;
        }

        // Increment search date by one day (UTC)
        searchDate.setUTCDate(searchDate.getUTCDate() + 1);
        attempts++;
    }
     if (!found) {
         alert("Could not find an available date within the next year.");
     }
};

// Add computed for total XP
const totalXP = computed(() => {
    return formData.value.xpAllocation.reduce((sum, alloc) => sum + (Number(alloc.points) || 0), 0);
});

// Add validation for points
const validatePoints = (index: number) => {
    const alloc = formData.value.xpAllocation[index];
    const newTotal = totalXP.value;
    
    if (newTotal > 50) {
        const excess = newTotal - 50;
        alloc.points = Math.max(1, alloc.points - excess);
        alert('Total XP cannot exceed 50');
    }
};

// Add watch for points changes with improved handling to prevent recursive updates
watch(() => formData.value.xpAllocation, () => {
    // Create a local copy to avoid modifying during iteration
    const allocations = [...formData.value.xpAllocation];
    let needsUpdate = false;
    
    allocations.forEach((alloc, index) => {
        if (alloc.points) {
            const originalPoints = alloc.points;
            // Calculate max points without exceeding 50 total
            const otherPointsTotal = allocations.reduce((sum, a, i) => 
                i !== index ? sum + (Number(a.points) || 0) : sum, 0);
            const maxPoints = 50 - otherPointsTotal;
            
            // Adjust points if needed
            if (alloc.points > maxPoints) {
                alloc.points = maxPoints;
                needsUpdate = true;
            }
        }
    });
    
    // Only update if changes were made, and do it in the next tick
    if (needsUpdate) {
        nextTick(() => {
            formData.value.xpAllocation = [...allocations];
        });
    }
}, { deep: true });

// Initialize form with initial data if editing
watch(() => props.initialData, (newData) => {
    if (newData && Object.keys(newData).length > 0) {
        const dateFields = isAdmin.value ? ['startDate', 'endDate'] : ['desiredStartDate', 'desiredEndDate'];
        const dates = dateFields.reduce((acc, field) => {
            const date = newData[field]?.toDate?.();
            if (date) {
                acc[field] = date.toISOString().slice(0, 16); // Format for datetime-local input
            }
            return acc;
        }, {} as Record<string, string>);

        // Create a complete form data object with all required fields
        formData.value = {
            isTeamEvent: newData.isTeamEvent || false,
            eventType: newData.eventType || '',
            eventName: newData.eventName || '',
            description: newData.description || '',
            location: newData.location || '',
            organizers: newData.organizers || [],
            xpAllocation: newData.xpAllocation || [],
            teams: newData.teams || [],
            startDate: dates['startDate'] || '',
            endDate: dates['endDate'] || '',
            desiredStartDate: dates['desiredStartDate'] || '',
            desiredEndDate: dates['desiredEndDate'] || ''
        };
    }
}, { immediate: true });

// Load users for co-organizer selection
onMounted(async () => {
    // Fetch users if not already loaded
    const currentUsers = store.getters['user/getAllUsers'];
    if (!currentUsers || currentUsers.length === 0) { 
        try {
            console.log("Fetching users in onMounted..."); // Add log
            await store.dispatch('user/fetchAllUsers');
            usersLoaded.value = true; // Set flag after successful fetch
            console.log("Users fetched successfully."); // Add log
        } catch (error) {
            console.error("Failed to fetch users on mount:", error);
            // Handle error appropriately
        }
    } else {
        usersLoaded.value = true; // Users were already loaded
        console.log("Users already loaded in store."); // Add log
    }
});

// Add computed properties for team management
const availableStudents = computed(() => {
    const allUsers = store.getters['user/getAllUsers'] || [];
    const students = allUsers.filter(user => 
        (user.role === 'Student' || user.role === undefined)
    );
    return students;
});

const nameCache = computed(() => {
    const users = store.getters['user/getAllUsers'] || [];
    return Object.fromEntries(users.map(user => [user.uid, user.name || user.uid]));
});

// Add updateTeams method with improved handling to avoid circular updates
const updateTeams = (teams: any[]) => {
    // Skip if we're already updating teams internally
    if (isUpdatingTeamsInternally.value) return;
    
    // Set flag to prevent recursive updates
    const updatingFlag = isUpdatingTeamsInternally;
    updatingFlag.value = true;
    
    // Create deep copies to break references
    const teamsCopy = JSON.parse(JSON.stringify(teams));
    formData.value.teams = teamsCopy;
    teamsList.value = teamsCopy;
    
    // Reset flag after a delay
    setTimeout(() => {
        updatingFlag.value = false;
    }, 0);
};

// Fix window.setTimeout error by removing the reference
const hideCoOrganizerDropdown = () => {
    setTimeout(() => {
        showCoOrganizerDropdown.value = false;
    }, 200);
};

// Define state refs before they're used
const teamSearchQuery = ref('');
const teamsList = ref<EventTeam[]>([]);
// Flag to prevent recursive updates
const isUpdatingTeamsInternally = ref(false);

// Add this watch to ensure students are loaded properly
watch(() => formData.value.isTeamEvent, async (newVal) => {
    // Skip the watch if we're already updating teams internally
    if (isUpdatingTeamsInternally.value) return;
    
    // if (newVal) { // No longer needed here, onMounted handles initial fetch
    //     // Force refresh of students list when switching to team mode
    //     await store.dispatch('user/fetchAllUsers');
    // }
}, { immediate: true });

// Add getUserName method
const getUserName = (userId: string) => {
    // Ensure store and getter are available
    if (!store || !store.getters['user/getUserById']) {
        console.warn('Store or getUserById getter not available yet.');
        return userId; // Fallback
    }
    const user = store.getters['user/getUserById'](userId);
    return user?.name || userId; // Fallback to userId if name is missing
};

const usersLoaded = ref(false); // Add state to track user loading
</script>

<style>
/* Replace @apply with direct classes */
input[type="range"] {
  accent-color: var(--color-primary);
}

input[type="range"]::-webkit-slider-thumb {
  width: 1rem;
  height: 1rem;
  background-color: var(--color-primary);
  border-radius: 9999px;
  border: none;
  appearance: none;
  cursor: pointer;
}

input[type="range"]::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background-color: var(--color-primary);
  border-radius: 9999px;
  border: none;
  appearance: none;
  cursor: pointer;
}
</style>
