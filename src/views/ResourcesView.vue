<template>
    <div class="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6"> <!-- Container -->
        <h2 class="text-2xl font-bold text-gray-900 mb-6">Resources</h2>

        <!-- Empty State -->
        <div v-if="categories.length === 0" class="bg-blue-50 text-blue-700 p-4 rounded-md text-sm">
            No resources available at the moment.
        </div>

        <!-- Resource Categories Grid -->
        <div v-else class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"> 
            <div v-for="(category, index) in categories" :key="index">
                 <div class="bg-white shadow-md rounded-lg overflow-hidden flex flex-col h-full transition duration-200 ease-in-out hover:shadow-lg hover:-translate-y-1"> <!-- Card Styling -->
                    <div class="px-4 py-3 bg-gray-50 border-b border-gray-200">
                        <h3 class="text-base font-semibold text-gray-800">{{ category.title }}</h3>
                    </div>
                     <ul v-if="category.items && category.items.length > 0" 
                         class="divide-y divide-gray-100 flex-grow"> <!-- List Styling -->
                        <li v-for="(resource, rIndex) in category.items"
                            :key="rIndex"
                            class="px-4 py-3 group"> <!-- List Item with group for hover -->
                            <a :href="resource.content"
                               target="_blank"
                               rel="noopener noreferrer"
                               class="flex justify-between items-center text-sm text-gray-700 hover:text-blue-600">
                                <span class="flex items-center min-w-0"> <!-- Ensure text truncates if needed -->
                                    <i :class="['fas', getIconClass(resource.type), 'fa-fw w-4 mr-2 text-gray-400 flex-shrink-0']" :title="resource.type"></i>
                                    <span class="truncate">{{ resource.title }}</span>
                                </span>
                                <i class="fas fa-external-link-alt fa-xs text-gray-400 opacity-0 group-hover:opacity-60 transition-opacity duration-150"></i> 
                            </a>
                        </li>
                    </ul>
                     <div v-else class="p-4 text-sm text-gray-500 flex-grow">
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
            { title: "KSB GitHub Organization", type: "Link", content: "#" } // Example
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
