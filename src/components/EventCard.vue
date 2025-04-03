//src/components/EventCard.vue 
//src/components/EventCard.vue
<template>
  <div class="card event-card h-100">
    <div class="card-body d-flex flex-column">
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h5 class="card-title mb-0 me-2">{{ event.eventName }}</h5>
        <span :class="['badge', statusBadgeClass, 'ms-auto']">{{ event.status }}</span>
      </div>
      <p class="card-text text-muted small mb-1">Type: {{ event.eventType }}</p>
      <p class="card-text small mb-2">
        <i class="far fa-calendar-alt me-1 text-muted"></i>
        {{ formatDate(event.startDate) }} - {{ formatDate(event.endDate) }}
      </p>
      <router-link :to="'/event/' + event.id" class="btn btn-primary btn-sm mt-auto stretched-link">
        View Details <i class="fas fa-arrow-right ms-1"></i>
      </router-link>
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
  computed: {
    statusBadgeClass() {
      switch (this.event.status) {
        case 'Approved':
        case 'Upcoming':
          return 'bg-info text-dark';
        case 'In Progress':
          return 'bg-success';
        case 'Completed':
          return 'bg-secondary';
        case 'Cancelled':
        case 'Rejected':
          return 'bg-danger';
        case 'Pending':
          return 'bg-warning text-dark';
        default:
          return 'bg-light text-dark';
      }
    },
  },
  methods: {
    formatDate(timestamp) {
      if (!timestamp?.seconds) {
        if (this.event.desiredStartDate?.seconds) {
             return new Date(this.event.desiredStartDate.seconds * 1000).toLocaleDateString();
        }
         return 'N/A';
      }
      return new Date(timestamp.seconds * 1000).toLocaleDateString();
    },
  }
};
</script>

<style scoped>
.event-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
}
.event-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15) !important;
}
.card-title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.badge {
    font-size: 0.75em;
}
.stretched-link::after {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    z-index: 1;
    content: "";
}
</style>