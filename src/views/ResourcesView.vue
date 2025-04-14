<template>
    <section class="py-5 resources-section">
        <div class="container-xxl">
            <h1 class="h1 text-primary mb-5">Resources</h1>

            <!-- Empty State -->
            <div v-if="categories.length === 0" class="alert alert-info" role="alert">
                <i class="fas fa-info-circle me-2"></i>
                No resources available at the moment.
            </div>

            <!-- Resource Categories Grid -->
            <div v-else class="row g-4">
                <div v-for="(category, index) in categories" :key="index" class="col-lg-4 col-md-6">
                    <div class="card resource-card h-100">
                        <div class="card-header resource-card-header">
                            <h6 class="card-title text-primary mb-0">{{ category.title }}</h6>
                        </div>
                        <div class="list-group list-group-flush">
                            <div v-if="category.items && category.items.length > 0">
                                <a 
                                    v-for="(resource, rIndex) in category.items" 
                                    :key="rIndex" 
                                    :href="resource.content"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="list-group-item list-group-item-action d-flex justify-content-between align-items-center resource-link"
                                >
                                    <span class="d-flex align-items-center" style="min-width: 0;">
                                        <i :class="['fas', getIconClass(resource.type), 'me-2', 'text-secondary']"></i>
                                        <span class="text-truncate">{{ resource.title }}</span>
                                    </span>
                                    <span class="external-link-icon text-secondary">
                                        <i class="fas fa-external-link-alt fa-sm"></i>
                                    </span>
                                </a>
                            </div>
                            <div v-else class="list-group-item">
                                <p class="p-0 m-0 text-secondary small">
                                    No items in this category.
                                </p>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref } from 'vue';

// Static predefined resources
const predefinedResources = ref([
    {
        title: "Getting Started",
        items: [
            { title: "Student Handbook", type: "Download", content: "#" }, 
            { title: "Code of Conduct", type: "Guide", content: "#" }
        ]
    },
    {
        title: "Development Tools",
        items: [
            { title: "Git Installation Guide", type: "Guide", content: "https://git-scm.com/downloads" },
            { title: "VS Code Editor", type: "Link", content: "https://code.visualstudio.com/" },
            { title: "Node.js Setup", type: "Guide", content: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs" }
        ]
    },
    {
        title: "Learning Materials",
        items: [
            { title: "JavaScript Fundamentals", type: "Link", content: "https://javascript.info/" },
            { title: "Vue.js Documentation", type: "Link", content: "https://vuejs.org/guide/introduction.html" },
            { title: "Web Development Roadmap", type: "Guide", content: "https://roadmap.sh/frontend" }
        ]
    },
     {
        title: "Community Links",
        items: [
            { title: "KSB GitHub Organization", type: "Link", content: "#" }
        ]
    }
]);

const categories = predefinedResources;

// Helper function for icons
const getIconClass = (type) => {
    switch (type) {
        case 'Download': return 'fa-download';
        case 'Guide': return 'fa-book';
        case 'Link': return 'fa-link';
        default: return 'fa-file';
    }
};
</script>

<style scoped>
.resources-section {
    background-color: var(--color-background);
}

.resource-card {
    transition: all 0.2s;
    background-color: var(--bs-card-bg);
    border: 1px solid var(--bs-border-color);
    box-shadow: 0 2px 3px rgba(10, 10, 10, 0.05);
}

.resource-card:hover {
    box-shadow: 0 8px 16px rgba(10, 10, 10, 0.1);
    transform: translateY(-2px);
}

.resource-card-header {
    background-color: var(--bs-tertiary-bg);
    border-bottom: 1px solid var(--bs-border-color);
}

.resource-link {
    color: var(--color-text-secondary);
    text-decoration: none;
}

.resource-link:hover {
    color: var(--color-primary);
}

.external-link-icon {
    opacity: 0;
    transition: opacity 0.15s;
}

.resource-link:hover .external-link-icon {
    opacity: 0.6;
}

[style*="min-width: 0"] {
    min-width: 0 !important;
}

</style>
