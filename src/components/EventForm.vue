<template>
    <form @submit.prevent="handleSubmit" class="space-y-6">
        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <h3 class="text-lg font-medium text-text-primary">Event Details</h3>
                
                <div class="space-y-2">
                    <label class="block text-sm font-medium text-text-secondary">Event Format <span class="text-error">*</span></label>
                    <div class="flex gap-4">
                        <label class="inline-flex items-center cursor-pointer">
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
                        <label class="inline-flex items-center cursor-pointer">
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

                <div>
                    <label for="eventName" class="block text-sm font-medium text-text-secondary">Event Name <span class="text-error">*</span></label>
                    <input
                        type="text"
                        id="eventName"
                        v-model="formData.eventName"
                        required
                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
                        :disabled="isSubmitting"
                    >
                </div>

                <div>
                    <label for="eventType" class="block text-sm font-medium text-text-secondary">Event Type <span class="text-error">*</span></label>
                    <select
                        id="eventType"
                        v-model="formData.eventType"
                        required
                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
                        :disabled="isSubmitting"
                        @change="handleEventTypeChange"
                    >
                        <option disabled value="">Select Type</option>
                        <option v-for="type in availableEventTypes"
                                :key="type"
                                :value="type">{{ type }}</option>
                    </select>
                </div>

                <div>
                    <label for="description" class="block text-sm font-medium text-text-secondary">Description <span class="text-error">*</span></label>
                    <textarea
                        id="description"
                        v-model="formData.description"
                        rows="4"
                        required
                        class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
                        :disabled="isSubmitting"
                    ></textarea>
                </div>

                <div v-if="formData.isTeamEvent" class="space-y-4 border-t border-border pt-4 mt-4">
                    <h4 class="text-md font-medium text-text-primary">Team Configuration</h4>

                    <ManageTeamsComponent
                        :initial-teams="formData.teams"
                        :students="availableStudents"
                        :name-cache="nameCache"
                        :is-submitting="isSubmitting"
                        :can-auto-generate="true"
                        :event-id="eventId || ''"
                        @update:teams="updateTeams"
                    />
                </div>
            </div>
        </div>

        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <h3 class="text-lg font-medium text-text-primary">Event Schedule</h3>

                <div class="grid grid-cols-1 gap-6 sm:grid-cols-2">
                    <div class="space-y-1">
                        <label :for="dateFields.startField" class="block text-sm font-medium text-text-secondary">
                            {{ isAdmin ? 'Start Date' : 'Desired Start Date' }} <span class="text-error">*</span>
                        </label>
                        <DatePicker
                            :id="dateFields.startField"
                            v-model="formData[dateFields.startField]"
                            :enable-time-picker="false"
                            :disabled="isSubmitting"
                            @update:model-value="checkNextAvailableDate"
                            model-type="yyyy-MM-dd"
                            :min-date="new Date()"
                            class="w-full"
                            :input-class-name="dpInputClass(!isDateAvailable)"
                            :auto-apply="true"
                            :teleport="true"
                            :clearable="false"
                            placeholder="Select start date"
                        />
                        <div v-if="formData[dateFields.startField]" class="text-xs flex items-center pt-1" :class="{'text-success': isDateAvailable, 'text-error': !isDateAvailable}">
                            <i class="fas mr-1" :class="{'fa-check-circle': isDateAvailable, 'fa-exclamation-circle': !isDateAvailable}"></i>
                            <span>{{ isDateAvailable ? 'Date available' : 'Date conflict detected' }}</span>
                        </div>
                    </div>

                    <div class="space-y-1">
                        <label :for="dateFields.endField" class="block text-sm font-medium text-text-secondary">
                            {{ isAdmin ? 'End Date' : 'Desired End Date' }} <span class="text-error">*</span>
                        </label>
                        <DatePicker
                            :id="dateFields.endField"
                            v-model="formData[dateFields.endField]"
                            :enable-time-picker="false"
                            :disabled="isSubmitting || !formData[dateFields.startField]"
                            @update:model-value="checkNextAvailableDate"
                            model-type="yyyy-MM-dd"
                            :min-date="formData[dateFields.startField] ? new Date(formData[dateFields.startField]) : new Date()"
                            class="w-full"
                            :input-class-name="dpInputClass(!isDateAvailable || !formData[dateFields.startField])"
                            :auto-apply="true"
                            :teleport="true"
                            :clearable="false"
                            placeholder="Select end date"
                        />
                    </div>
                </div>

                <div v-if="!isDateAvailable && nextAvailableDate" class="mt-4 p-4 bg-warning-light rounded-lg border border-warning">
                    <div class="flex items-start space-x-3">
                        <i class="fas fa-exclamation-triangle text-warning mt-1 flex-shrink-0"></i>
                        <div class="flex-1">
                            <p class="text-sm font-medium text-warning-dark">Date Conflict Detected</p>
                            <p class="text-sm text-text-secondary mt-1">
                                The selected dates conflict with another event.
                                Next available start date is <span class="font-semibold">{{ formatDate(nextAvailableDate) }}</span>.
                            </p>
                            <div class="mt-3">
                                <button
                                    type="button"
                                    @click="useNextAvailableDate"
                                    class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50"
                                    :disabled="isSubmitting"
                                >
                                    <i class="fas fa-calendar-check mr-1.5"></i>
                                    Use Next Available Date
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>

        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <div class="flex justify-between items-center mb-2">
                    <div>
                        <h3 class="text-lg font-medium text-text-primary">Rating Criteria & XP</h3>
                        <p class="text-sm text-text-secondary">Define how participants earn XP (Max 4 criteria, Total 50 XP).</p>
                    </div>
                    <button
                        type="button"
                        @click="addAllocation"
                        class="inline-flex items-center px-3 py-1.5 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        :disabled="isSubmitting || formData.xpAllocation.length >= 4 || totalXP >= 50"
                    >
                        <i class="fas fa-plus mr-1.5"></i> Add Criteria
                    </button>
                </div>

                <div class="text-sm font-medium text-text-secondary mb-4">
                    Total XP Allocated: <span class="font-bold text-text-primary">{{ totalXP }} / 50</span>
                    <div v-if="totalXP > 50" class="text-error text-xs mt-1">Total XP exceeds the maximum of 50. Please adjust.</div>
                </div>

                <div v-if="formData.xpAllocation.length > 0" class="space-y-4">
                    <div
                        v-for="(alloc, index) in formData.xpAllocation"
                        :key="`allocation-${index}`"
                        class="grid grid-cols-1 sm:grid-cols-3 gap-4 p-4 bg-background rounded-md border border-border relative"
                    >
                        <div class="sm:col-span-1">
                            <label :for="'criteria-'+index" class="block text-sm font-medium text-text-secondary">Criteria <span class="text-error">*</span></label>
                            <input
                                :id="'criteria-'+index"
                                type="text"
                                v-model="alloc.constraintLabel"
                                required
                                placeholder="e.g., Functionality"
                                class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
                                :disabled="isSubmitting"
                            >
                        </div>

                        <div class="sm:col-span-1">
                            <label :for="'role-'+index" class="block text-sm font-medium text-text-secondary">Role <span class="text-error">*</span></label>
                            <select
                                :id="'role-'+index"
                                v-model="alloc.role"
                                required
                                class="mt-1 block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
                                :disabled="isSubmitting"
                            >
                                <option value="fullstack">Fullstack</option>
                                <option value="presenter">Presenter</option>
                                <option value="designer">Designer</option>
                                <option value="problemSolver">Problem Solver</option>
                            </select>
                        </div>

                        <div class="sm:col-span-1">
                            <label :for="'points-'+index" class="block text-sm font-medium text-text-secondary">
                                XP Points: <span class="font-semibold">{{ alloc.points }}</span>
                            </label>
                            <input
                                :id="'points-'+index"
                                type="range"
                                v-model.number="alloc.points"
                                min="1"
                                :max="maxPointsForAllocation(index)"
                                step="1"
                                class="mt-1 w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer range-primary disabled:opacity-50"
                                :disabled="isSubmitting"
                                @input="handlePointsInput(index)"
                            >
                        </div>

                        <button
                            type="button"
                            @click="removeAllocation(index)"
                            class="absolute top-2 right-2 text-gray-400 hover:text-error transition-colors disabled:opacity-50"
                            :disabled="isSubmitting"
                            title="Remove Criteria"
                        >
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                </div>

                <p v-else class="text-sm text-text-secondary italic text-center py-4">
                    Click "Add Criteria" to define how participants will be evaluated and earn XP.
                </p>
            </div>
        </div>

        <div class="bg-surface rounded-lg shadow-sm border border-border overflow-hidden">
            <div class="px-4 py-5 sm:p-6 space-y-4">
                <h3 class="text-lg font-medium text-text-primary" v-html="coOrganizerSectionTitle"></h3>
                <p class="text-sm text-text-secondary">Add other users who can help manage this event.</p>

                <div class="relative">
                    <label for="coOrganizerSearch" class="sr-only">Search for co-organizers</label>
                    <input
                        id="coOrganizerSearch"
                        type="text"
                        v-model="coOrganizerSearch"
                        placeholder="Search users by name or ID..."
                        class="block w-full rounded-md border-border shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100"
                        :disabled="isSubmitting"
                        @focus="showCoOrganizerDropdown = true"
                        @blur="hideCoOrganizerDropdown"
                        @input="showCoOrganizerDropdown = true"
                        autocomplete="off"
                    >

                    <transition name="fade">
                        <div v-if="showCoOrganizerDropdown && filteredUsers.length > 0" class="absolute z-20 mt-1 w-full bg-surface shadow-lg max-h-60 rounded-md py-1 text-base ring-1 ring-black ring-opacity-5 overflow-auto focus:outline-none sm:text-sm">
                            <ul>
                                <li
                                    v-for="user in filteredUsers"
                                    :key="user.uid"
                                    class="cursor-pointer select-none relative py-2 px-3 text-text-primary hover:bg-primary-light hover:text-white"
                                    @mousedown.prevent="addCoOrganizer(user)"
                                >
                                    {{ user.name || 'Unnamed User' }}
                                </li>
                            </ul>
                        </div>
                        <div v-else-if="showCoOrganizerDropdown && coOrganizerSearch && filteredUsers.length === 0" class="absolute z-20 mt-1 w-full bg-surface shadow-lg rounded-md p-3 text-sm text-text-secondary ring-1 ring-black ring-opacity-5">
                            No matching users found.
                        </div>
                    </transition>
                </div>

                <div v-if="formData.organizers.length > 0" class="flex flex-wrap gap-2 pt-2">
                    <span
                        v-for="orgId in formData.organizers"
                        :key="orgId"
                        class="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-secondary text-secondary-text"
                    >
                        {{ getUserName(orgId) }}
                        <button
                            type="button"
                            @click="removeCoOrganizer(orgId)"
                            class="ml-1.5 flex-shrink-0 inline-flex items-center justify-center h-4 w-4 rounded-full text-secondary-text hover:bg-secondary-dark hover:text-white focus:outline-none focus:bg-secondary-dark disabled:opacity-50"
                            :disabled="isSubmitting"
                            :aria-label="`Remove ${getUserName(orgId)}`"
                        >
                            <span class="sr-only">Remove co-organizer</span>
                            <svg class="h-2 w-2" stroke="currentColor" fill="none" viewBox="0 0 8 8">
                                <path stroke-linecap="round" stroke-width="1.5" d="M1 1l6 6m0-6L1 7" />
                            </svg>
                        </button>
                    </span>
                </div>
                <p v-else class="text-sm text-text-secondary italic pt-2">
                    No co-organizers added yet.
                </p>
            </div>
        </div>

        <div class="flex justify-end pt-4">
            <button
                type="submit"
                class="inline-flex items-center justify-center px-6 py-2 text-sm font-medium rounded-md text-primary-text bg-primary hover:bg-primary-dark focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                :disabled="isSubmitting || !isFormValid || totalXP > 50"
            >
                <i v-if="isSubmitting" class="fas fa-spinner fa-spin mr-2"></i>
                <i v-else class="fas fa-paper-plane mr-2"></i>
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
import DatePicker from '@vuepic/vue-datepicker';
import '@vuepic/vue-datepicker/dist/main.css';

const getStartOfDayUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
};

const getEndOfDayUTC = (dateStr: string): Date => {
    const [year, month, day] = dateStr.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
};

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

const emit = defineEmits(['submit', 'error']);

const store = useStore();
const isSubmitting = ref(false);
const coOrganizerSearch = ref('');
const showCoOrganizerDropdown = ref(false);
const usersLoaded = ref(false);
const nextAvailableDate = ref<Date | null>(null);
const isDateAvailable = ref(true);
const teamsList = ref<EventTeam[]>([]);
const isUpdatingTeamsInternally = ref(false);

const isAdmin = computed(() => store.getters['user/getUserRole'] === 'Admin');

const defaultFormData: EventFormData = {
    isTeamEvent: false,
    eventType: '',
    eventName: '',
    description: '',
    startDate: '',
    endDate: '',
    desiredStartDate: '',
    desiredEndDate: '',
    location: '',
    organizers: [],
    xpAllocation: [{
        constraintIndex: 0,
        constraintLabel: 'Overall Quality',
        role: 'fullstack',
        points: 10
    }],
    teams: [],
};

const formData = ref<EventFormData>(JSON.parse(JSON.stringify(defaultFormData)));

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

const dpInputClass = (hasError: boolean) => {
    let base = 'dp-custom-input block w-full rounded-md shadow-sm focus:border-primary focus:ring focus:ring-primary focus:ring-opacity-50 disabled:bg-gray-100';
    return hasError ? `${base} border-error` : `${base} border-border`;
};

