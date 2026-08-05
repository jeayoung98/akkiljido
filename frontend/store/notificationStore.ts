import { create } from 'zustand';

import { MOCK_NOTIFICATIONS, type NotificationFeedItem } from '@/mocks/notificationFeed';

// 알림함 화면을 나갔다 다시 들어와도(홈 <-> 알림함 이동) 읽음/삭제 상태가 유지되도록
// 화면 로컬 state가 아닌 전역 store에 둔다.
type NotificationStore = {
  notifications: NotificationFeedItem[];
  markAllRead: () => void;
  markRead: (id: number) => void;
  dismiss: (id: number) => void;
};

export const useNotificationStore = create<NotificationStore>((set) => ({
  notifications: MOCK_NOTIFICATIONS,
  markAllRead: () =>
    set((state) => ({
      notifications: state.notifications.map((item) => ({ ...item, read: true })),
    })),
  markRead: (id) =>
    set((state) => ({
      notifications: state.notifications.map((item) =>
        item.notificationId === id ? { ...item, read: true } : item
      ),
    })),
  dismiss: (id) =>
    set((state) => ({
      notifications: state.notifications.filter((item) => item.notificationId !== id),
    })),
}));
