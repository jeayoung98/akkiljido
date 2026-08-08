import { router } from 'expo-router';
import { useEffect } from 'react';

import { getAuthSession } from '@/src/auth/tokenStorage';
import { useNotificationStore } from '@/store/notificationStore';
import { useReportPopupStore } from '@/store/reportPopupStore';
import { loadNotifications } from '@/utils/localNotifications';
import { parseReportPushData } from '@/utils/reportPushPayload';

// expo-notifications를 정적으로 import하면 Expo Go에서 앱 전체가 죽기 때문에(utils/localNotifications.ts
// 상단 주석 참고) 타입도 정적으로 못 끌어온다. 실제로 읽는 필드만 최소로 적어둔다.
type PushNotificationLike = {
  request?: {
    identifier?: string;
    content?: {
      title?: string | null;
      body?: string | null;
      data?: unknown;
    };
  };
};

type PushResponseLike = {
  notification?: PushNotificationLike;
};

// 앱이 종료된 상태에서 알림을 눌러 실행되면, 응답 리스너와 getLastNotificationResponseAsync가
// 같은 응답을 두 번 전달할 수 있다. 한 번 처리한 알림은 건너뛰어 팝업이 다시 열리지 않게 한다.
const handledResponseIds = new Set<string>();

function getContent(notification: PushNotificationLike | undefined) {
  return notification?.request?.content;
}

/** 리포트 푸시를 탭했을 때: 띄울 리포트를 예약하고 홈으로 보낸다. */
async function handleReportResponse(response: PushResponseLike | null | undefined): Promise<void> {
  const notification = response?.notification;
  const payload = parseReportPushData(getContent(notification)?.data);
  if (!payload) return;

  const responseId = notification?.request?.identifier;
  if (responseId) {
    if (handledResponseIds.has(responseId)) return;
    handledResponseIds.add(responseId);
  }

  // 로그아웃 상태에서 예전 알림을 누르면 홈으로 보내봐야 조회가 전부 401로 실패한다.
  const session = await getAuthSession();
  if (session?.role !== 'USER') return;

  useReportPopupStore.getState().openReport({
    reportId: payload.reportId,
    reportType: payload.reportType,
    detail: payload.detail,
    source: 'push',
  });

  // 홈 화면이 예약된 리포트를 보고 ReportModal을 연다. 이미 홈이면 그대로 머문다.
  router.navigate('/(tabs)');
}

/**
 * 리포트 푸시 알림 처리기. 루트 레이아웃에서 한 번만 호출한다.
 *
 * 세 가지 경로를 모두 덮는다.
 * 1. 앱이 켜져 있을 때 도착 → 알림함 목록에 추가한다(화면은 사용자가 탭했을 때만 띄운다).
 * 2. 백그라운드에서 알림 탭 → 응답 리스너로 잡아 홈에 리포트 팝업을 띄운다.
 * 3. 앱이 완전히 죽은 상태에서 알림 탭 → 리스너가 붙기 전에 이미 응답이 발생하므로
 *    getLastNotificationResponseAsync로 따로 확인한다.
 */
export function useReportPushHandler(): void {
  useEffect(() => {
    let cancelled = false;
    const subscriptions: { remove: () => void }[] = [];

    void (async () => {
      const Notifications = await loadNotifications();
      if (!Notifications || cancelled) return;

      subscriptions.push(
        // expo-notifications 타입을 정적으로 못 끌어와서(위 주석 참고) 콜백 인자는 unknown으로 받고
        // 우리가 실제로 읽는 모양으로만 좁혀 쓴다. unknown은 어떤 인자 타입과도 호환돼서,
        // 개발 빌드에서 실제 타입이 붙어도 그대로 맞는다.
        Notifications.addNotificationReceivedListener((notification: unknown) => {
          const content = getContent(notification as PushNotificationLike);
          const payload = parseReportPushData(content?.data);
          if (!payload) return;

          useNotificationStore.getState().addNotification({
            type: payload.reportType === 'MONTHLY' ? 'MONTHLY_REPORT' : 'WEEKLY_REPORT',
            title: content?.title ?? '소비 리포트가 도착했어요',
            body: content?.body ?? '',
            reportId: payload.reportId,
            reportType: payload.reportType,
          });
        }),
      );

      subscriptions.push(
        Notifications.addNotificationResponseReceivedListener((response: unknown) => {
          void handleReportResponse(response as PushResponseLike);
        }),
      );

      const lastResponse = await Notifications.getLastNotificationResponseAsync();
      if (cancelled) return;
      void handleReportResponse(lastResponse as PushResponseLike | null);
    })();

    return () => {
      cancelled = true;
      subscriptions.forEach((subscription) => subscription.remove());
    };
  }, []);
}