const handleFormatChange = () => {
    formData.value.eventType = '';
    if (formData.value.isTeamEvent) {
        formData.value.teams = [
            {
                teamName: 'Team 1',
                members: [],
                submissions: [],
                ratings: []
            },
            {
                teamName: 'Team 2',
                members: [],
                submissions: [],
                ratings: []
            }
        ];
    } else {
        formData.value.teams = [];
    }
};

const handleEventTypeChange = () => {
};

const submitButtonText = computed(() => {
    if (isSubmitting.value) return 'Saving...';
    if (props.eventId) return 'Update Event';
    return isAdmin.value ? 'Create Event' : 'Submit Request';
});

const isFormValid = computed(() => {
    const data = formData.value;
    const datesValid = !!data[dateFields.value.startField] && !!data[dateFields.value.endField];
    const xpValid = data.xpAllocation.every(a => a.constraintLabel && a.role && a.points > 0) && totalXP.value <= 50;
    const basicInfoValid = !!data.eventName && !!data.eventType && !!data.description;
    const teamsValid = data.isTeamEvent ? data.teams.length > 0 && data.teams.every(t => t.teamName) : true;
    
    // Add organizer validation for admins
    const organizersValid = !isAdmin.value || (Array.isArray(data.organizers) && data.organizers.length > 0);

    return datesValid && xpValid && basicInfoValid && teamsValid && isDateAvailable.value && organizersValid;
});

