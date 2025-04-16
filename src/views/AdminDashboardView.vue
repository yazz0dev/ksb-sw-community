<template>
  <section class="py-5 admin-dashboard-section" style="background-color: var(--bs-body-bg); min-height: calc(100vh - 8rem);">
    <div class="container-lg">
      <h1 class="h2 text-primary mb-4">Admin Dashboard</h1>
      <div v-if="loading" class="text-center py-5">
        <div class="spinner-border text-primary" role="status">
          <span class="visually-hidden">Loading...</span>
        </div>
        <p class="text-secondary mt-2">Loading dashboard...</p>
      </div>
      <div v-else>
        <!-- Stats Grid: 3 cards per row -->
        <div class="row g-4 mb-4">
          <div v-for="stat in stats" :key="stat.label" class="col-12 col-md-4">
            <div class="card shadow-sm text-center h-100 stat-card">
              <div class="card-body d-flex flex-column align-items-center justify-content-center py-4">
                <div :class="['fs-1 mb-2', stat.iconClass]"><i :class="stat.icon"></i></div>
                <div class="fw-bold fs-3 mb-1">{{ stat.value }}</div>
                <div class="small text-secondary">{{ stat.label }}</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Extra Stats: all in one horizontal row (3 cards) -->
        <div class="row g-4 mb-5">
          <div v-for="extra in extraStats" :key="extra.label" class="col-12 col-md-4">
            <div class="card shadow-sm text-center h-100 stat-card">
              <div class="card-body d-flex flex-column align-items-center justify-content-center py-4">
                <div :class="['fs-1 mb-2', extra.iconClass]"><i :class="extra.icon"></i></div>
                <div class="fw-bold fs-3 mb-1">{{ extra.value }}</div>
                <div class="small text-secondary">{{ extra.label }}</div>
              </div>
            </div>
          </div>
        </div>
        <!-- Quick Links -->
        <div class="mb-5">
          <div class="d-flex flex-wrap gap-3">
            <router-link to="/manage-requests" class="btn btn-outline-primary d-inline-flex align-items-center">
              <i class="fas fa-tasks me-2"></i> Manage Requests
            </router-link>
            <router-link to="/events" class="btn btn-outline-secondary d-inline-flex align-items-center">
              <i class="fas fa-calendar-alt me-2"></i> View All Events
            </router-link>
            <router-link to="/leaderboard" class="btn btn-outline-success d-inline-flex align-items-center">
              <i class="fas fa-users me-2"></i> View All Users
            </router-link>
          </div>
        </div>
        <!-- Three-column info grid -->
        <div class="row g-4">
          <!-- Recent Event Requests -->
          <div class="col-12 col-lg-4">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-primary-subtle">
                <h5 class="mb-0 text-primary-emphasis"><i class="fas fa-tasks me-2"></i>Recent Event Requests</h5>
              </div>
              <div class="card-body">
                <div v-if="recentRequests.length === 0" class="text-secondary small">No recent requests.</div>
                <ul class="list-group list-group-flush">
                  <li v-for="req in recentRequests" :key="req.id" class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <div class="fw-semibold">{{ req.eventName }}</div>
                      <div class="small text-secondary">{{ req.requesterName || 'Unknown' }}</div>
                    </div>
                    <span :class="['badge rounded-pill', getStatusClass(req.status)]">{{ req.status }}</span>
                  </li>
                </ul>
                <router-link to="/manage-requests" class="btn btn-link btn-sm mt-3 px-0">View All Requests</router-link>
              </div>
            </div>
          </div>
          <!-- Recent Completed Events -->
          <div class="col-12 col-lg-4">
            <div class="card shadow-sm h-100">
              <div class="card-header bg-info-subtle">
                <h5 class="mb-0 text-info-emphasis"><i class="fas fa-check-circle me-2"></i>Recent Completed Events</h5>
              </div>
              <div class="card-body">
                <div v-if="recentCompletedEvents.length === 0" class="text-secondary small">No completed events.</div>
                <ul class="list-group list-group-flush">
                  <li v-for="event in recentCompletedEvents" :key="event.id" class="list-group-item d-flex justify-content-between align-items-center">
                    <div>
                      <router-link :to="{ name: 'EventDetails', params: { id: event.id } }" class="fw-semibold text-decoration-underline-hover">
                        {{ event.eventName || event.name || 'Untitled Event' }}
                      </router-link>
                      <div class="small text-secondary">{{ formatDate(event.completedAt || event.endDate) }}</div>
                    </div>
                    <span class="badge bg-info-subtle text-info-emphasis">Completed</span>
                  </li>
                </ul>
                <router-link to="/events?filter=completed" class="btn btn-link btn-sm mt-3 px-0">View All Completed</router-link>
              </div>
            </div>
          </div>
          <!-- Placeholder for 3rd card in info grid -->
          <div class="col-12 col-lg-4">
            <div class="card shadow-sm h-100 d-flex align-items-center justify-content-center" style="min-height: 100%;">
              <div class="card-body text-center text-secondary py-5">
                <i class="fas fa-info-circle fa-2x mb-3"></i>
                <div class="fw-semibold mb-2">No additional info</div>
                <div class="small">Add more dashboard widgets here if needed.</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';

const store = useStore();

const loading = ref(true);

