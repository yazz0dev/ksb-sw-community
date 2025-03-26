<template>
    <div class="container">
        <h2>Resources</h2>
        
        <div class="resource-categories">
            <div v-for="(category, index) in resources" :key="index" class="card mb-4">
                <div class="card-header">
                    <h3>{{ category.title }}</h3>
                </div>
                <ul class="list-group list-group-flush">
                    <li v-for="(resource, rIndex) in category.items" 
                        :key="rIndex" 
                        class="list-group-item">
                        <a :href="resource.content" 
                           target="_blank" 
                           rel="noopener noreferrer" 
                           class="text-decoration-none">
                            {{ resource.title }}
                            <span v-if="resource.type === 'Download'">
                                <i class="fas fa-download"></i>
                            </span>
                            <span v-if="resource.type === 'Guide'">
                                <i class="fas fa-book"></i>
                            </span>
                            <span v-if="resource.type === 'Link'">
                                <i class="fas fa-link"></i>
                            </span>
                        </a>
                    </li>
                </ul>
            </div>
        </div>
    </div>
</template>

<script>
import '@fortawesome/fontawesome-free/css/all.css';

const predefinedResources = [
    {
        title: "Getting Started",
        items: [
            {
                title: "Student Handbook",
                type: "Download",
                content: "https://example.com/handbook.pdf"
            },
            {
                title: "Code of Conduct",
                type: "Guide",
                content: "https://example.com/code-of-conduct"
            }
        ]
    },
    {
        title: "Development Tools",
        items: [
            {
                title: "Git Installation Guide",
                type: "Guide",
                content: "https://git-scm.com/downloads"
            },
            {
                title: "VS Code Editor",
                type: "Link",
                content: "https://code.visualstudio.com/"
            },
            {
                title: "Node.js Setup",
                type: "Guide",
                content: "https://nodejs.org/en/learn/getting-started/introduction-to-nodejs"
            }
        ]
    },
    {
        title: "Learning Materials",
        items: [
            {
                title: "JavaScript Fundamentals",
                type: "Link",
                content: "https://javascript.info/"
            },
            {
                title: "Vue.js Documentation",
                type: "Link",
                content: "https://vuejs.org/guide/introduction.html"
            },
            {
                title: "Web Development Roadmap",
                type: "Guide",
                content: "https://roadmap.sh/frontend"
            }
        ]
    }
];

export default {
    name: 'ResourcesView',
    setup() {
        return {
            resources: predefinedResources
        };
    }
};
</script>

<style scoped>
.resource-categories {
    max-width: 800px;
    margin: 0 auto;
}

.card-header h3 {
    margin: 0;
    font-size: 1.25rem;
}

.list-group-item a {
    color: var(--color-text);
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.list-group-item a:hover {
    color: var(--color-primary);
}

.list-group-item i {
    margin-left: 1rem;
    color: var(--color-text-secondary);
}
</style>