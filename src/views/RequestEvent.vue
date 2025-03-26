// /src/views/RequestEvent.vue (Bootstrap styling, error handling, co-organizers, constraints)
<template>
    <div class="container">
      <h2>Request New Event</h2>
      <!-- Request Prevention Message -->
       <div v-if="hasActiveRequest && !loadingCheck" class="alert alert-warning" role="alert">
          You already have an active or pending event request. You cannot submit another until it is resolved.
      </div>
       <!-- General Error Message -->
      <div v-if="errorMessage" class="alert alert-danger" role="alert">{{ errorMessage }}</div>
       <!-- Loading Check Message -->
       <div v-if="loadingCheck">Checking existing requests...</div>

      <form @submit.prevent="submitRequest" v-if="!hasActiveRequest && !loadingCheck">
        <!-- Event Name -->
        <div class="mb-3">
          <label for="eventName" class="form-label">Event Name:</label>
          <input type="text" id="eventName" v-model="eventName" required class="form-control" />
        </div>
        <!-- Event Type -->
        <div class="mb-3">
            <label for="eventType" class="form-label">Event Type:</label>
            <select id="eventType" v-model="eventType" required class="form-select">
              <option value="Hackathon">Hackathon</option>
              <option value="Debate">Debate</option>
              <option value="Presentation">Presentation</option>
              <option value="Workshop">Workshop</option>
              <option value="Seminar">Seminar</option>
              <option value="Coding Competition">Coding Competition</option>
              <option value="Other">Other</option>
            </select>
          </div>
        <!-- Description -->
        <div class="mb-3">
          <label for="description" class="form-label">Description:</label>
          <textarea id="description" v-model="description" required class="form-control" rows="4"></textarea>
        </div>
        <!-- Dates -->
         <div class="row mb-3">
             <div class="col-md-6">
                 <label for="desiredStartDate" class="form-label">Desired Start Date:</label>
                 <input type="date" id="desiredStartDate" v-model="desiredStartDate" required class="form-control" :min="minDate"/>
             </div>
             <div class="col-md-6">
                 <label for="desiredEndDate" class="form-label">Desired End Date:</label>
                 <input type="date" id="desiredEndDate" v-model="desiredEndDate" required class="form-control" :min="desiredStartDate || minDate"/> <!-- Min end date is start date -->
             </div>
         </div>
        <!-- Team Event Checkbox -->
        <div class="mb-3 form-check">
          <input type="checkbox" id="isTeamEvent" v-model="isTeamEvent" class="form-check-input" />
          <label for="isTeamEvent" class="form-check-label">Is this a team event?</label>
        </div>

         <!-- Co-Organizers Selection (Optional) -->
         <div class="mb-3">
            <label for="coOrganizers" class="form-label">Add Co-Organizers (Optional):</label>
            <select id="coOrganizers" v-model="selectedCoOrganizers" multiple class="form-select" size="5">
                 <!-- Fetch Teachers/Admins dynamically -->
                <option v-for="user in potentialCoOrganizers" :key="user.uid" :value="user.uid">
                    {{ user.name }} ({{ user.role }})
                </option>
            </select>
             <small class="form-text text-muted">Hold Ctrl/Cmd to select multiple.</small>
         </div>

         <!-- Rating Constraints Definition (Simplified) -->
         <div class="mb-3 border p-3 rounded">
            <label class="form-label d-block mb-2">Define Rating Criteria (Max 5):</label>
            <small class="form-text text-muted d-block mb-3">Customize the labels for the 5 rating stars. Default: Design, Presentation, Problem Solving, Execution, Technology.</small>
            <input type="text" v-model="ratingConstraintsInput[0]" placeholder="Constraint 1 (e.g., Design)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[1]" placeholder="Constraint 2 (e.g., Presentation)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[2]" placeholder="Constraint 3 (e.g., Problem Solving)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[3]" placeholder="Constraint 4 (e.g., Execution)" class="form-control mb-2">
            <input type="text" v-model="ratingConstraintsInput[4]" placeholder="Constraint 5 (e.g., Technology)" class="form-control mb-2">
         </div>

        <button type="submit" class="btn btn-primary">Submit Request</button>
      </form>
    </div>
  </template>

<script>

import { computed, onMounted, ref } from 'vue'; // Ensure computed is imported
import { useStore } from 'vuex';
import { useRouter } from 'vue-router';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '../firebase';

