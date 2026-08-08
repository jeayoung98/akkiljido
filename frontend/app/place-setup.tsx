import { useEffect, useRef, useState } from 'react';
import { ActivityIndicator, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, useWindowDimensions, View } from 'react-native';
import { useRouter } from 'expo-router';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BrandLogo } from '@/components/onboarding/BrandLogo';
import { Text } from '@/components/common/typography/Text';
import { TextInput } from '@/components/common/input/TextInput';
import { MapInput } from '@/components/common/input/MapInput';
import Colors from '@/constants/Colors';
import { createMyPlace } from '@/src/api/myPlaceApi';
import { useMapPickerStore } from '@/store/mapPickerStore';

const MAX_LENGTH = 20;

/** 닉네임 설정 다음 온보딩 단계. 자주 가는 장소 하나를 등록해두면 홈 화면에서 그 주변 소비를 바로 볼 수 있다. */
export default function PlaceSetupScreen() {
  const router = useRouter();

  const [placeName, setPlaceName] = useState('');
  const [address, setAddress] = useState('');
  const [coords, setCoords] = useState<{ latitude: number; longitude: number } | null>(null);
  const [saving, setSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const pickedLocation = useMapPickerStore((state) => state.pickedLocation);
  const clearPickedLocation = useMapPickerStore((state) => state.clearPickedLocation);
  // pickedLocation은 다른 화면의 지도 선택 흐름과 공유하는 전역 store라, 이 화면에서 연 게 아니면 건드리지 않는다.
  const isReturningFromMapRef = useRef(false);

  const { height, width } = useWindowDimensions();
  const compact = height < 700;
  const logoSize = Math.min(120, Math.max(96, width * 0.28));

  // 지도에서 위치를 고르고 돌아오면 store에 담긴 값을 읽어 주소 입력에 반영한다.
  useEffect(() => {
    if (!pickedLocation || !isReturningFromMapRef.current) return;

    setAddress(pickedLocation.address);
    setCoords({ latitude: pickedLocation.lat, longitude: pickedLocation.lng });
    clearPickedLocation();
    isReturningFromMapRef.current = false;
  }, [pickedLocation, clearPickedLocation]);

  const trimmedName = placeName.trim();
  const isValid = trimmedName.length > 0 && trimmedName.length <= MAX_LENGTH && Boolean(address) && coords !== null && !saving;

  const handleOpenMapPicker = () => {
    isReturningFromMapRef.current = true;
    router.push('/map-picker');
  };

  const handleComplete = async () => {
    if (!isValid || !coords) {
      return;
    }

    try {
      setSaving(true);
      setErrorMessage('');

      await createMyPlace({
        myPlaceName: trimmedName,
        address,
        latitude: coords.latitude,
        longitude: coords.longitude,
      });

      router.replace('/(tabs)');
    } catch (error) {
      console.error('[onboarding] place setup failed', error);
      setErrorMessage(error instanceof Error ? error.message : '장소 설정에 실패했습니다.');
    } finally {
      setSaving(false);
    }
  };

  // 지금 등록하지 않아도 마이페이지 > 내 장소 관리에서 언제든 추가할 수 있어, 온보딩을 막지 않는다.
  const handleSkip = () => {
    router.replace('/(tabs)');
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
        style={styles.container}>
        <ScrollView
          bounces={false}
          contentContainerStyle={[styles.scrollContent, compact && styles.compactScrollContent]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}>
          <Text style={styles.title}>자주 가는 장소를{'\n'}설정해주세요</Text>

          <View style={[styles.logoArea, compact && styles.compactLogoArea]}>
            <BrandLogo size={logoSize} />
          </View>

          <Text style={styles.description}>
            집, 회사처럼 자주 가는 곳을 등록해두면{'\n'}그 주변 소비를 홈 화면에서 바로 볼 수 있어요
          </Text>

          <View style={styles.form}>
            <TextInput
              accessibilityLabel="장소 이름"
              editable={!saving}
              label="장소 이름"
              labelInside
              maxLength={MAX_LENGTH}
              onChangeText={setPlaceName}
              placeholder="예) 집, 회사"
              value={placeName}
            />
            <MapInput label="주소" onPress={handleOpenMapPicker} value={address || undefined} />
          </View>

          {!!errorMessage && <Text style={styles.errorText}>{errorMessage}</Text>}

          <Pressable
            accessibilityRole="button"
            disabled={!isValid}
            onPress={() => {
              void handleComplete();
            }}
            style={({ pressed }) => [styles.button, !isValid && styles.buttonDisabled, pressed && isValid && styles.buttonPressed]}>
            {saving ? (
              <ActivityIndicator color={Colors.onboarding.inverseText} />
            ) : (
              <Text style={styles.buttonText}>설정 완료</Text>
            )}
          </Pressable>

          <Pressable accessibilityRole="button" disabled={saving} onPress={handleSkip} style={styles.skipButton}>
            <Text style={styles.skipText}>다음에 할게요</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.onboarding.surface,
  },
  container: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingBottom: 24,
    paddingHorizontal: 24,
    paddingTop: 56,
  },
  compactScrollContent: {
    paddingBottom: 16,
    paddingTop: 24,
  },
  title: {
    color: Colors.onboarding.text,
    fontSize: 25,
    fontWeight: '800',
    lineHeight: 34,
    textAlign: 'center',
  },
  logoArea: {
    alignItems: 'center',
    marginTop: 12,
  },
  compactLogoArea: {
    marginTop: 8,
  },
  description: {
    marginTop: 20,
    color: Colors.onboarding.muted,
    fontSize: 15,
    fontWeight: '500',
    lineHeight: 22,
    textAlign: 'center',
  },
  form: {
    marginTop: 28,
    gap: 14,
  },
  errorText: {
    marginTop: 12,
    color: Colors.light.danger,
    fontSize: 14,
    textAlign: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: Colors.onboarding.green,
    borderRadius: 17,
    height: 56,
    justifyContent: 'center',
    marginTop: 'auto',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
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
    color: Colors.onboarding.inverseText,
    fontSize: 17,
    fontWeight: '800',
    lineHeight: 23,
  },
  skipButton: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 8,
  },
  skipText: {
    color: Colors.onboarding.muted,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
});
