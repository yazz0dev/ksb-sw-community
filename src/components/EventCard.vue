//src/components/EventCard.vue 
<template>
  <div class="card mb-3">
    <div class="card-body">
      <h5 class="card-title">{{ event.eventName }}</h5>
      <p class="card-text">Type: {{ event.eventType }}</p>
      <p class="card-text">
        Start Date:
        {{ new Date(event.startDate.seconds * 1000).toLocaleDateString() }}
      </p>
      <p class="card-text">Status: {{ event.status }}</p>
      <router-link :to="'/event/' + event.id" class="btn btn-primary">View Details</router-link>
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