// Update co-organizers section UI to show required status for admins
const coOrganizerSectionTitle = computed(() => {
    return `Co-organizers ${isAdmin.value ? '<span class="text-error">*</span>' : '(Optional)'}`;
});

const filteredUsers = computed(() => {
    if (!usersLoaded.value) return [];
    const search = coOrganizerSearch.value.trim().toLowerCase();
    if (!search) return [];

    const allUsers = store.getters['user/getAllUsers'] || [];
    const currentUserId = store.getters['user/userId'];

    return allUsers
        .filter(user => {
            // Skip if user is invalid, current user, already an organizer, or is an admin
            if (!user?.uid || 
                user.uid === currentUserId || 
                formData.value.organizers.includes(user.uid) || 
                user.role === 'Admin') {
                return false;
            }
            const userName = (user.name || '').toLowerCase();
            return userName.includes(search);
        })
        .slice(0, 10);
});

const addAllocation = () => {
    if (formData.value.xpAllocation.length >= 4 || totalXP.value >= 50) return;

    const remainingXP = 50 - totalXP.value;
    const defaultPoints = Math.min(10, Math.max(1, remainingXP));

    formData.value.xpAllocation.push({
        constraintIndex: formData.value.xpAllocation.length,
        constraintLabel: '',
        role: 'fullstack',
        points: defaultPoints
    });
};

