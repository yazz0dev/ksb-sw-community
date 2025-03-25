<template>
    <div>
      <h2>Transparency</h2>
      <div v-if="loading">Loading...</div>
      <div v-else-if="content" v-html="renderedMarkdown"></div>
      <div v-else>No transparency information found.</div>
    </div>
  </template>
  
  <script>
  import { ref, onMounted, computed } from 'vue';
  import { doc, getDoc } from 'firebase/firestore';
  import { db } from '../firebase';
  import { marked } from 'marked'; // Import the marked library
  
  export default {
    setup() {
      const loading = ref(true);
      const content = ref('');
  
      onMounted(async () => {
        const docRef = doc(db, 'transparency', 'community-guidelines');
        const docSnap = await getDoc(docRef);
  
        if (docSnap.exists()) {
          content.value = docSnap.data().content;
        }
        loading.value = false;
      });
  
      // Use computed property to render Markdown to HTML
      const renderedMarkdown = computed(() => {
        return marked(content.value);
      });
  
      return {
        loading,
        renderedMarkdown,
      };
    },
  };
  </script>