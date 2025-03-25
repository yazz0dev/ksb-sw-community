<template>
  <div class="event-card">
    <h3>{{ event.eventName }}</h3>
    <p>Type: {{ event.eventType }}</p>
    <p>
      Start Date:
      {{
        new Date(event.startDate.seconds * 1000).toLocaleDateString()
      }}
    </p>
    <p>Status: {{ event.status }}</p>
    <router-link :to="'/event/' + event.id">View Details</router-link>
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

<style scoped>
.event-card {
  border: 1px solid #ccc;
  padding: 10px;
  margin-bottom: 10px;
}
</style>