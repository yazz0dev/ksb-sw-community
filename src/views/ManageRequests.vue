<template>
    <div class="container mt-4">
        <h2 class="mb-4">Manage Event Requests</h2>

        <div v-if="loading" class="text-center my-5">
            <!-- ... loading spinner ... -->
        </div>
        <div v-else-if="error" class="alert alert-danger">{{ error }}</div>
        <div v-else-if="requests.length === 0" class="alert alert-info">No pending event requests.</div>
        <div v-else>
            <div class="table-responsive"> <!-- Added table-responsive wrapper -->
                <table class="table table-hover align-middle">
                    <thead class="table-light">
                        <tr>
                            <th scope="col">Event Name</th>
                            <th scope="col" class="d-none d-lg-table-cell">Requester</th> <!-- Hide on medium/small -->
                            <th scope="col" class="d-none d-md-table-cell">Type</th> <!-- Hide on small -->
                            <th scope="col" class="d-none d-lg-table-cell">Desired Dates</th> <!-- Hide on medium/small -->
                            <th scope="col" class="text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr v-for="request in requests" :key="request.id">
                            <td>
                                <span class="fw-medium">{{ request.eventName }}</span>
                                <div class="small text-muted d-lg-none"> <!-- Show requester on small screens here -->
                                    Requested by: {{ request.requesterName || 'Loading...' }}
                                </div>
                            </td>
                            <td class="d-none d-lg-table-cell">{{ request.requesterName || 'Loading...' }}</td>
                            <td class="d-none d-md-table-cell">
                                <span :class="['badge', request.isTeamEvent ? 'bg-info' : 'bg-secondary']">
                                    {{ request.isTeamEvent ? 'Team' : 'Individual' }}
                                </span>
                                <span class="ms-1 d-lg-none">({{ request.eventType }})</span> <!-- Show category on medium -->
                            </td>
                            <td class="d-none d-lg-table-cell">{{ formatDateRange(request.desiredStartDate, request.desiredEndDate) }}</td>
                            <td class="text-center text-nowrap"> <!-- Prevent wrapping -->
                                <button @click="openReviewModal(request)" class="btn btn-sm btn-primary me-1" title="Review Details">
                                    <i class="fas fa-search"></i> <span class="d-none d-md-inline">Review</span>
                                </button>
                                <button @click="approveRequest(request.id)" class="btn btn-sm btn-success me-1" :disabled="isProcessing(request.id)" title="Approve">
                                    <span v-if="isProcessing(request.id) && processingAction === 'approve'" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <i v-else class="fas fa-check"></i> <span class="d-none d-xl-inline">Approve</span>
                                </button>
                                <button @click="openRejectModal(request)" class="btn btn-sm btn-danger" :disabled="isProcessing(request.id)" title="Reject">
                                     <span v-if="isProcessing(request.id) && processingAction === 'reject'" class="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                                    <i v-else class="fas fa-times"></i> <span class="d-none d-xl-inline">Reject</span>
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>

        <!-- Review Modal -->
        <!-- ... existing modal ... -->

        <!-- Reject Modal -->
        <!-- ... existing modal ... -->

    </div>
</template>

<script setup>
// ... existing script ...
</script>

<style scoped>
td, th {
    padding: var(--space-3) var(--space-2); /* Adjust padding */
    vertical-align: middle;
}

@media (min-width: 768px) { /* md breakpoint */
    td, th {
        padding: var(--space-3) var(--space-4); /* Restore default padding */
    }
}

/* Ensure buttons in actions column don't wrap excessively */
.table td:last-child,
.table th:last-child {
    white-space: nowrap;
}
</style>