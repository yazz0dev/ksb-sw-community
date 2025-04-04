<template>
    <div class="container mt-4"> 
        <h2 class="mb-4">Resources</h2>

        <div v-if="categories.length === 0" class="alert alert-info">No resources available at the moment.</div>

        <div v-else class="resource-categories row g-4"> 
            <div v-for="(category, index) in categories" :key="index" class="col-md-6 col-lg-4"> <!-- Adjusted column classes -->
                 <div class="card h-100">
                    <div class="card-header">
                        <h3 class="mb-0">{{ category.title }}</h3>
                    </div>
                     <ul v-if="category.items && category.items.length > 0" class="list-group list-group-flush">
                        <li v-for="(resource, rIndex) in category.items"
                            :key="rIndex"
                            class="list-group-item">
                            <a :href="resource.content"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="d-flex justify-content-between align-items-center text-decoration-none">
                                <span>
                                    <i :class="['fas', getIconClass(resource.type), 'fa-fw me-2 text-muted']" :title="resource.type"></i>
                                    {{ resource.title }}
                                </span>
                                <i class="fas fa-external-link-alt fa-xs text-muted opacity-50"></i> 
                            </a>
                        </li>
                    </ul>
                     <div v-else class="card-body text-muted">
                         No items in this category.
                     </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup>
// Using setup script
import { ref } from 'vue'; // Import ref

// Static predefined resources
const predefinedResources = ref([ // Make it a ref
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
            // Add relevant community links if available
        ]
    }
]);

// Use the ref in the template
const categories = predefinedResources;

// Helper function for icons
const getIconClass = (type) => {
    switch (type) {
        case 'Download': return 'fa-download';
        case 'Guide': return 'fa-book';
        case 'Link': return 'fa-link';
        default: return 'fa-file-alt'; // Default icon
    }
};

</script>

<style scoped>
/* Styles from main.css (card, list-group) are used */
.card-header h3 { font-size: 1.15rem; } /* Slightly smaller header */
.list-group-item a { color: var(--color-text); }
.list-group-item a:hover { color: var(--color-primary); background-color: var(--color-background); }
.fa-xs { font-size: 0.75em; }
.opacity-50 { opacity: 0.5; }

.card {
    transition: transform 0.2s ease-in-out, box-shadow 0.2s ease-in-out;
    border: none;
}

.card:hover {
    transform: translateY(-3px);
    box-shadow: var(--shadow-md) !important;
}

.card-title {
    font-size: 1.05rem; /* Slightly smaller title */
}

.card-text {
    font-size: 0.875rem;
    color: var(--color-text-secondary);
}

/* Adjust padding for medium screens and up if needed */
@media (min-width: 768px) {
    .card-body {
        padding: var(--space-4); /* Restore larger padding on md+ */
    }
    .card-title {
        font-size: 1.1rem;
    }
}
</style>