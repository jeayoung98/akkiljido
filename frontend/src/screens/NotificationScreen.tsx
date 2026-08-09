import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { type ReactNode, useEffect } from 'react';
import { Dimensions, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { runOnJS, useAnimatedStyle, useSharedValue, withSpring, withTiming } from 'react-native-reanimated';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';
import { useNotificationStore } from '@/store/notificationStore';
import type { NotificationType } from '@/types/notification';
import { clearPresentedNotifications } from '@/utils/localNotifications';

const SCREEN_WIDTH = Dimensions.get('window').width;
const SWIPE_DISMISS_DISTANCE = 90; // 이만큼(px) 넘게 끌면 놓았을 때 삭제된다
const SWIPE_FLING_VELOCITY = 800; // 거리가 부족해도 이 속도(px/s)보다 빠르게 튕기면 삭제된다
const SPRING_CONFIG = { damping: 20, stiffness: 200, overshootClamping: true };

// BottomSheet.tsx와 같은 Gesture.Pan + reanimated 조합으로 만든 스와이프 삭제 행입니다.
// react-native-gesture-handler의 Swipeable(ReanimatedSwipeable)은 이 프로젝트가 쓰는 Expo Go
// 런타임에 아직 없는 네이티브 뷰(RNGestureHandlerDetector)를 요구해서 크래시가 나 직접 구현으로 대체했습니다.
function SwipeToDismissRow({ onDismiss, children }: { onDismiss: () => void; children: ReactNode }) {
  const translateX = useSharedValue(0);
  const startX = useSharedValue(0);

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .failOffsetY([-10, 10])
    .onStart(() => {
      startX.value = translateX.value;
    })
    .onUpdate((event) => {
      translateX.value = startX.value + event.translationX;
    })
    .onEnd((event) => {
      const pastThreshold = Math.abs(translateX.value) > SWIPE_DISMISS_DISTANCE;
      const flicked = Math.abs(event.velocityX) > SWIPE_FLING_VELOCITY;

      if (pastThreshold || flicked) {
        const direction = translateX.value >= 0 ? 1 : -1;
        translateX.value = withTiming(direction * SCREEN_WIDTH, { duration: 200 }, (finished) => {
          if (finished) runOnJS(onDismiss)();
        });
        return;
      }

      translateX.value = withSpring(0, SPRING_CONFIG);
    });

  const rowStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  return (
    <View style={styles.rowWrapper}>
      <View pointerEvents="none" style={styles.dismissBackground}>
        <Ionicons color="#FFFFFF" name="trash-outline" size={18} />
        <Ionicons color="#FFFFFF" name="trash-outline" size={18} />
      </View>
      <GestureDetector gesture={panGesture}>
        <Animated.View style={rowStyle}>{children}</Animated.View>
      </GestureDetector>
    </View>
  );
}

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBackground: string; unreadBackground: string }
> = {
  LOCATION: {
    label: '방앗간 알림',
    icon: 'location',
    iconColor: '#B8860B',
    iconBackground: '#F5E6C8',
    unreadBackground: '#FBF3DE',
  },
  WEEKLY_REPORT: {
    label: '주간 리포트',
    icon: 'document-text-outline',
    iconColor: '#6B7280',
    iconBackground: '#E5E7EB',
    unreadBackground: '#F3F4F6',
  },
  MONTHLY_REPORT: {
    label: '월간 리포트',
    icon: 'bar-chart',
    iconColor: Colors.light.primary,
    iconBackground: '#DCEEDD',
    unreadBackground: '#E9F5EA',
  },
};

// "2026. 08. 05 오후 6:30" 형태로 만든다. 알림 종류와 상관없이 날짜·시간을 항상 함께 보여준다.
function formatNotificationTime(iso: string) {
  const date = new Date(iso);

  const hour24 = date.getHours();
  const period = hour24 < 12 ? '오전' : '오후';
  const hour12 = hour24 % 12 === 0 ? 12 : hour24 % 12;
  const minute = date.getMinutes().toString().padStart(2, '0');

  const y = date.getFullYear();
  const m = (date.getMonth() + 1).toString().padStart(2, '0');
  const d = date.getDate().toString().padStart(2, '0');
  return `${y}. ${m}. ${d} ${period} ${hour12}:${minute}`;
}

// 카드 크기를 통일하기 위해 설명 문구를 한 줄당 25자, 최대 2줄로 제한한다.
const DESCRIPTION_LINE_LENGTH = 25;
const DESCRIPTION_MAX_LENGTH = DESCRIPTION_LINE_LENGTH * 2;

function truncateDescription(text: string) {
  if (text.length <= DESCRIPTION_MAX_LENGTH) return text;
  return `${text.slice(0, DESCRIPTION_MAX_LENGTH - 1)}…`;
}

