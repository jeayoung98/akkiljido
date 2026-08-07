import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NotificationFeedItem, NotificationType } from '@/types/notification';

// 알림함 화면을 나갔다 다시 들어와도(홈 <-> 알림함 이동) 읽음/삭제 상태가 유지되도록
// 화면 로컬 state가 아닌 전역 store에 둔다.
type NotificationStore = {
  notifications: NotificationFeedItem[];
  markAllRead: () => void;
  markRead: (id: number) => void;
  dismiss: (id: number) => void;
  // 위치 알림 트리거(hooks/useNotificationPlaceTrigger.ts)가 실제로 알림을 쏠 때,
  // OS 알림과 별개로 알림함 목록에도 새 항목을 추가하기 위해 쓴다.
  addNotification: (input: { type: NotificationType; title: string; body: string }) => void;
};

export const useNotificationStore = create<NotificationStore>()(persist((set) => ({
  notifications: [],
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
  addNotification: ({ type, title, body }) =>
    set((state) => {
      const nextId = state.notifications.reduce((max, item) => Math.max(max, item.notificationId), 0) + 1;
      const newItem: NotificationFeedItem = {
        notificationId: nextId,
        type,
        title,
        body,
        createdAt: new Date().toISOString(),
        read: false,
      };
      return { notifications: [newItem, ...state.notifications] };
    }),
}), {
  name: 'notification:feed',
  storage: createJSONStorage(() => AsyncStorage),
}));
