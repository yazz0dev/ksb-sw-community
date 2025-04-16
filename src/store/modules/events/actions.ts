// src/store/modules/events/actions.ts
// This file now simply imports and merges the actions from the part files.

import { ActionTree } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/store/types';

// Import all actions from the partial files
import * as actionsPart1 from './actions.part1';
import * as actionsPart2 from './actions.part2';
import * as actionsPart3 from './actions.part3';

// Merge all imported actions into a single ActionTree object
export const eventActions: ActionTree<EventState, RootState> = {
    ...actionsPart1,
    ...actionsPart2,
    ...actionsPart3,
};