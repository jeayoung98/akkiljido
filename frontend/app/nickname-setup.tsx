import { useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { Text } from '@/components/common/typography/Text';
import { NativeTextInput } from '@/components/common/typography/TextInput';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/onboarding/BrandLogo';
import Colors from '@/constants/Colors';
import { registerNickname } from '@/src/api/usersApi';
import { saveAuthSession } from '@/src/auth/tokenStorage';
import { syncPushTokenRegistration } from '@/utils/pushNotifications';

const MAX_LENGTH = 20;

export default function NicknameSetupScreen() {
  const router = useRouter();

  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const { height, width } = useWindowDimensions();

  const compact = height < 700;

  const logoSize = Math.min(
    160,
    Math.max(136, width * 0.4),
  );

  const trimmedNickname = nickname.trim();

  const isValid =
    trimmedNickname.length > 0 &&
    trimmedNickname.length <= MAX_LENGTH &&
    !loading;

  const handleComplete = async () => {
    if (!isValid) {
      return;
    }

    try {
      setLoading(true);
      setErrorMessage('');

      const result =
        await registerNickname(trimmedNickname);

      /*
       * 닉네임 등록이 완료되면 백엔드는
       * role=USER인 새로운 access/refresh token을 반환한다.
       * 기존 GUEST 세션을 새로운 USER 세션으로 교체한다.
       */
      await saveAuthSession(result);

      console.info(
        '[auth] nickname registration success',
        {
          nickname: result.nickname,
          role: result.role,
          tokensSaved: true,
        },
      );

      // GUEST -> USER로 바뀌는 유일한 지점이다. 여기서 등록하지 않으면 앱을 완전히 껐다 켜기 전까지
      // 이 기기 토큰이 서버에 올라가지 않아 리포트 푸시를 못 받는다.
      void syncPushTokenRegistration();

      router.replace('/(tabs)');
    } catch (error) {
      console.error(
        '[auth] nickname registration failed',
        error,
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : '닉네임 등록에 실패했습니다.',
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView
      edges={['top', 'bottom']}
      style={styles.safeArea}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        keyboardVerticalOffset={
          Platform.OS === 'ios'
            ? 8
            : 0
        }
        style={styles.container}
      >
        <ScrollView
          bounces={false}
          contentContainerStyle={[
            styles.scrollContent,
            compact &&
              styles.compactScrollContent,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>
            닉네임을 설정해주세요
          </Text>

          <View
            style={[
              styles.logoArea,
              compact &&
                styles.compactLogoArea,
            ]}
          >
            <BrandLogo size={logoSize} />
          </View>

          <Text style={styles.prompt}>
            챗봇이 부를 이름을 정해주세요
          </Text>

          <Text style={styles.description}>
            AI가 대화할 때 이 이름으로 불러드려요
          </Text>

          <View style={styles.inputArea}>
            <NativeTextInput
              accessibilityLabel="닉네임"
              autoCapitalize="none"
              autoCorrect={false}
              editable={!loading}
              maxLength={MAX_LENGTH}
              onChangeText={(value) => {
                setNickname(value);
                setErrorMessage('');
              }}
              onSubmitEditing={() => {
                void handleComplete();
              }}
              placeholder="닉네임을 입력해주세요"
              placeholderTextColor={
                Colors.onboarding.muted
              }
              returnKeyType="done"
              style={styles.input}
              value={nickname}
            />

            <Text style={styles.counter}>
              {nickname.length}/{MAX_LENGTH}
            </Text>
          </View>

          {!!errorMessage && (
            <Text style={styles.errorText}>
              {errorMessage}
            </Text>
          )}

          <Pressable
            accessibilityRole="button"
            disabled={!isValid}
            onPress={() => {
              void handleComplete();
            }}
            style={({ pressed }) => [
              styles.button,
              !isValid &&
                styles.buttonDisabled,
              pressed &&
                isValid &&
                styles.buttonPressed,
            ]}
          >
            {loading ? (
              <ActivityIndicator
                color={
                  Colors.onboarding.inverseText
                }
              />
            ) : (
              <Text style={styles.buttonText}>
                설정 완료
              </Text>
            )}
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor:
      Colors.onboarding.surface,
  },

  container: {
    flex: 1,
  },

  scrollContent: {
    flexGrow: 1,
    paddingBottom: 0,
    paddingHorizontal: 24,
    paddingTop: 68,
  },

  compactScrollContent: {
    paddingBottom: 0,
    paddingTop: 28,
  },

  title: {
    color: Colors.onboarding.text,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 34,
  },

  logoArea: {
    alignItems: 'center',
    marginTop: 7,
  },

  compactLogoArea: {
    marginTop: 8,
  },

  prompt: {
    color: Colors.onboarding.text,
    fontSize: 18,
    fontWeight: '700',
    lineHeight: 26,
    marginTop: 25,
    textAlign: 'center',
  },

  description: {
    color: Colors.onboarding.muted,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 25,
    marginTop: 1,
    textAlign: 'center',
  },

  inputArea: {
    marginTop: 23,
    minHeight: 62,
    position: 'relative',
  },

  input: {
    borderBottomColor:
      Colors.onboarding.green,
    borderBottomWidth: 2,
    color: Colors.onboarding.text,
    fontSize: 24,
    fontWeight: '700',
    height: 38,
    paddingBottom: 5,
    paddingHorizontal: 42,
    paddingTop: 0,
    textAlign: 'center',
  },

  counter: {
    color: Colors.onboarding.muted,
    fontSize: 14,
    lineHeight: 20,
    position: 'absolute',
    right: 0,
    top: 40,
  },

  errorText: {
    color: Colors.light.danger,
    fontSize: 14,
    marginTop: 12,
    textAlign: 'center',
  },

  button: {
    alignItems: 'center',
    backgroundColor:
      Colors.onboarding.green,
    borderRadius: 17,
    height: 56,
    justifyContent: 'center',
    marginTop: 'auto',

    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.17,
    shadowRadius: 5,
    elevation: 4,
  },

  buttonDisabled: {
    backgroundColor: Colors.light.disabled,
  },

  buttonPressed: {
    opacity: 0.85,
  },

  buttonText: {
    color:
      Colors.onboarding.inverseText,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
});