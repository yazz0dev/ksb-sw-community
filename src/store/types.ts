import { Store } from 'vuex';
import { UserState } from '@/types/user';
import { EventState } from '@/types/event';

export interface RootState {
  user: UserState;
  events: EventState;
  app: {
    isOffline: boolean;
    error: string | null;
  };
}

export interface NotificationState {
  notifications: Notification[];
}

export interface Notification {
  id: string;
  message: string;
  type: string;
  timeout?: number;
}

export type TypedStore = Store<RootState>;