const pendingRequests = computed(() => store.getters['events/pendingEvents'] || []);
const allEvents = computed(() => store.getters['events/allEvents'] || []);
const allUsers = ref<any[]>([]);
const recentRequests = ref<any[]>([]);
const recentCompletedEvents = ref<any[]>([]);
const activeUsers = ref<any[]>([]);

// --- Students logic (matches LeaderboardView) ---
const students = computed(() => {
  return allUsers.value.filter((u: any) => (u.role || '').toLowerCase() === 'student');
});

// --- Stats: Order: Pending, Students, Active Events, Completed Events ---
const stats = computed(() => [
  {
    label: 'Pending Requests',
    value: pendingRequests.value.length,
    icon: 'fas fa-tasks',
    iconClass: 'text-primary'
  },
  {
    label: 'Students',
    value: students.value.length,
    icon: 'fas fa-user-graduate',
    iconClass: 'text-success'
  },
  {
    label: 'Active Events',
    value: allEvents.value.filter((e: any) => e.status === 'InProgress').length,
    icon: 'fas fa-bolt',
    iconClass: 'text-warning'
  },
  {
    label: 'Completed Events',
    value: allEvents.value.filter((e: any) => e.status === 'Completed').length,
    icon: 'fas fa-check-circle',
    iconClass: 'text-info'
  }
]);

const extraStats = computed(() => [
  {
    label: 'Total XP Awarded',
    value: totalXpAwarded.value,
    icon: 'fas fa-star',
    iconClass: 'text-warning'
  },
  {
    label: 'Total Events',
    value: allEvents.value.length,
    icon: 'fas fa-calendar-alt',
    iconClass: 'text-secondary'
  }
]);

const totalXpAwarded = computed(() => {
  return allUsers.value.reduce((sum, user) => {
    if (!user.xpByRole) return sum;
    return sum + Object.values(user.xpByRole).reduce((s: number, xp: any) => s + (Number(xp) || 0), 0);
  }, 0);
});

const getStatusClass = (status: string) => {
  switch (status) {
    case 'Pending': return 'bg-warning-subtle text-warning-emphasis';
    case 'Approved': return 'bg-success-subtle text-success-emphasis';
    case 'Rejected': return 'bg-danger-subtle text-danger-emphasis';
    default: return 'bg-secondary-subtle text-secondary-emphasis';
  }
};

function formatDate(date: any): string {
  if (!date) return '';
  try {
    const d = typeof date.toDate === 'function' ? date.toDate() : new Date(date);
    return d.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
}

onMounted(async () => {
  loading.value = true;
  // Fetch users (all for stats, last 5 active for active users)
  const usersQuery = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(200));
  const usersSnap = await getDocs(usersQuery);
  allUsers.value = [];
  const activeList: any[] = [];
  usersSnap.forEach(doc => {
    const data = doc.data();
    allUsers.value.push({ uid: doc.id, ...data });
    // Active = lastLogin within 7 days
    if (data.lastLogin) {
      const last = typeof data.lastLogin.toDate === 'function' ? data.lastLogin.toDate() : new Date(data.lastLogin);
      const now = new Date();
      const diff = (now.getTime() - last.getTime()) / (1000 * 60 * 60 * 24);
      if (diff <= 7) activeList.push({ uid: doc.id, ...data });
    }
  });
  // Sort active users by lastLogin desc
  activeList.sort((a, b) => {
    const aTime = a.lastLogin?.toDate ? a.lastLogin.toDate().getTime() : new Date(a.lastLogin).getTime();
    const bTime = b.lastLogin?.toDate ? b.lastLogin.toDate().getTime() : new Date(b.lastLogin).getTime();
    return bTime - aTime;
  });
  activeUsers.value = activeList.slice(0, 5);

  // Recent requests (pending, sorted by createdAt desc)
  recentRequests.value = [...pendingRequests.value]
    .sort((a, b) => {
      const aTime = a.createdAt?.seconds ?? 0;
      const bTime = b.createdAt?.seconds ?? 0;
      return bTime - aTime;
    })
    .slice(0, 5);

  // Recent completed events (last 5, sorted by completedAt/endDate desc)
  const completed = allEvents.value
    .filter((e: any) => e.status === 'Completed')
    .sort((a: any, b: any) => {
      const aTime = a.completedAt?.seconds ?? a.endDate?.seconds ?? 0;
      const bTime = b.completedAt?.seconds ?? b.endDate?.seconds ?? 0;
      return bTime - aTime;
    })
    .slice(0, 5);
  recentCompletedEvents.value = completed;

  loading.value = false;
});
</script>

<style scoped>
.admin-dashboard-section {
  background-color: var(--bs-body-bg);
}
.stat-card {
  border-radius: 1rem;
  min-height: 140px;
  transition: box-shadow 0.2s;
}
.stat-card:hover {
  box-shadow: 0 0.5rem 1.5rem rgba(0,0,0,0.08);
}
.card-header {
  border-top-left-radius: 1rem !important;
  border-top-right-radius: 1rem !important;
}
.card-body {
  min-height: 120px;
}
.fs-2, .fs-1 {
  font-size: 2.2rem !important;
}
.text-decoration-underline-hover:hover {
  text-decoration: underline;
}
@media (max-width: 767.98px) {
  .stat-card {
    min-height: 100px;
  }
}
</style>
