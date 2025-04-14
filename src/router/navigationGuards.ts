import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import { TypedStore } from '../store/types';
import store from '../store';

export async function beforeRouteEnter(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
): Promise<void> {
    // Clear any pending date checks when navigating away from event forms
    if (from.name === 'CreateEvent' || from.name === 'EditEvent') {
        await store.dispatch('events/clearDateCheck');
    }
    next();
}