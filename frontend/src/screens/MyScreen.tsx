import { router } from 'expo-router';
import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import { BrandLogo } from '@/components/onboarding/BrandLogo';
import { NicknameEditModal } from '@/components/my/NicknameEditModal';
import Colors from '@/constants/Colors';
import { useNotificationStore } from '@/store/notificationStore';
import { logoutFromServer } from '@/src/api/authApi';
import { getMyProfile, registerNickname } from '@/src/api/usersApi';
import { clearAuthSession, getAuthSession, saveAuthSession } from '@/src/auth/tokenStorage';
import { stopBackgroundLocationTracking } from '@/utils/backgroundLocationTask';
import { clearPresentedNotifications } from '@/utils/localNotifications';
import { clearNotificationPlaces } from '@/utils/notificationPlaceStorage';
import { clearPushTokenRegistration } from '@/utils/pushNotifications';

/** 마이페이지. 프로필 요약과 내 장소 관리·알림 설정·설정·로그아웃으로 가는 메뉴를 보여준다. */
export default function MyScreen() {
  // 서버 응답이 오기 전에는 빈 문자열로 두고, 조회 실패하면 콘솔에만 남기고 빈 상태로 둔다
  // (화면이 깨지지는 않되, "닉네임 수정"으로 채울 수 있다).
  const [nickname, setNickname] = useState('');
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [nicknameSaving, setNicknameSaving] = useState(false);
  const [nicknameError, setNicknameError] = useState('');
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);
  const clearNotifications = useNotificationStore((state) => state.clearAll);

  useEffect(() => {
    (async () => {
      try {
        const profile = await getMyProfile();
        console.info('[my] profile success', profile);
        setNickname(profile.nickname);
      } catch (error) {
        console.error('[my] profile failed', error);
      }
    })();
  }, []);

  const handleSaveNickname = async (nextNickname: string) => {
    try {
      setNicknameSaving(true);
      setNicknameError('');

      const result = await registerNickname(nextNickname);

      // 닉네임 변경도 새 access/refresh token을 함께 내려주므로, 세션을 그 값으로 교체해둔다.
      await saveAuthSession(result);

      setNickname(result.nickname);
      setNicknameModalVisible(false);
    } catch (error) {
      console.error('[my] nickname update failed', error);
      setNicknameError(error instanceof Error ? error.message : '닉네임 저장에 실패했습니다.');
    } finally {
      setNicknameSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      setLoggingOut(true);

      const session = await getAuthSession();
      if (session) {
        try {
          await logoutFromServer(session.accessToken);
        } catch (error) {
          // 서버 로그아웃(토큰 폐기)이 실패해도, 기기에서는 로그인 화면으로 보내는 게 우선이라 로컬 세션은 계속 지운다.
          console.error('[my] server logout failed', error);
        }
      }

      // 위치 알림은 로그인 사용자별 데이터이므로, 로그아웃과 함께 감시·기기 캐시·알림함을 모두 정리합니다.
      // 리포트 푸시 토큰도 같이 해제해야, 로그아웃한 기기로 이전 계정의 리포트 알림이 계속 오지 않습니다.
      // (토큰 해제는 인증이 필요하므로 반드시 clearAuthSession 전에 합니다.)
      try {
        await clearPushTokenRegistration();
        await stopBackgroundLocationTracking();
        await clearNotificationPlaces();
        clearNotifications();
        await clearPresentedNotifications();
      } catch (error) {
        // 이 정리가 실패해도 로그아웃과 토큰 삭제는 반드시 계속 진행합니다.
        console.error('[my] notification cleanup on logout failed', error);
      }

      await clearAuthSession();
      setLogoutModalVisible(false);
      router.replace('/login');
    } finally {
      setLoggingOut(false);
    }
  };

  return (
    <AppScreen scrollable backgroundColor={Colors.light.background}>
      <AppHeader title="마이페이지" />

      <View style={styles.profile}>
        <View style={styles.avatar}>
          <BrandLogo size={36} />
        </View>
        <View style={styles.profileText}>
          <Text style={styles.nickname}>{nickname}</Text>
          <Pressable
            accessibilityLabel="닉네임 수정"
            accessibilityRole="button"
            hitSlop={8}
            onPress={() => {
              setNicknameError('');
              setNicknameModalVisible(true);
            }}
            style={styles.editRow}>
            <Text style={styles.editText}>닉네임 수정</Text>
            <View pointerEvents="none">
              <IconButton name="edit" color={Colors.light.textSecondary} size={14} />
            </View>
          </Pressable>
        </View>
      </View>

      <View style={styles.menuCard}>
        <InfoListItem
          title="내 장소 관리"
          trailing={
            <View pointerEvents="none">
              <IconButton name="chevronRight" color={Colors.light.textSecondary} size={18} />
            </View>
          }
          onPress={() => router.push('/my-places')}
          style={styles.menuItem}
        />
        <View style={styles.divider} />
        <InfoListItem
          title="알림 설정"
          trailing={
            <View pointerEvents="none">
              <IconButton name="chevronRight" color={Colors.light.textSecondary} size={18} />
            </View>
          }
          onPress={() => router.push('/notification-settings')}
          style={styles.menuItem}
        />
        <View style={styles.divider} />
        <InfoListItem
          title="설정"
          trailing={
            <View pointerEvents="none">
              <IconButton name="chevronRight" color={Colors.light.textSecondary} size={18} />
            </View>
          }
          onPress={() => router.push('/settings')}
          style={styles.menuItem}
        />
        <View style={styles.divider} />
        <InfoListItem
          accessibilityLabel="로그아웃"
          title="로그아웃"
          titleStyle={styles.logoutText}
          onPress={() => setLogoutModalVisible(true)}
          style={styles.menuItem}
        />
      </View>

      <Text style={styles.version}>v1.0.0 · 아낄지도</Text>

      <NicknameEditModal
        errorMessage={nicknameError}
        nickname={nickname}
        onCancel={() => setNicknameModalVisible(false)}
        onSave={handleSaveNickname}
        saving={nicknameSaving}
        visible={nicknameModalVisible}
      />

      <ConfirmModal
        confirmLabel="로그아웃"
        confirmLoading={loggingOut}
        destructive
        onCancel={() => setLogoutModalVisible(false)}
        onConfirm={handleLogout}
        title="로그아웃 하시겠어요?"
        visible={logoutModalVisible}
      />
    </AppScreen>
  );
}

const styles = StyleSheet.create({
  profile: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.light.cardMutedBackground,
  },
  profileText: {
    flex: 1,
  },
  nickname: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.light.cardTitle,
  },
  editRow: {
    marginTop: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    alignSelf: 'flex-start',
  },
  editText: {
    fontSize: 13,
    color: Colors.light.textSecondary,
  },
  menuCard: {
    marginHorizontal: 16,
    borderRadius: 16,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
  },
  menuItem: {
    minHeight: 52,
    paddingVertical: 8,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    marginHorizontal: 16,
    backgroundColor: Colors.light.border,
  },
  logoutText: {
    color: Colors.light.danger,
  },
  version: {
    marginTop: 24,
    marginBottom: 16,
    textAlign: 'center',
    fontSize: 12,
    color: Colors.light.textSecondary,
  },
});
