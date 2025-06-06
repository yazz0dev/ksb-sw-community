<template>
  <div v-if="events.length > 0" class="section-card shadow-sm rounded-4 animate-fade-in">
    <!-- Header -->
    <div class="section-header bg-primary-subtle text-primary-emphasis rounded-top-4 p-4 border-bottom">
      <div class="d-flex align-items-center justify-content-between">
        <div class="header-content d-flex align-items-center">
          <div class="header-icon me-3">
            <i class="fas fa-history fa-lg"></i>
          </div>
          <div>
            <h5 class="section-title mb-1 fw-semibold">Event History</h5>
            <p class="section-subtitle text-muted small mb-0">{{ events.length }} event{{ events.length === 1 ? '' : 's' }} participated</p>
          </div>
        </div>
        <div class="header-badge">
          <span class="badge bg-primary text-white rounded-pill px-3 py-2">
            {{ events.length }}
          </span>
        </div>
      </div>
    </div>

    <!-- Loading State -->
    <div v-if="loading" class="loading-section p-4 text-center">
      <div class="d-flex align-items-center justify-content-center">
        <div class="spinner-border spinner-border-sm text-primary me-2" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <span class="text-secondary">Loading event details...</span>
      </div>
    </div>

    <!-- Events List -->
    <div v-else class="events-list">
      <div
        v-for="(eventItem, index) in sortedEvents"
        :key="eventItem.eventId || index" 
        class="event-item"
        :class="{ 'border-bottom': index < sortedEvents.length - 1 }"
      >
        <!-- Event Header -->
        <div class="event-header mb-3">
          <div class="event-title-section">
            <div class="d-flex align-items-center mb-2">
              <div class="event-icon me-3">
                <i class="fas fa-calendar-alt text-primary"></i>
              </div>
              <div class="event-title-container flex-grow-1">
                <router-link
                  v-if="eventItem.eventId"
                  :to="`/event/${eventItem.eventId}`" 
                  class="event-title text-decoration-none fw-semibold text-dark hover-primary"
                >
                  {{ eventItem.eventName || 'Unnamed Event' }}
                </router-link>
                <span 
                  v-else 
                  class="event-title fw-semibold text-dark"
                >
                  {{ eventItem.eventName || 'Unnamed Event' }}
                </span>
              </div>
            </div>
          </div>
          
          <!-- Event Meta Info -->
          <div class="event-meta d-flex flex-wrap align-items-center gap-2">
            <!-- Event Format -->
            <span 
              v-if="eventItem.eventFormat" 
              class="meta-badge badge bg-secondary-subtle text-secondary-emphasis rounded-pill"
            >
              <i class="fas fa-users me-1"></i>{{ formatEventFormat(eventItem.eventFormat) }}
            </span>
            
            <!-- Organizer Badge -->
            <span
              v-if="isOrganizer(eventItem)"
              class="organizer-badge badge bg-success-subtle text-success-emphasis rounded-pill"
            >
              <i class="fas fa-crown me-1"></i>Organizer
            </span>
            
            <!-- Event Date -->
            <span class="date-badge badge bg-light text-dark border rounded-pill">
              <i class="fas fa-clock me-1"></i>{{ formatISTDate(eventItem.date?.start) }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>

  <!-- Empty State -->
  <div v-else-if="!loading" class="section-card shadow-sm rounded-4 animate-fade-in">
    <div class="empty-state text-center p-5">
      <div class="empty-icon mb-4">
        <i class="fas fa-calendar-times fa-3x text-muted opacity-50"></i>
      </div>
      <h6 class="empty-title text-secondary fw-semibold mb-2">No Event History</h6>
      <p class="empty-description text-muted mb-0">This user hasn't participated in any events yet.</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { formatISTDate } from '@/utils/dateTime';
import { EventFormat } from '@/types/event';
import { type StudentEventHistoryItem } from '@/types/student';

interface Props {
  events: StudentEventHistoryItem[];
  loading: boolean;
}

const props = defineProps<Props>();

const sortedEvents = computed(() => {
  return [...props.events].sort((a, b) => {
    const timeA = a.date?.start?.toMillis() ?? 0;
    const timeB = b.date?.start?.toMillis() ?? 0;
    return timeB - timeA; // Most recent first
  });
});

const isOrganizer = (eventItem: StudentEventHistoryItem): boolean => {
  return eventItem.roleInEvent === 'organizer';
};

const formatEventFormat = (format: EventFormat | undefined): string => {
  if (!format) return '';
  if (format === EventFormat.Team) return 'Team Event';
  if (format === EventFormat.Individual) return 'Individual Event';
  if (format === EventFormat.Competition) return 'Competition';
  return format;
};
</script>

<style scoped>
/* Section Header */
.section-header {
  border-bottom: 1px solid var(--bs-border-color-translucent);
}

.header-icon {
  width: 3rem;
  height: 3rem;
  border-radius: 50%;
  background: rgba(var(--bs-primary-rgb), 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
}

.section-title {
  font-size: 1.25rem;
  color: var(--bs-primary-emphasis);
}

.section-subtitle {
  color: var(--bs-secondary);
}

.header-badge .badge {
  font-size: 0.875rem;
  font-weight: 600;
}

/* Loading Section */
.loading-section {
  background: var(--bs-light);
  border-radius: 0 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg);
}

/* Events List */
.events-list {
  padding: 0;
}

.event-item {
  padding: 1.5rem;
  transition: background-color 0.3s ease;
  position: relative;
}

.event-item:hover {
  background-color: var(--bs-light);
}

.event-item:last-child {
  border-radius: 0 0 var(--bs-border-radius-lg) var(--bs-border-radius-lg);
}

/* Event Header */
.event-icon {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 50%;
  background: var(--bs-primary-subtle);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.event-title {
  font-size: 1.1rem;
  line-height: 1.4;
  transition: color 0.3s ease;
}

.event-title.hover-primary:hover {
  color: var(--bs-primary) !important;
}

/* Event Meta */
.event-meta {
  margin-left: 3.5rem;
}

.meta-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 500;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 500;
}

.organizer-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 600;
  border: 1px solid var(--bs-success);
}

