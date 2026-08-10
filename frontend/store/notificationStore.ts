import AsyncStorage from '@react-native-async-storage/async-storage';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { NotificationFeedItem, NotificationType } from '@/types/notification';

// 알림함 화면을 나갔다 다시 들어와도(홈 <-> 알림함 이동) 읽음/삭제 상태가 유지되도록
// 화면 로컬 state가 아닌 전역 store에 둔다.
type AddNotificationInput = {
  type: NotificationType;
  title: string;
  body: string;
  // 리포트 푸시일 때만 함께 저장한다. 알림함에서 다시 눌렀을 때 어떤 리포트를 띄울지 아는 유일한 단서다.
  reportId?: number;
  reportType?: 'WEEKLY' | 'MONTHLY';
};

type NotificationStore = {
  notifications: NotificationFeedItem[];
  markAllRead: () => void;
  markRead: (id: number) => void;
  dismiss: (id: number) => void;
  clearAll: () => void;
  // 위치 알림 트리거(hooks/useNotificationPlaceTrigger.ts)와 리포트 푸시 수신
  // (hooks/useReportPushHandler.ts)이 알림함 목록에 새 항목을 추가할 때 쓴다.
  addNotification: (input: AddNotificationInput) => void;
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
  clearAll: () => set({ notifications: [] }),
  addNotification: ({ type, title, body, reportId, reportType }) =>
    set((state) => {
      // 같은 리포트 알림이 두 번 들어오면(재발송·중복 수신) 목록에 쌓이지 않게 한 건만 남긴다.
      if (reportId !== undefined && state.notifications.some((item) => item.reportId === reportId)) {
        return state;
      }

      const nextId = state.notifications.reduce((max, item) => Math.max(max, item.notificationId), 0) + 1;
      const newItem: NotificationFeedItem = {
        notificationId: nextId,
        type,
        title,
        body,
        createdAt: new Date().toISOString(),
        read: false,
        reportId,
        reportType,
      };
      return { notifications: [newItem, ...state.notifications] };
    }),
}), {
  name: 'notification:feed',
  storage: createJSONStorage(() => AsyncStorage),
}));
