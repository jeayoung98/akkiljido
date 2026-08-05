import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import AppScreen from '@/components/common/AppScreen';
import { IconButton } from '@/components/common/button/IconButton';
import InfoListItem from '@/components/common/card/InfoListItem';
import { AppHeader } from '@/components/common/header/AppHeader';
import { ConfirmModal } from '@/components/common/modal/ConfirmModal';
import { BrandLogo } from '@/components/onboarding/BrandLogo';
import { NicknameEditModal } from '@/components/my/NicknameEditModal';
import Colors from '@/constants/Colors';

// TODO: 실제 로그인한 사용자 닉네임으로 교체 (지금은 온보딩 예시값 그대로 사용)
const INITIAL_NICKNAME = 'Dust';

/** 마이페이지. 프로필 요약과 내 장소 관리·알림 설정·설정·로그아웃으로 가는 메뉴를 보여준다. */
export default function MyScreen() {
  const [nickname, setNickname] = useState(INITIAL_NICKNAME);
  const [nicknameModalVisible, setNicknameModalVisible] = useState(false);
  const [logoutModalVisible, setLogoutModalVisible] = useState(false);

  const handleSaveNickname = (nextNickname: string) => {
    // TODO: 실제 닉네임 저장 API 연결
    setNickname(nextNickname);
    setNicknameModalVisible(false);
  };

  const handleLogout = () => {
    setLogoutModalVisible(false);
    // TODO: 토큰 삭제 등 실제 로그아웃 처리 연결
    router.replace('/login');
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
            onPress={() => setNicknameModalVisible(true)}
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
          onPress={() => router.push('/alarms')}
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
        nickname={nickname}
        onCancel={() => setNicknameModalVisible(false)}
        onSave={handleSaveNickname}
        visible={nicknameModalVisible}
      />

      <ConfirmModal
        confirmLabel="로그아웃"
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
