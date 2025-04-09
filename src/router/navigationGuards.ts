import { NavigationGuardNext, RouteLocationNormalized } from 'vue-router';
import store from '../store';  // Using relative path

export async function beforeRouteEnter(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    next: NavigationGuardNext
) {
    // Clear any pending date checks when navigating away from event forms
    if (from.name === 'CreateEvent' || from.name === 'EditEvent') {
        await store.dispatch('events/clearDateCheck');
    }
    next();
}