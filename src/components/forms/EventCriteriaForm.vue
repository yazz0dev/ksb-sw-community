<template>
  <div>
    <div v-for="(criterion, idx) in localCriteria" :key="criterion.constraintIndex" class="mb-3 border-bottom pb-3">
  <div class="row align-items-center">
    <div class="col-md-4 mb-2 mb-md-0">
      <input
        class="form-control"
        type="text"
        v-model="criterion.constraintLabel"
        :readonly="isBestPerformer(idx)"
        :disabled="isSubmitting || isBestPerformer(idx)"
        @input="emitCriteriaUpdate"
        placeholder="Criterion Label"
        required
      />
    </div>
    <div class="col-md-3 mb-2 mb-md-0">
      <template v-if="isBestPerformer(idx)">
        <span>10 XP</span>
      </template>
      <template v-else>
        <input
          type="range"
          class="form-range"
          min="1"
          :max="getCriterionMax(idx)"
          v-model.number="criterion.points"
          :disabled="isSubmitting"
          @input="onCriterionPointsInput(idx)"
        />
        <span>{{ criterion.points }} XP</span>
      </template>
    </div>
    <div class="col-md-3 mb-2 mb-md-0">
      <template v-if="!isBestPerformer(idx)">
        <select
          class="form-select"
          v-model="criterion.role"
          :disabled="isSubmitting"
          @change="emitCriteriaUpdate"
        >
          <option value="" disabled>Select Role</option>
          <option v-for="role in assignableXpRoles" :key="role" :value="role">{{ role }}</option>
        </select>
      </template>
    </div>
    <div class="col-md-2 text-end">
      <button v-if="!isBestPerformer(idx)" class="btn btn-sm btn-outline-danger" :disabled="isSubmitting" @click.prevent="removeCriterion(idx)"><i class="fas fa-trash"></i></button>
    </div>
  </div>
</div>
    <button class="btn btn-outline-primary mt-3" type="button" :disabled="isSubmitting || totalXP >= 50" @click="addCriterion">Add Criterion</button>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, toRefs } from 'vue';
import type { EventCriteria } from '@/types/event';
import type { EventFormat } from '@/types/event';

interface Props {
  criteria: EventCriteria[];
  isSubmitting: boolean;
  eventFormat: EventFormat;
  assignableXpRoles: readonly string[];
  totalXP: number;
}

const emit = defineEmits(['update:criteria']);
const props = defineProps<Props>();
const { criteria, isSubmitting, eventFormat, assignableXpRoles, totalXP } = toRefs(props);

const localCriteria = ref<EventCriteria[]>([...criteria.value]);

// Ensure Best Performer for team events and default for new forms
watch(
  [criteria, eventFormat],
  ([newVal, format]) => {
    let updated = [...newVal];
    // Remove any existing Best Performer
    updated = updated.filter(c => c.constraintLabel !== 'Best Performer');
    if (format === 'Team') {
      // Always add Best Performer as last
      updated.push({
        constraintIndex: -1,
        constraintLabel: 'Best Performer',
        points: 10,
        role: '',
        criteriaSelections: {}
      });
    }
    // Ensure at least one default criterion for new forms
    if (updated.length === 0) {
      updated.push({
        constraintIndex: Date.now(),
        constraintLabel: 'Default Criteria',
        points: 10,
        role: assignableXpRoles.value[0] || '',
        criteriaSelections: {}
      });
    }
    localCriteria.value = updated;
  },
  { immediate: true }
);

function emitCriteriaUpdate() {
  emit('update:criteria', [...localCriteria.value]);
}

function addCriterion() {
  if (totalXP.value >= 50) return;
  localCriteria.value.push({
    constraintIndex: Date.now(),
    constraintLabel: '',
    points: 1,
    role: '',
    criteriaSelections: {}
  });
  emitCriteriaUpdate();
}

function removeCriterion(idx: number) {
  localCriteria.value.splice(idx, 1);
  emitCriteriaUpdate();
}

function getCriterionMax(idx: number) {
  // Max points for this criterion is 50 - sum of others
  const sumOthers = localCriteria.value.reduce((sum, c, i) => i === idx ? sum : sum + (c.points || 0), 0);
  return 50 - sumOthers;
}

function onCriterionPointsInput(idx: number) {
  // Clamp value
  const max = getCriterionMax(idx);
  if (localCriteria.value[idx].points > max) {
    localCriteria.value[idx].points = max;
  }
  emitCriteriaUpdate();
}

function isBestPerformer(idx: number) {
  // For team events, auto-add 'Best Performer' as last criterion
  if (eventFormat.value === 'Team' && idx === localCriteria.value.length - 1) {
    return localCriteria.value[idx].constraintLabel === 'Best Performer';
  }
  return false;
}
</script>

<style scoped>
</style>
