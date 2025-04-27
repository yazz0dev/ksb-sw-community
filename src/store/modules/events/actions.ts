// src/store/modules/events/actions.ts
// This file now simply imports and merges the actions from the part files.

import { ActionTree } from 'vuex';
import { EventState } from '@/types/event';
import { RootState } from '@/types/store';

// Import all actions from the partial files
import * as lifecycleActions from './actions.lifecycle';
import * as participantsActions from './actions.participants';
import * as teamsActions from './actions.teams';
import * as ratingsActions from './actions.ratings';
import * as fetchingActions from './actions.fetching';
import * as submissionsActions from './actions.submissions';
import { updateLocalEvent } from './actions.utils';
import * as validationActions from './actions.validation';

// Merge all imported actions into a single ActionTree object
export const eventActions: ActionTree<EventState, RootState> = {
  ...lifecycleActions,
  ...participantsActions,
  ...teamsActions,
  ...ratingsActions,
  ...fetchingActions,
  ...submissionsActions,
  updateLocalEvent,
  ...validationActions,
  // Only actions with correct Vuex signature should be merged here.
};