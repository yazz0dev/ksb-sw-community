<template>
    <section class="py-5 resources-section">
        <div class="container-xxl">
            <h1 class="h1 text-primary mb-4 mb-md-5">
                <i class="fas fa-book-open me-2"></i>Learning Resources
            </h1>

            <!-- Empty State -->
            <div v-if="categories.length === 0" class="alert alert-info" role="alert">
                <i class="fas fa-info-circle me-2"></i>
                No resources available at the moment.
            </div>

            <!-- Resource Categories Grid -->
            <div v-else class="row g-4">
                <div v-for="(category, index) in categories" :key="index" class="col-lg-4 col-md-6 resource-card-wrapper">
                    <div class="card resource-card h-100 shadow-sm animate-fade-in" :style="`animation-delay: ${index * 0.1}s`">
                        <div class="card-header resource-card-header">
                            <div class="d-flex align-items-center">
                                <i :class="getCategoryIcon(category.title)" class="me-2 text-primary category-icon"></i>
                                <h2 class="card-title h6 text-primary mb-0">{{ category.title }}</h2>
                            </div>
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
                                    <span class="d-flex align-items-center resource-title-wrapper">
                                        <span class="resource-icon-wrapper">
                                            <i :class="['fas', getIconClass(resource.type), 'resource-type-icon', `resource-type-${resource.type.toLowerCase()}`]"></i>
                                        </span>
                                        <span class="text-truncate resource-title">{{ resource.title }}</span>
                                    </span>
                                    <span class="external-link-icon">
                                        <i class="fas fa-external-link-alt fa-sm"></i>
                                    </span>
                                </a>
                            </div>
                            <div v-else class="list-group-item empty-category">
                                <p class="p-0 m-0 text-secondary small">
                                    <i class="fas fa-info-circle me-2"></i>
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

<script setup lang="ts">
import { ref } from 'vue';

interface ResourceItem {
    title: string;
    type: 'Download' | 'Guide' | 'Link';
    content: string;
}

interface ResourceCategory {
    title: string;
    items: ResourceItem[];
}

// Static predefined resources
const predefinedResources = ref<ResourceCategory[]>([
    {
        title: "Getting Started",
        items: [
            { title: "Student Handbook", type: "Download", content: "#" }, 
            { title: "Code of Conduct", type: "Guide", content: "#" },
            { title: "Project Submission Guidelines", type: "Guide", content: "#" }
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
        title: "Testing & DevOps",
        items: [
            { title: "Jest Testing Framework", type: "Link", content: "https://jestjs.io/" },
            { title: "GitHub Actions Guide", type: "Guide", content: "https://docs.github.com/en/actions" },
            { title: "Docker Essentials", type: "Link", content: "https://docs.docker.com/get-started/" }
        ]
    },
    {
        title: "Backend Development",
        items: [
            { title: "Node.js & Express Tutorial", type: "Link", content: "https://expressjs.com/en/starter/installing.html" },
            { title: "MongoDB University", type: "Link", content: "https://learn.mongodb.com/" },
            { title: "Firebase Tutorials", type: "Link", content: "https://firebase.google.com/docs/guides" }
        ]
    },
    {
        title: "Career Resources",
        items: [
            { title: "Tech Resume Templates", type: "Download", content: "#" },
            { title: "Technical Interview Handbook", type: "Link", content: "https://www.techinterviewhandbook.org/" },
            { title: "LeetCode Problem Solving", type: "Link", content: "https://leetcode.com/" }
        ]
    }
]);

const categories = predefinedResources;

// Type the helper function
const getIconClass = (type: ResourceItem['type']): string => {
    switch (type) {
        case 'Download': return 'fa-download';
        case 'Guide': return 'fa-book';
        case 'Link': return 'fa-link';
        default: return 'fa-file';
    }
};

// Get category icon based on title
const getCategoryIcon = (title: string): string => {
    switch (title) {
        case 'Getting Started': return 'fas fa-rocket';
        case 'Development Tools': return 'fas fa-tools';
        case 'Learning Materials': return 'fas fa-graduation-cap';
        case 'Testing & DevOps': return 'fas fa-vial';
        case 'Mobile Development': return 'fas fa-mobile-alt';
        case 'Backend Development': return 'fas fa-server';
        case 'Career Resources': return 'fas fa-briefcase';
        default: return 'fas fa-folder';
    }
};
</script>

<style scoped>
.resources-section {
    background-color: var(--bs-body-bg);
    min-height: calc(100vh - var(--navbar-height-mobile));
    padding: 2rem 0 4rem 0;
}

@media (min-width: 992px) {
    .resources-section {
        min-height: calc(100vh - var(--navbar-height-desktop));
    }
}

.resource-card-wrapper {
    transition: transform 0.3s ease;
}

.resource-card {
    transition: all 0.3s ease;
    background-color: var(--bs-card-bg);
    border: 1px solid var(--bs-border-color);
    border-radius: var(--bs-border-radius);
    box-shadow: var(--bs-box-shadow-sm);
    overflow: hidden;
}

.resource-card:hover {
    box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.15);
    transform: translateY(-3px);
}

.resource-card-header {
    background-color: rgba(var(--bs-primary-rgb), 0.05);
    border-bottom: 1px solid var(--bs-border-color);
    padding: 1rem 1.25rem;
}

.category-icon {
    font-size: 1.1rem;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
}

.resource-link {
    color: var(--bs-body-color);
    text-decoration: none;
    transition: all 0.2s ease;
    padding: 0.8rem 1.25rem;
    border-left: 3px solid transparent;
}

.resource-link:hover {
    color: var(--bs-primary);
    background-color: rgba(var(--bs-primary-rgb), 0.03);
    border-left: 3px solid var(--bs-primary);
}

.resource-title-wrapper {
    gap: 10px;
    min-width: 0;
    flex: 1;
}

.resource-icon-wrapper {
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 24px;
}

.resource-type-icon {
    color: var(--bs-secondary);
    transition: color 0.2s ease;
}

.resource-link:hover .resource-type-icon {
    color: var(--bs-primary);
}

.resource-type-download {
    color: var(--bs-success);
}

.resource-type-guide {
    color: var(--bs-info);
}

.resource-type-link {
    color: var(--bs-secondary);
}

.resource-title {
    font-weight: 500;
}

.external-link-icon {
    opacity: 0;
    transition: opacity 0.2s ease, transform 0.2s ease;
    color: var(--bs-secondary);
    margin-left: 8px;
}

.resource-link:hover .external-link-icon {
    opacity: 1;
    transform: translateX(2px);
    color: var(--bs-primary);
}

.empty-category {
    font-style: italic;
    background-color: rgba(var(--bs-secondary-rgb), 0.05);
}

/* Animation */
@keyframes fadeIn {
    from {
        opacity: 0;
        transform: translateY(20px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}

.animate-fade-in {
    animation: fadeIn 0.5s ease-out forwards;
    opacity: 0;
}

/* Responsive improvements */
@media (max-width: 767.98px) {
    .resource-card-header {
        padding: 0.75rem 1rem;
    }
    
    .resource-link {
        padding: 0.7rem 1rem;
    }
    
    .category-icon {
        font-size: 1rem;
    }
    
    .resource-title {
        font-size: 0.9rem;
    }
}
</style>
