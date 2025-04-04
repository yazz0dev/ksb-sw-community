<template>
    <div class="container mt-4">
        <h2 class="mb-4">Leaderboard</h2>

        <div v-if="loading" class="text-center my-5">
            <div class="spinner-border text-primary" role="status">
                <span class="visually-hidden">Loading leaderboard...</span>
            </div>
        </div>
        <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else>
            <div class="table-responsive"> <!-- Added table-responsive wrapper -->
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th scope="col" class="text-center">Rank</th>
                            <th scope="col">User</th>
                            <th scope="col" class="text-center d-none d-md-table-cell">Skills</th> <!-- Hide on small screens -->
                            <th scope="col" class="text-center">Total XP</th>
                            <th scope="col" class="text-center d-none d-sm-table-cell">Profile</th> <!-- Hide on extra-small screens -->
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="(user, index) in leaderboard" :key="user.uid">
                            <td class="text-center fw-bold">{{ index + 1 }}</td>
                            <td>
                                <div class="d-flex align-items-center">
                                    <img :src="user.photoURL || defaultAvatarUrl"
                                         alt=""
                                         class="rounded-circle me-2" width="32" height="32"
                                         @error="handleImageError">
                                    <span class="fw-medium">{{ user.name }}</span>
                                </div>
                            </td>
                            <td class="text-center d-none d-md-table-cell"> <!-- Hide on small screens -->
                                <span v-if="user.skills?.length" class="badge bg-secondary me-1" v-for="skill in user.skills.slice(0, 2)" :key="skill">{{ skill }}</span>
                                <span v-if="!user.skills?.length" class="text-muted small">-</span>
                            </td>
                            <td class="text-center fw-bold text-primary">{{ user.totalXp }}</td>
                            <td class="text-center d-none d-sm-table-cell"> <!-- Hide on extra-small screens -->
                                <router-link :to="{ name: 'PublicProfile', params: { userId: user.uid } }" class="btn btn-sm btn-outline-primary">
                                    View
                                </router-link>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup>
// ... existing script ...
</script>

<style scoped>
/* Add padding for table cells on smaller screens if needed */
td, th {
    padding: var(--space-3) var(--space-2); /* Adjust padding */
}

@media (min-width: 576px) { /* sm breakpoint */
    td, th {
        padding: var(--space-3) var(--space-4); /* Restore default padding */
    }
}

/* Ensure images don't break layout */
img {
    object-fit: cover;
}
</style>