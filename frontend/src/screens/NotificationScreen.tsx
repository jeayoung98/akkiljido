import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';
import { MOCK_NOTIFICATIONS, type NotificationFeedItem, type NotificationType } from '@/mocks/notificationFeed';

const TYPE_CONFIG: Record<
  NotificationType,
  { label: string; icon: keyof typeof Ionicons.glyphMap; iconColor: string; iconBackground: string; unreadBackground: string }
> = {
  LOCATION: {
    label: '위치 알림',
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

/**
 * 홈 화면 알림 뱃지를 누르면 나오는 알림함입니다. 위치 알림과 주간·월간 리포트 알림을 한 목록에서 보여줍니다.
 * 아직 홈 화면이 머지되지 않아 연결은 안 되어 있고, 화면만 먼저 만들어둔 상태입니다.
 */
export default function NotificationScreen() {
  const [notifications, setNotifications] = useState<NotificationFeedItem[]>(MOCK_NOTIFICATIONS);
  const hasUnread = notifications.some((item) => !item.read);

  const handleMarkAllRead = () => {
    setNotifications((prev) => prev.map((item) => ({ ...item, read: true })));
  };

  const handlePressItem = (id: number) => {
    setNotifications((prev) => prev.map((item) => (item.notificationId === id ? { ...item, read: true } : item)));
  };

  return (
    <AppScreen backgroundColor={Colors.light.primary}>
      <View style={styles.header}>
        <IconButton color="#FFFFFF" name="back" onPress={() => router.back()} size={20} />
        <Text style={styles.headerTitle}>알림</Text>
        {hasUnread ? (
          <Pressable hitSlop={8} onPress={handleMarkAllRead}>
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
                <Pressable
                  key={item.notificationId}
                  onPress={() => handlePressItem(item.notificationId)}
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
                      {item.body}
                    </Text>
                  </View>
                </Pressable>
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
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '800',
  },
  markAllText: {
    color: '#FFFFFF',
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
  bodyText: {
    color: Colors.light.cardDescription,
    fontSize: 13,
    lineHeight: 18,
  },
});