/**
 * 홈 화면 알림 뱃지를 누르면 나오는 알림함입니다. 위치 알림과 주간·월간 리포트 알림을 한 목록에서 보여줍니다.
 * 쌓인 알림을 계속 목록에 남겨두기보다, 옆으로 스와이프하면 바로 지워지는 방식으로 정리합니다.
 * 읽음/삭제 상태는 화면을 나갔다 들어와도 유지되도록 전역 store(store/notificationStore.ts)에서 관리합니다.
 */
export default function NotificationScreen() {
  const notifications = useNotificationStore((state) => state.notifications);
  const markAllRead = useNotificationStore((state) => state.markAllRead);
  const markRead = useNotificationStore((state) => state.markRead);
  const dismiss = useNotificationStore((state) => state.dismiss);
  const hasUnread = notifications.some((item) => !item.read);

  useEffect(() => {
    // 알림함을 열면 인앱 목록은 읽음으로 바꾸고, 홈 화면의 OS 배지도 함께 비운다.
    markAllRead();
    void clearPresentedNotifications();
  }, [markAllRead]);

  return (
    <AppScreen backgroundColor={Colors.light.primary}>
      <View style={styles.header}>
        <IconButton color="#FFFFFF" name="back" onPress={() => router.back()} size={20} />
        <Text style={styles.headerTitle}>알림</Text>
        {hasUnread ? (
          <Pressable hitSlop={8} onPress={markAllRead}>
            <Text style={styles.markAllText}>모두 읽음</Text>
          </Pressable>
        ) : null}
      </View>

      <View style={styles.body}>
        <ScrollView contentContainerStyle={styles.content}>
          {notifications.length === 0 ? (
            <Text style={styles.emptyText}>아직 도착한 알림이 없어요.</Text>
          ) : (
            notifications.map((item) => {
              const config = TYPE_CONFIG[item.type];
              return (
                <SwipeToDismissRow key={item.notificationId} onDismiss={() => dismiss(item.notificationId)}>
                  <Pressable
                    onPress={() => markRead(item.notificationId)}
                    style={[styles.card, { backgroundColor: item.read ? Colors.light.cardBackground : config.unreadBackground }]}>
                    <View style={[styles.iconBox, { backgroundColor: config.iconBackground }]}>
                      <Ionicons color={config.iconColor} name={config.icon} size={18} />
                    </View>

                    <View style={styles.cardContent}>
                      <View style={styles.cardTopRow}>
                        <View style={styles.typeRow}>
                          <Text style={styles.typeLabel}>{config.label}</Text>
                          {item.read ? null : <View style={styles.unreadDot} />}
                        </View>
                        <Text style={styles.timeText}>{formatNotificationTime(item.createdAt)}</Text>
                      </View>
                      <Text style={styles.title}>{item.title}</Text>
                      <Text style={styles.bodyText} numberOfLines={2}>
                        {truncateDescription(item.body)}
                      </Text>
                    </View>
                  </Pressable>
                </SwipeToDismissRow>
              );
            })
          )}
        </ScrollView>
      </View>
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  headerTitle: {
    flex: 1,
    color: Colors.onboarding.inverseText,
    fontSize: 18,
    fontWeight: '800',
  },
  markAllText: {
    color: Colors.onboarding.inverseText,
    fontSize: 13,
    fontWeight: '600',
  },
  body: {
    flex: 1,
    backgroundColor: Colors.light.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
  },
  content: {
    padding: 16,
    gap: 12,
  },
  emptyText: {
    paddingVertical: 40,
    color: Colors.light.cardDescription,
    fontSize: 13,
    textAlign: 'center',
  },
  card: {
    flexDirection: 'row',
    gap: 12,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  rowWrapper: {
    // 카드가 옆으로 밀려날 때 뒤에서 드러나는 삭제 배경을 담는 겹침 컨테이너.
  },
  dismissBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    borderRadius: 16,
    backgroundColor: Colors.light.danger,
  },
  bodyText: {
    minHeight: 36, // 1줄짜리 설명도 2줄 높이만큼 차지해서 카드 크기가 항상 같아 보이게 한다.
    color: Colors.light.cardDescription,
    fontSize: 13,
    lineHeight: 18,
  },
  iconBox: {
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardContent: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  typeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typeLabel: {
    color: Colors.light.cardAccent,
    fontSize: 12,
    fontWeight: '700',
  },
  unreadDot: {
    width: 5,
    height: 5,
    borderRadius: 999,
    backgroundColor: Colors.light.primary,
  },
  timeText: {
    color: Colors.light.cardDescription,
    fontSize: 11,
  },
  title: {
    color: Colors.light.cardTitle,
    fontSize: 15,
    fontWeight: '700',
  },
});
