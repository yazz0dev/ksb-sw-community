<template>
    <div>
        <h2>Manage Resources</h2>
         <div v-if="message" :class="{'success': !isError, 'error': isError }">
                {{message}}
            </div>
        <form @submit.prevent="editingId ? updateResource() : addResource()">
            <div>
                <label>Title</label>
                <input type="text" v-model="currentResource.title" required>
            </div>
             <div>
                <label>Category:</label>
                <input type="text" v-model="currentResource.category" required />
              </div>
            <div>
                <label>Type</label>
                <select v-model="currentResource.type" required>
                    <option value="Download">Download</option>
                    <option value="Guide">Guide</option>
                    <option value="Link">Link</option>
                </select>
            </div>
            <div>
                <label>Content</label>
                <input type="text" v-model="currentResource.content" required>
            </div>
            <button type="submit">{{editingId ? 'Update Resource' : 'Add Resource'}}</button>
             <button type="button" @click="clearForm" v-if="editingId">Cancel</button>
        </form>

        <ul>
            <li v-for="resource in resources" :key="resource.id">
               {{ resource.title }} ({{ resource.category }}) - {{ resource.type }}
                <button @click="editResource(resource)">Edit</button>
                <button @click="deleteResource(resource.id)">Delete</button>
            </li>
        </ul>
    </div>
</template>

<script>
    import {computed, onMounted, ref} from 'vue';
    import {useStore} from 'vuex';
    export default {
        setup(){
            const store = useStore();
            const resources = computed(() => store.getters['resources/allResources']);
            const currentResource = ref({title: '', type: 'Download', content: '', category: ''});
            const editingId = ref(null); //resource id.
            const message = ref('');
            const isError = ref(false);

            onMounted(async () => {
                await store.dispatch('resources/fetchResources');
            });

            const addResource = async () => {
                message.value = ''; // Clear previous messages
                isError.value = false;
                try{
                    await store.dispatch('resources/addResource', currentResource.value);
                    message.value = 'Resource added successfully!';
                    clearForm();

                }catch(error){
                    message.value = error.message || 'Failed to add resource.';
                    isError.value = true;
                    console.error("Error: ", error);
                }
            }

            const editResource = (resource) => {
                //Populating form with resource
                currentResource.value = {...resource}; //copy data
                editingId.value = resource.id;
            }

            const updateResource = async () => {
                message.value = '';
                isError.value = false;
                try{
                    await store.dispatch('resources/updateResource', {id: editingId.value, resource: currentResource.value});
                    message.value = "Resource updated successfully!"
                    clearForm();
                }catch(error){
                    message.value = error.message || 'Failed to update resource.';
                    isError.value = true;
                    console.error("Error", error);
                }
            }

            const deleteResource = async (id) => {
                 message.value = '';
                isError.value = false;
                if(confirm('Are you sure?'))
                {
                    try{
                        await store.dispatch('resources/deleteResource', id);
                        message.value = 'Resource deleted successfully';
                    }catch(error){
                         message.value = error.message || 'Failed to delete resource.';
                        isError.value = true;
                        console.error("Error", error);
                    }
                }
            }

            const clearForm = () => {
                currentResource.value = { title: '', type: 'Download', content: '' }; // Reset
                editingId.value = null;
            };

            return {
                resources,
                addResource,
                currentResource,
                editingId,
                editResource,
                updateResource,
                deleteResource,
                clearForm,
                message,
                isError
            }
        }
    }
</script>

<style scoped>
    .success{
        color:green;
    }
    .error{
        color:red;
    }
</style>