.date-badge {
  font-size: 0.75rem;
  padding: 0.35rem 0.65rem;
  font-weight: 500;
  border: 1px solid var(--bs-border-color) !important;
}

/* Empty State */
.empty-state {
  background: linear-gradient(135deg, var(--bs-light), rgba(var(--bs-primary-rgb), 0.05));
}

.empty-icon {
  opacity: 0.6;
}

.empty-title {
  font-size: 1.1rem;
}

.empty-description {
  font-size: 0.95rem;
  line-height: 1.5;
}

/* Responsive Design */
@media (max-width: 768px) {
  .section-header {
    padding: 1rem !important;
  }
  
  .header-content {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .header-icon {
    width: 2.5rem;
    height: 2.5rem;
    margin-right: 0.75rem !important;
  }
  
  .section-title {
    font-size: 1.1rem;
  }
  
  .event-item {
    padding: 1rem;
  }
  
  .event-icon {
    width: 2rem;
    height: 2rem;
    margin-right: 0.75rem !important;
  }
  
  .event-title {
    font-size: 1rem;
  }
  
  .event-meta {
    margin-left: 2.75rem;
    gap: 0.25rem !important;
  }
  
  .meta-badge,
  .status-badge,
  .organizer-badge,
  .date-badge {
    font-size: 0.7rem;
    padding: 0.25rem 0.5rem;
  }
}

@media (max-width: 480px) {
  .section-header .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 1rem;
  }
  
  .header-badge {
    align-self: flex-end;
  }
  
  .event-item {
    padding: 0.75rem;
  }
  
  .event-header .d-flex {
    flex-direction: column;
    align-items: flex-start !important;
    gap: 0.5rem;
  }
  
  .event-icon {
    margin-right: 0 !important;
  }
  
  .event-meta {
    margin-left: 0;
    width: 100%;
  }
  
  .event-meta .badge {
    flex: 1;
    text-align: center;
    min-width: auto;
  }
  
  .empty-state {
    padding: 2rem !important;
  }
  
  .empty-icon .fa-3x {
    font-size: 2rem !important;
  }
}
</style>