const removeAllocation = (index: number) => {
    formData.value.xpAllocation.splice(index, 1);
    formData.value.xpAllocation.forEach((alloc, idx) => {
        alloc.constraintIndex = idx;
    });
};

const addCoOrganizer = (user: { uid: string }) => {
    if (!formData.value.organizers.includes(user.uid)) {
        formData.value.organizers.push(user.uid);
    }
    coOrganizerSearch.value = '';
    showCoOrganizerDropdown.value = false;
};

const removeCoOrganizer = (userId: string) => {
    formData.value.organizers = formData.value.organizers.filter(id => id !== userId);
};

const handleSubmit = async () => {
    isSubmitting.value = true;
    emit('error', '');

    if (!isFormValid.value) {
        emit('error', 'Please fill all required fields correctly and ensure dates are available.');
        isSubmitting.value = false;
        return;
    }

    try {
        const { startField, endField } = dateFields.value;
        const proposedStartDateStr = formData.value[startField];
        const proposedEndDateStr = formData.value[endField];

        const proposedStartDate = getStartOfDayUTC(proposedStartDateStr);
        const proposedEndDate = getEndOfDayUTC(proposedEndDateStr);

        const payload: Partial<EventCreateDTO | EventRequest> = {
            eventName: formData.value.eventName,
            eventType: formData.value.eventType,
            description: formData.value.description,
            isTeamEvent: formData.value.isTeamEvent,
            location: formData.value.location,
            organizers: formData.value.organizers,
            xpAllocation: formData.value.xpAllocation.map(a => ({ ...a, points: Number(a.points) })),
            teams: formData.value.isTeamEvent ? formData.value.teams : [],
        };

        if (isAdmin.value) {
            (payload as EventCreateDTO).startDate = Timestamp.fromDate(proposedStartDate);
            (payload as EventCreateDTO).endDate = Timestamp.fromDate(proposedEndDate);
        } else {
            (payload as EventRequest).desiredStartDate = Timestamp.fromDate(proposedStartDate);
            (payload as EventRequest).desiredEndDate = Timestamp.fromDate(proposedEndDate);
            (payload as EventRequest).requester = store.getters['user/userId'];
        }

        emit('submit', payload);

    } catch (error: any) {
        console.error('Form submission error:', error);
        emit('error', error.message || 'Failed to prepare event data.');
    } finally {
    }
};

const formatDate = (date: Date | string | null): string => {
    if (!date) return '';
    try {
        const d = typeof date === 'string' ? new Date(date + 'T00:00:00Z') : date;
        return d.toLocaleDateString('en-CA');
    } catch (e) {
        console.warn("Error formatting date:", date, e);
        return '';
    }
};

const dateFields = computed(() => ({
    startField: isAdmin.value ? 'startDate' : 'desiredStartDate',
    endField: isAdmin.value ? 'endDate' : 'desiredEndDate'
}));

const useNextAvailableDate = () => {
    if (nextAvailableDate.value) {
        const { startField, endField } = dateFields.value;
        const startDateStr = formatDate(nextAvailableDate.value);
        formData.value[startField] = startDateStr;

        const originalStartStr = formData.value[startField];
        const originalEndStr = formData.value[endField];
        let endDate = new Date(nextAvailableDate.value);
        if (originalStartStr && originalEndStr) {
            try {
                const duration = getEndOfDayUTC(originalEndStr).getTime() - getStartOfDayUTC(originalStartStr).getTime();
                if (duration >= 0) {
                    endDate = new Date(nextAvailableDate.value.getTime() + duration);
                }
            } catch { }
        }
        formData.value[endField] = formatDate(endDate);

        checkNextAvailableDate();
    }
};

