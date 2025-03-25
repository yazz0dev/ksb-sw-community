// /src/views/EventDetails.vue (Modifications)
<template>
    <div v-if="loading">Loading...</div>
    <div v-else-if="event">
      <h2>{{ event.eventName }}</h2>
      <p>Type: {{ event.eventType }}</p>
      <p>Description: {{ event.description }}</p>
      <p>Start Date: {{ formatDate(event.startDate) }}</p>
      <p>End Date: {{ formatDate(event.endDate) }}</p>
      <p>Organizer: {{ event.organizer }}</p>
      <p>Status: {{ event.status }}</p>
        <!-- Ratings Open/Closed Indicator -->
      <p>Ratings: {{ event.ratingsOpen ? 'Open' : 'Closed' }}</p>

      <!-- Team List (Conditional) -->
        <div v-if="event.isTeamEvent && event.teams && event.teams.length > 0">
            <h3>Teams</h3>
            <TeamList :teams="event.teams" :eventId="id"/>
        </div>
        <div v-else-if="!event.isTeamEvent && event.participants && event.participants.length > 0">
            <h3>Participants</h3>
             <UserCard v-for="participantId in event.participants" :key="participantId" :userId="participantId" :eventId="id" />
        </div>
        <div v-else>
          <p>No teams assigned yet.</p>
        </div>
        <!--Manage team button-->
        <button v-if="isOrganizer || isAdmin" @click="goToManageTeams"  class="btn btn-primary">Manage Teams</button>

         <!-- Status Update Buttons (for Organizer and Admin) -->
        <div v-if="isOrganizer || isAdmin">
             <div v-if="event.status !== 'Completed' && event.status !== 'Cancelled'">
             <!-- Cancel Button -->
            <button v-if="event.status !== 'Cancelled'" @click="updateStatus('Cancelled')" class="btn btn-danger btn-sm">Cancel Event</button>
              <button v-if="event.status === 'Upcoming' || event.status === 'Approved'" @click="updateStatus('In Progress')" class="btn btn-info btn-sm">Mark as In Progress</button>
              <button v-if="event.status === 'In Progress'"  @click="updateStatus('Completed')" class="btn btn-success btn-sm">Mark as Completed</button>
            </div>

            <!-- Ratings Open/Close Toggle (for Organizer and Admin) -->
            <button v-if="event.status === 'Completed'" @click="toggleRatingsOpen(!event.ratingsOpen)" class="btn btn-secondary btn-sm">
              {{ event.ratingsOpen ? 'Close Ratings' : 'Open Ratings' }}
            </button>
             <!-- Calculate winner -->
            <button v-if="event.status === 'Completed'" @click="calculateWinners" class="btn btn-secondary btn-sm">
             Calculate Winners
            </button>
             <!-- Delete Button (for Organizer and Admin) -->
            <button @click="deleteEvent" class="btn btn-danger btn-sm">Delete Event</button>
        </div>

        <div v-if="event.status === 'Cancelled'">
            <p>This event is Cancelled.</p>
        </div>
        <div v-else-if="event.status === 'Completed'">
            <p>This event is completed.</p>
        </div>

        <!-- Winner Selection (for Organizer and teacher, after event is Completed) -->
      <div v-if="(isOrganizer || isAdmin) && event.status === 'Completed'">
        <h3>Select Winners</h3>
        <div v-if="event.isTeamEvent">
          <!-- Team Selection -->
          <div v-for="team in event.teams" :key="team.teamName" class="form-check">
            <input type="checkbox" :id="'team-' + team.teamName" :value="team.teamName" v-model="selectedWinners" class="form-check-input">
            <label :for="'team-' + team.teamName" class="form-check-label">{{ team.teamName }}</label>
          </div>
        </div>
        <div v-else>
          <!-- Individual Selection -->
           <div v-for="participant in event.participants" :key="participant" class="form-check">
            <input type="checkbox" :id="'user-' + participant" :value="participant" v-model="selectedWinners" class="form-check-input">
            <label :for="'user-' + participant" class="form-check-label">{{ participant }}</label> <!--  fetch and display the user's name -->
          </div>
        </div>
        <button @click="saveWinners" class="btn btn-primary btn-sm">Save Winners</button>
      </div>
      <div v-if="event.winners && event.winners.length > 0">
        <h3>Winners:</h3>
         <ul>
          <!-- display names of the winners -->
          <li>{{ event.winners.join(', ')}}</li>
        </ul>
      </div>

    </div>

    <div v-else>
      <p>Event not found.</p>
    </div>
  </template>

  <script>
  import { computed, onMounted, ref } from 'vue';
  import { useStore } from 'vuex';
  import {useRouter} from 'vue-router';
    import TeamList from '../components/TeamList.vue';
    import UserCard from '../components/UserCard.vue';

  export default {
      components:{
        TeamList,
        UserCard
      },
    props: {
      id: {
        type: String,
        required: true,
      },
    },
    setup(props) {
      const store = useStore();
      const loading = ref(true);
      const event = ref(null);
      const router = useRouter();
      const selectedWinners = ref([]); // Array to store selected winner UIDs (or team names)

     const isOrganizer = computed(() => {
        return store.getters['user/getUser'].uid === event.value?.organizer; //Use UID and namespaced getter
      });

      const isAdmin = computed(() => store.getters['user/getUser'].role === 'Admin');

      onMounted(async () => {
        const storedEvent = store.getters['events/getEventById'](props.id);  // Use namespaced getter
        if(storedEvent)
        {
            event.value = storedEvent;
            loading.value = false;
             // Initialize selectedWinners if there are already winners
            if (event.value.winners) {
              selectedWinners.value = [...event.value.winners];
            }
        }else{
            event.value = await store.dispatch('events/fetchEventDetails', props.id); //namespaced
            loading.value = false;
             // Initialize selectedWinners if there are already winners
            if (event.value && event.value.winners) {
              selectedWinners.value = [...event.value.winners];
            }
        }
      });

      const formatDate = (timestamp) => {
        if(timestamp && timestamp.seconds)
        {
            return new Date(timestamp.seconds * 1000).toLocaleDateString();
        }
        return '';

      };
        const goToManageTeams = () => {
          router.push(`/manage-teams/${props.id}`);
        };

        const updateStatus = async (newStatus) => {
          try {
            await store.dispatch('events/updateEventStatus', { eventId: props.id, newStatus });
             // Refresh the event data after updating the status
            event.value = await store.dispatch('events/fetchEventDetails', props.id);
          } catch (error) {
            console.error("Error updating status:", error);
            // Show error message to the user
          }
        };

        const saveWinners = async () => {
        try {
          await store.dispatch('events/setWinners', { eventId: props.id, winners: selectedWinners.value });
          // Optionally, refresh the event data or show a success message
           event.value = await store.dispatch('events/fetchEventDetails', props.id); //refresh
        } catch (error) {
          console.error("Error saving winners:", error);
          // Show error message to the user
        }
      };
        // NEW: Toggle ratings open/closed
      const toggleRatingsOpen = async (isOpen) => {
        try {
          await store.dispatch('events/toggleRatingsOpen', { eventId: props.id, isOpen });
          // Refresh event data to reflect the change
          event.value = await store.dispatch('events/fetchEventDetails', props.id);
        } catch (error) {
          console.error("Error toggling ratings:", error);
        }
      };
        const deleteEvent = async () => {
        if (confirm('Are you sure you want to delete this event? This action cannot be undone.')) {
          try {
            await store.dispatch('events/deleteEvent', props.id);
            router.push('/'); // Redirect to home page after deletion
          } catch (error) {
            console.error('Error deleting event:', error);
            // Display an error message to the user
          }
        }
      };
         const calculateWinners = async () => {
            try{
                await store.dispatch('events/calculateWinners', props.id);
                event.value = await store.dispatch('events/fetchEventDetails', props.id); //refresh
            }catch(error)
            {
                console.error("Error: ", error);
            }
        }

      return {
        event,
        loading,
        formatDate,
          isOrganizer,
          goToManageTeams,
          updateStatus, // Expose updateStatus
          isAdmin,    // Expose isAdmin
          selectedWinners, // Expose selectedWinners
          saveWinners,     // Expose saveWinners
          toggleRatingsOpen, // Expose the new action
          deleteEvent,
          calculateWinners

      };
    },
  };
  </script>