<template>
    <div class="star-rating">
        <div class="stars">
            <button 
                v-for="n in 5" 
                :key="n"
                type="button"
                @click="updateRating(n)"
                :class="['star-btn', { active: n <= modelValue }]"
                :disabled="disabled"
            >
                <i class="fas fa-star"></i>
            </button>
        </div>
        <span v-if="showRating" class="rating-value">{{ modelValue || 0 }}/5</span>
    </div>
</template>

<script setup>
// ...existing code...
</script>

<style scoped>
// ...existing styles...
</style>