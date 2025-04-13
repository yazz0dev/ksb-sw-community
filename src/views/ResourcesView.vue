<template>
    <section class="section">
        <div class="container is-max-widescreen">
            <h2 class="title is-2 has-text-primary mb-6">Resources</h2>

            <!-- Empty State -->
            <div v-if="categories.length === 0" class="notification is-info is-light">
                <span class="icon mr-2"><i class="fas fa-info-circle"></i></span>
                No resources available at the moment.
            </div>

            <!-- Resource Categories Grid -->
            <div v-else class="columns is-multiline is-variable is-4">
                <div v-for="(category, index) in categories" :key="index" class="column is-one-third-desktop is-half-tablet">
                    <div class="card resource-card is-fullheight">
                        <header class="card-header" style="background-color: #fafafa;">
                            <p class="card-header-title has-text-primary is-size-6">{{ category.title }}</p>
                        </header>
                        <div class="card-content p-0">
                            <div v-if="category.items && category.items.length > 0">
                                <a 
                                    v-for="(resource, rIndex) in category.items" 
                                    :key="rIndex" 
                                    :href="resource.content"
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    class="list-item is-flex is-justify-content-space-between is-align-items-center p-3 has-text-grey resource-link"
                                >
                                    <span class="is-flex is-align-items-center" style="min-width: 0;">
                                        <span class="icon mr-2 has-text-grey-light"><i :class="['fas', getIconClass(resource.type)]"></i></span>
                                        <span class="is-truncated">{{ resource.title }}</span>
                                    </span>
                                    <span class="icon is-small has-text-grey-light external-link-icon">
                                        <i class="fas fa-external-link-alt"></i>
                                    </span>
                                </a>
                            </div>
                            <p v-else class="p-4 has-text-grey-light is-size-7">
                                No items in this category.
                            </p>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </section>
</template>

<script setup>
import { ref } from 'vue';
// Removed Chakra UI imports

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
.is-fullheight {
    height: 100%;
}
.resource-card {
    transition: all 0.2s;
}
.resource-card:hover {
    box-shadow: 0 8px 16px rgba(10, 10, 10, 0.1);
    transform: translateY(-2px);
}
.list-item + .list-item {
    border-top: 1px solid #ededed; /* Bulma list item separator */
}
.list-item:hover {
    background-color: #fafafa;
}
.resource-link {
    color: #7a7a7a; /* has-text-grey */
    text-decoration: none;
}
.resource-link:hover {
    color: var(--color-primary); /* Use your primary color */
}
.external-link-icon {
    opacity: 0;
    transition: opacity 0.15s;
}
.resource-link:hover .external-link-icon {
    opacity: 0.6;
}

/* Truncation helper */
.is-truncated {
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

.p-0 { padding: 0; }
.p-3 { padding: 0.75rem; }
.p-4 { padding: 1rem; }
.mb-6 { margin-bottom: 1.5rem; }
.mr-2 { margin-right: 0.5rem; }
</style>