export default {
  setup() {
    const store = useStore();
    const router = useRouter();

    // ... refs for form fields (eventName, eventType, etc.) ...
    const eventName = ref('');
    const eventType = ref('Hackathon');
    const description = ref('');
    const desiredStartDate = ref('');
    const desiredEndDate = ref('');
    const isTeamEvent = ref(false);
    const selectedCoOrganizers = ref([]);
    const potentialCoOrganizers = ref([]);
    const ratingConstraintsInput = ref(['', '', '', '', '']);
    const errorMessage = ref('');
    const hasActiveRequest = ref(false);
    const loadingCheck = ref(true);

    // --- ADDED: Check user role ---
    const currentUserRole = computed(() => store.getters['user/getUser']?.role);
    const isAdminOrTeacher = computed(() => currentUserRole.value === 'Admin' || currentUserRole.value === 'Teacher');
    // ---

    const minDate = computed(() => {
      const today = new Date();
      return today.toISOString().split('T')[0];
    });

    onMounted(async () => {
        loadingCheck.value = true;
        try {
            // Only check for existing *requests* if the user is NOT an admin/teacher
            if (!isAdminOrTeacher.value) {
                hasActiveRequest.value = await store.dispatch('events/checkExistingRequests');
            } else {
                 hasActiveRequest.value = false; // Admins/Teachers bypass this check
            }
        } catch (error) {
            console.error("Error checking existing requests:", error);
            errorMessage.value = "Could not verify existing requests. Please try again.";
        } finally {
            loadingCheck.value = false;
        }

        // Fetch potential co-organizers (Teachers/Admins)
        try {
            const q = query(collection(db, 'users'), where('role', 'in', ['Teacher', 'Admin']));
            const querySnapshot = await getDocs(q);
            const currentUserId = store.getters['user/getUser']?.uid;
            potentialCoOrganizers.value = querySnapshot.docs
                .map(doc => ({ uid: doc.id, ...doc.data() }))
                .filter(user => user.uid !== currentUserId); // Exclude self
        } catch (error) {
            console.error('Error fetching potential co-organizers:', error);
        }
    });


    const submitRequest = async () => {
        errorMessage.value = '';

        // --- Validation (keep existing validation) ---
        if (!eventName.value || !eventType.value || !description.value || !desiredStartDate.value || !desiredEndDate.value) {
            errorMessage.value = 'Please fill in all required fields.';
            return;
        }
        if (new Date(desiredStartDate.value) > new Date(desiredEndDate.value)) {
            errorMessage.value = 'End date cannot be earlier than the start date.';
            return;
        }
        const finalConstraints = ratingConstraintsInput.value.filter(c => c.trim() !== '').slice(0, 5);
         const defaultConstraints = ['Design', 'Presentation', 'Problem Solving', 'Execution', 'Technology'];
         if (finalConstraints.length === 0) {
            finalConstraints.push(...defaultConstraints);
         }
         while (finalConstraints.length < 5) {
             const nextDefault = defaultConstraints.find(def => !finalConstraints.includes(def));
             if(nextDefault) finalConstraints.push(nextDefault);
             else finalConstraints.push(`Constraint ${finalConstraints.length + 1}`);
         }
        // --- End Validation ---


        // --- Conditional Dispatch Logic ---
        try {
            if (isAdminOrTeacher.value) {
                // --- Auto-Approve: Call createEvent directly ---
                console.log("Admin/Teacher submitting - Auto-approving event.");
                const eventData = {
                    eventName: eventName.value,
                    eventType: eventType.value,
                    description: description.value,
                    startDate: desiredStartDate.value, // Pass as string or Date object
                    endDate: desiredEndDate.value,
                    isTeamEvent: isTeamEvent.value,
                    coOrganizers: selectedCoOrganizers.value,
                    ratingConstraints: finalConstraints,
                };
                await store.dispatch('events/createEvent', eventData);
                alert('Event created successfully (auto-approved).');
                router.push('/home'); // Redirect to home after creation

            } else {
                // --- Normal User: Call requestEvent ---
                 console.log("Student submitting - Creating event request.");
                 // Double-check active requests again just before submitting
                 const stillHasActive = await store.dispatch('events/checkExistingRequests');
                 if (stillHasActive) {
                      errorMessage.value = 'You already have an active or pending event request.';
                      return; // Prevent submission
                 }

                const requestData = {
                    eventName: eventName.value,
                    eventType: eventType.value,
                    description: description.value,
                    desiredStartDate: desiredStartDate.value,
                    desiredEndDate: desiredEndDate.value,
                    isTeamEvent: isTeamEvent.value,
                    coOrganizers: selectedCoOrganizers.value,
                    ratingConstraints: finalConstraints,
                };
                await store.dispatch('events/requestEvent', requestData);
                alert('Event request submitted successfully.');
                router.push('/profile'); // Go to profile to see the request list
            }
        } catch (error) {
            // Handle errors from both createEvent and requestEvent
            errorMessage.value = error.message || 'Failed to process event submission. Please try again.';
            console.error("Event submission error:", error);
        }
        // --- End Conditional Dispatch ---
    };

    // Return all refs and functions needed by the template
    return {
      eventName,
      eventType,
      description,
      desiredStartDate,
      desiredEndDate,
      isTeamEvent,
      selectedCoOrganizers,
      potentialCoOrganizers,
      ratingConstraintsInput,
      errorMessage,
      hasActiveRequest,
      loadingCheck,
      isAdminOrTeacher, // Expose for conditional UI if needed (though logic is in submit)
      minDate,
      submitRequest,
    };
  } // End setup
}
</script>


<style scoped>
/* Add specific styles if needed */
.form-select[multiple] {
    min-height: 100px; /* Make multi-select easier to use */
}
</style>