const checkNextAvailableDate = async () => {
    const { startField, endField } = dateFields.value;
    const selectedStartDateStr = formData.value[startField];
    const selectedEndDateStr = formData.value[endField];

    if (!selectedStartDateStr) {
        isDateAvailable.value = true;
        nextAvailableDate.value = null;
        return;
    }

    try {
        const checkStartDate = getStartOfDayUTC(selectedStartDateStr);
        const checkEndDate = selectedEndDateStr ? getEndOfDayUTC(selectedEndDateStr) : getEndOfDayUTC(selectedStartDateStr);

        // Use proper error handling for the date check response
        const dateCheck = await store.dispatch('events/checkDateConflict', {
            startDate: checkStartDate,
            endDate: checkEndDate,
            excludeEventId: props.eventId
        });

        // Handle the response properly
        if (dateCheck && typeof dateCheck.hasConflict === 'boolean') {
            isDateAvailable.value = !dateCheck.hasConflict;
            nextAvailableDate.value = dateCheck.hasConflict && dateCheck.nextAvailableDate ? 
                new Date(dateCheck.nextAvailableDate) : null;
                
            if (!isDateAvailable.value && nextAvailableDate.value) {
                const conflictEventName = dateCheck.conflictingEvent?.eventName || 'another event';
                emit('error', `Date conflict with ${conflictEventName}. Next available: ${formatDate(nextAvailableDate.value)}`);
            } else {
                emit('error', '');
            }
        } else {
            console.error('Invalid date check response:', dateCheck);
            throw new Error('Invalid date check response from server');
        }
    } catch (error) {
        console.error('Error checking date availability:', error);
        isDateAvailable.value = false;
        nextAvailableDate.value = null;
        emit('error', 'Could not verify date availability.');
    }
};

const totalXP = computed(() => {
    return formData.value.xpAllocation.reduce((sum, alloc) => sum + (Number(alloc.points) || 0), 0);
});

const maxPointsForAllocation = (index: number): number => {
    const currentPoints = Number(formData.value.xpAllocation[index]?.points) || 0;
    const otherPointsTotal = formData.value.xpAllocation.reduce((sum, alloc, i) => {
        return i !== index ? sum + (Number(alloc.points) || 0) : sum;
    }, 0);
    return Math.max(1, 50 - otherPointsTotal);
};

const handlePointsInput = (index: number) => {
};

watch(() => formData.value.xpAllocation, (newAllocations, oldAllocations) => {
    newAllocations.forEach(alloc => {
        alloc.points = Number(alloc.points) || 1;
    });

    let currentTotal = newAllocations.reduce((sum, alloc) => sum + alloc.points, 0);

    if (currentTotal > 50) {
        const lastChangedIndex = findLastChangedIndex(newAllocations, oldAllocations);
        if (lastChangedIndex !== -1) {
            const excess = currentTotal - 50;
            const currentPoints = newAllocations[lastChangedIndex].points;
            nextTick(() => {
                formData.value.xpAllocation[lastChangedIndex].points = Math.max(1, currentPoints - excess);
            });
        }
    }

    if (newAllocations.length !== oldAllocations?.length) {
        nextTick(() => {
             formData.value.xpAllocation.forEach((alloc, idx) => {
                 alloc.constraintIndex = idx;
             });
        });
    }

}, { deep: true });

const findLastChangedIndex = (newArr, oldArr) => {
    if (!oldArr || newArr.length !== oldArr.length) {
        return newArr.length - 1;
    }
    for (let i = newArr.length - 1; i >= 0; i--) {
        if (JSON.stringify(newArr[i]) !== JSON.stringify(oldArr[i])) {
            return i;
        }
    }
    return newArr.length - 1;
};

