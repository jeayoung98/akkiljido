import { useEffect } from 'react';
import { Pressable, StyleProp, StyleSheet, ViewStyle } from 'react-native';
import Animated, { interpolateColor, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';

import Colors from '@/constants/Colors';

type SwitchProps = {
  value: boolean;
  onValueChange: (value: boolean) => void;
  disabled?: boolean;
  accessibilityLabel?: string;
  style?: StyleProp<ViewStyle>;
};

const TRACK_WIDTH = 44;
const TRACK_HEIGHT = 26;
const THUMB_SIZE = 22;
const THUMB_MARGIN = 2;
// 트랙 안에서 썸이 오른쪽 끝까지 움직일 수 있는 실제 거리(트랙 폭에서 썸 크기·여백을 뺀 값).
const THUMB_TRAVEL = TRACK_WIDTH - THUMB_SIZE - THUMB_MARGIN * 2;

/**
 * 켜짐/꺼짐을 표시하는 공통 스위치입니다. RN 기본 Switch는 안드로이드·iOS에서 모양이 서로 달라서,
 * 앱 어디서나 (설정, 알림 설정 등) 같은 모양이 나오도록 Animated로 직접 그렸습니다.
 */
export function Switch({ value, onValueChange, disabled = false, accessibilityLabel, style }: SwitchProps) {
  // 0(꺼짐)~1(켜짐) 사이 값 하나로 트랙 색과 썸 위치를 같이 움직인다.
  const progress = useSharedValue(value ? 1 : 0);

  // 이 컴포넌트는 controlled component라 실제 상태(value)는 부모가 들고 있다.
  // 눌렀을 때 바로 progress를 바꾸지 않고, 부모가 value를 바꿔서 다시 내려줄 때만 애니메이션한다
  // (onPress에서 onValueChange만 부르고 progress는 안 건드리는 이유).
  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 150 });
  }, [progress, value]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(progress.value, [0, 1], [Colors.light.border, Colors.light.primary]),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: progress.value * THUMB_TRAVEL }],
  }));

  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="switch"
      accessibilityState={{ checked: value, disabled }}
      disabled={disabled}
      hitSlop={8}
      onPress={() => onValueChange(!value)}
      style={[styles.hitArea, disabled && styles.disabled, style]}>
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  // alignSelf:'flex-start'가 없으면 부모가 row가 아닐 때 이 Pressable이 가로로 꽉 늘어나서,
  // 트랙 오른쪽 빈 공간까지 눌리는 영역이 돼버린다. 스위치 크기만큼만 눌리게 고정한다.
  hitArea: {
    alignSelf: 'flex-start',
  },
  disabled: {
    opacity: 0.5,
  },
  track: {
    width: TRACK_WIDTH,
    height: TRACK_HEIGHT,
    borderRadius: TRACK_HEIGHT / 2,
    padding: THUMB_MARGIN,
    justifyContent: 'center',
  },
  thumb: {
    width: THUMB_SIZE,
    height: THUMB_SIZE,
    borderRadius: THUMB_SIZE / 2,
    backgroundColor: '#fff',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.15,
    shadowRadius: 2,
  },
});
