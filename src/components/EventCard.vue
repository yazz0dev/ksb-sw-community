//src/components/EventCard.vue 
//src/components/EventCard.vue
<template>
  <div class="card event-card">
    <div class="card-body">
      <h5 class="card-title">{{ event.eventName }}</h5>
      <p class="card-text">Type: {{ event.eventType }}</p>
      <p class="card-text">
        Start Date:
        {{ event.startDate?.seconds ? new Date(event.startDate.seconds * 1000).toLocaleDateString() : 'N/A' }}
      </p>
      <p class="card-text">Status: {{ event.status }}</p>
      <router-link :to="'/event/' + event.id" class="btn btn-primary btn-sm">View Details</router-link>
    </div>
  </div>
</template>

<script>
export default {
  props: {
    event: {
      type: Object,
      required: true,
    },
  },
};
</script>