<template>
    <div>
      <h2>Resources</h2>
      <ul>
        <li v-for="resource in resources" :key="resource.id">
          <a :href="resource.type === 'Download' || resource.type === 'Link' ? resource.content : '#'" @click.prevent="handleResourceClick(resource)">
            {{ resource.title }} ({{ resource.category }})
              <!-- Show icon -->
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
  </template>
  
  <script>
  import { ref, onMounted } from 'vue';
  import { collection, getDocs } from 'firebase/firestore';
  import { db } from '../firebase';
   // Font Awesome (for icons)
  import '@fortawesome/fontawesome-free/css/all.css';
  
  export default {
    setup() {
      const resources = ref([]);
  
      onMounted(async () => {
        const querySnapshot = await getDocs(collection(db, 'resources'));
        resources.value = querySnapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data(),
        }));
      });
  
        const handleResourceClick = (resource) => {
          if (resource.type === 'Download' || resource.type === 'Link') {
            window.open(resource.content, '_blank'); // Open in a new tab/window
          }
        };
  
      return {
        resources,
          handleResourceClick
      };
    },
  };
  </script>