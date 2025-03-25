<template>
    <div>
      <h2>Manage Transparency Content</h2>
       <div v-if="message" :class="{'success': !isError, 'error': isError }">
                  {{message}}
              </div>
      <form @submit.prevent="updateContent">
        <textarea v-model="content" rows="10" cols="50"></textarea>
        <button type="submit">Update Content</button>
      </form>
    </div>
  </template>
  
  <script>
  import { computed, onMounted, ref } from 'vue';
  import { useStore } from 'vuex';
  
  export default {
    setup() {
      const store = useStore();
      const content = computed(() => store.getters['transparency/getTransparencyContent']); // Use namespaced getter
       const message = ref('');
       const isError = ref(false);
      onMounted(async () => {
        await store.dispatch('transparency/fetchTransparencyContent'); // Use namespaced action
      });
  
      const updateContent = async () => {
          message.value = '';
          isError.value = false;
        try {
          await store.dispatch('transparency/updateTransparencyContent', content.value); // Use namespaced action
          message.value = 'Content updated successfully!';
        } catch (error) {
          message.value = error.message || 'Failed to update content';
          isError.value = true;
          console.error('Error updating content:', error);
  
        }
      };
  
      return {
        content,
        updateContent,
        message,
        isError
      };
    },
  };
  </script>
  <style scoped>
      .success{
          color:green;
      }
      .error{
          color:red;
      }
  </style>