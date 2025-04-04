<template>
  <div v-if="event && event.id" class="card h-100 shadow-sm event-card">
    <div class="card-body p-3"> <!-- Adjusted padding -->
      <div class="d-flex justify-content-between align-items-start mb-2">
        <h5 class="card-title mb-0 me-2">{{ event.eventName }}</h5>
        <span class="badge rounded-pill" :class="statusBadgeClass">{{ event.status }}</span>
      </div>
      <p class="card-subtitle mb-2 text-muted small">
        <i class="fas fa-tag me-1"></i>{{ event.eventType }}
        <span class="mx-2">|</span>
        <i class="fas fa-calendar-alt me-1"></i>{{ formatDateRange(event.startDate, event.endDate) }}
      </p>
      <p class="card-text small mb-3">{{ truncatedDescription }}</p>
      <div class="d-flex justify-content-between align-items-center">
        <router-link :to="{ name: 'EventDetail', params: { eventId: event.id } }" class="btn btn-sm btn-primary">
          View Details
        </router-link>
        <span class="text-muted small">
          <i class="fas fa-users me-1"></i> {{ participantCount }}
        </span>
      </div>
    </div>
  </div>
</template>

<script setup>
// ... existing script ...
</script>

<style scoped>
.event-card {
  transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
  border: none; /* Rely on shadow */
}

.event-card:hover {
  transform: translateY(-3px);
  box-shadow: var(--shadow-md) !important; /* Use larger shadow from variables */
}

.card-title {
  font-size: 1.05rem; /* Slightly smaller title */
}

.card-text {
  font-size: 0.875rem; /* Ensure text isn't too large */
  color: var(--color-text-secondary);
}

/* Adjust padding for medium screens and up if needed */
@media (min-width: 768px) {
  .card-body {
    /* padding: var(--space-4); */ /* Optional: Increase padding on larger screens */
  }
  .card-title {
    font-size: 1.1rem; /* Slightly larger title on desktop */
  }
}

/* Status-specific styles */
.card-cancelled {
  opacity: 0.7;
  background-color: #f8f9fa; /* Lighter background for cancelled */
}
.card-cancelled .card-title {
  text-decoration: line-through;
}
</style>