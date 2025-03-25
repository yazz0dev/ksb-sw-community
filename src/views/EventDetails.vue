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

      <!-- Team List -->
        <div v-if="event.teams && event.teams.length > 0">
            <h3>Teams</h3>
            <TeamList :teams="event.teams" :eventId="id"/>
        </div>
        <div v-else>
          <p>No teams assigned yet.</p>
        </div>
        <!--Manage team button-->
        <button v-if="isOrganizer" @click="goToManageTeams">Manage Teams</button>
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

  export default {
      components:{
        TeamList
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

     const isOrganizer = computed(() => {
        return store.getters.getUser.registerNumber === event.value?.organizer;
      });


      onMounted(async () => {
          //fetch from store if available.
        const storedEvent = store.getters.getEventById(props.id);
        if(storedEvent)
        {
            event.value = storedEvent;
            loading.value = false;
        }else{
            //fetch from firebase
            event.value = await store.dispatch('fetchEventDetails', props.id);
            loading.value = false;
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

      return {
        event,
        loading,
        formatDate,
          isOrganizer,
          goToManageTeams
      };
    },
  };
  </script>