watch(() => props.initialData, (newData) => {
    if (newData && Object.keys(newData).length > 0 && !props.eventId) {
        return;
    }
    if (newData && Object.keys(newData).length > 0 && props.eventId) {
        const dataToLoad = JSON.parse(JSON.stringify(newData));

        const formatInitialDate = (dateInput: any): string => {
            if (!dateInput) return '';
            try {
                const date = dateInput.toDate ? dateInput.toDate() : new Date(dateInput);
                return formatDate(date);
            } catch {
                return '';
            }
        };

        formData.value = {
            ...defaultFormData,
            ...dataToLoad,
            startDate: formatInitialDate(dataToLoad.startDate),
            endDate: formatInitialDate(dataToLoad.endDate),
            desiredStartDate: formatInitialDate(dataToLoad.desiredStartDate),
            desiredEndDate: formatInitialDate(dataToLoad.desiredEndDate),
            xpAllocation: (dataToLoad.xpAllocation || []).map((a: any) => ({ ...a, points: Number(a.points) || 1 })),
            teams: Array.isArray(dataToLoad.teams) ? dataToLoad.teams : [],
        };

        nextTick(() => {
            checkNextAvailableDate();
        });
    } else {
        formData.value = JSON.parse(JSON.stringify(defaultFormData));
        isDateAvailable.value = true;
        nextAvailableDate.value = null;
    }
}, { immediate: true, deep: true });

onMounted(async () => {
    const currentUsers = store.getters['user/getAllUsers'];
    if (!currentUsers || currentUsers.length === 0) {
        try {
            await store.dispatch('user/fetchAllUsers');
            usersLoaded.value = true;
        } catch (error) {
            console.error("Failed to fetch users on mount:", error);
            emit('error', 'Failed to load user data for co-organizer selection.');
        }
    } else {
        usersLoaded.value = true;
    }
});

const availableStudents = computed(() => {
    const allUsers = store.getters['user/getAllUsers'] || [];
    return allUsers.filter(user =>
        user.role !== 'Admin' &&
        user.uid !== store.getters['user/userId'] &&
        !formData.value.organizers.includes(user.uid)
    );
});

const nameCache = computed(() => {
    const users = store.getters['user/getAllUsers'] || [];
    return Object.fromEntries(users.map(user => [user.uid, user.name || user.uid]));
});

const updateTeams = (teams: EventTeam[]) => {
    if (isUpdatingTeamsInternally.value) return;
    isUpdatingTeamsInternally.value = true;
    formData.value.teams = JSON.parse(JSON.stringify(teams));
    nextTick(() => {
        isUpdatingTeamsInternally.value = false;
    });
};

const hideCoOrganizerDropdown = () => {
    setTimeout(() => {
        showCoOrganizerDropdown.value = false;
    }, 200);
};

const getUserName = (userId: string): string => {
    return nameCache.value[userId] || userId;
};

</script>

<style>
.dp-custom-input {
    border: 1px solid var(--color-border);
    padding: 0.5rem 0.75rem;
    font-size: 0.875rem;
    line-height: 1.25rem;
    background-color: var(--color-surface);
    color: var(--color-text-primary);
    width: 100%;
    border-radius: 0.375rem;
}
.dp-custom-input:focus {
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px var(--color-primary-light-transparent);
    outline: none;
}
.dp-custom-input.border-error {
    border-color: var(--color-error);
}
.dp-custom-input::placeholder {
    color: var(--color-text-secondary);
    opacity: 0.7;
}

.range-primary {
  accent-color: var(--color-primary);
}

.range-primary::-webkit-slider-thumb {
  width: 1rem;
  height: 1rem;
  background-color: var(--color-primary);
  border-radius: 9999px;
  border: none;
  appearance: none;
  cursor: pointer;
  margin-top: -6px;
}

.range-primary::-moz-range-thumb {
  width: 1rem;
  height: 1rem;
  background-color: var(--color-primary);
  border-radius: 9999px;
  border: none;
  appearance: none;
  cursor: pointer;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.1s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
