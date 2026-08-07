import { useRef, useState } from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Text,
  View,
  ViewStyle,
} from 'react-native';

import Colors from '@/constants/Colors';

/** 옵션 한 줄의 높이(styles.option의 minHeight와 같아야 스크롤 위치 계산이 맞습니다). */
const OPTION_HEIGHT = 52;
/** 아래로 펼칠 때 한 번에 보여줄 옵션 개수. 아래쪽은 화면 끝까지 남은 공간이 좁아 4개로 둡니다. */
const VISIBLE_OPTION_COUNT_DOWN = 4;
/**
 * 위로 펼칠 때 한 번에 보여줄 옵션 개수.
 * 위로 펼치는 칸은 화면 아래쪽에 있어서 위쪽 공간이 넉넉한데, 4개만 보여주면
 * 카테고리처럼 항목이 많은 목록에서 "일부만 있는 것처럼" 보입니다.
 */
const VISIBLE_OPTION_COUNT_UP = 6;
/** 선택 칸과 목록 사이 간격. */
const DROPDOWN_GAP = 8;
/** 목록이 화면 위/아래 끝에 딱 붙지 않도록 두는 최소 여백. */
const SCREEN_EDGE_MARGIN = 12;

export type SelectOption<T extends string = string> = {
  label: string;
  value: T;
};

/** 선택 칸의 화면상 위치·크기. 위로 펼치는 목록을 그 위에 정확히 붙이기 위해 측정합니다. */
type TriggerAnchor = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type SelectInputProps<T extends string = string> = {
  options: SelectOption<T>[];
  value: T | null;
  onChange: (value: T) => void;
  label?: string;
  placeholder?: string;
  /** 추가 폼처럼 라벨을 선택 칸 안에 고정해 표시할 때 사용합니다. */
  labelInside?: boolean;
  /**
   * 목록이 펼쳐지는 방향입니다. 기본은 'down'(선택 칸 아래, 아래 요소들을 밀어냄).
   *
   * 'up'은 선택 칸이 화면 아래쪽에 있어 아래로 펼치면 목록이 잘리거나 키보드에 가릴 때 씁니다.
   * 이때 목록은 화면 전체를 덮는 Modal 위에 그려집니다. 부모 안에서 absolute로 띄우면
   * 그림은 보이지만 부모 영역 밖이라 터치·스크롤이 전달되지 않아서(안드로이드·iOS 공통)
   * 목록을 스크롤하거나 고를 수 없기 때문입니다.
   */
  dropdownDirection?: 'down' | 'up';
  errorMessage?: string;
  disabled?: boolean;
  containerStyle?: StyleProp<ViewStyle>;
};

/**
 * 입력창 위·아래로 펼쳐지는 단일 선택 컴포넌트입니다.
 * 목록은 정해진 개수만큼의 높이로 제한되며, 그보다 많으면 목록 안에서 스크롤합니다.
 */
export function SelectInput<T extends string = string>({
  options,
  value,
  onChange,
  label,
  placeholder = '선택해 주세요',
  labelInside = false,
  dropdownDirection = 'down',
  errorMessage,
  disabled = false,
  containerStyle,
}: SelectInputProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  // 'up'일 때만 사용합니다. 목록을 띄울 때 잰 선택 칸의 화면상 위치입니다.
  const [anchor, setAnchor] = useState<TriggerAnchor | null>(null);
  const selectedOption = options.find((option) => option.value === value);
  const hasError = Boolean(errorMessage);
  const optionScrollRef = useRef<ScrollView>(null);
  const triggerRef = useRef<View>(null);

  const isDropdownUp = dropdownDirection === 'up';
  const visibleOptionCount = isDropdownUp ? VISIBLE_OPTION_COUNT_UP : VISIBLE_OPTION_COUNT_DOWN;
  // 한 번에 다 보여줄 수 없을 때만 스크롤바를 띄워, 목록이 더 있다는 걸 알 수 있게 합니다.
  const isScrollable = options.length > visibleOptionCount;
  // 실제로 그려질 목록 높이(테두리 위·아래 2px 포함). 위로 띄울 위치를 계산하는 데 씁니다.
  const dropdownHeight = Math.min(options.length, visibleOptionCount) * OPTION_HEIGHT + 2;

  const handleSelect = (selectedValue: T) => {
    // 선택값을 상위 화면에 전달한 뒤 목록을 닫습니다.
    onChange(selectedValue);
    setIsOpen(false);
  };

  /**
   * 목록을 엽니다. 'up'이면 Modal로 띄우기 때문에, 먼저 선택 칸의 화면상 위치를 재고
   * 그 값이 준비된 뒤에 열어야 목록이 엉뚱한 곳에서 한 프레임 깜빡이지 않습니다.
   */
  const handleToggle = () => {
    if (isOpen) {
      setIsOpen(false);
      return;
    }

    if (!isDropdownUp) {
      setIsOpen(true);
      return;
    }

    triggerRef.current?.measureInWindow((x, y, width, height) => {
      setAnchor({ x, y, width, height });
      setIsOpen(true);
    });
  };

  /**
   * 목록이 그려진 직후, 이미 선택된 항목이 스크롤 밖(아래쪽)에 있으면 보이는 위치까지 스크롤합니다.
   * 카테고리처럼 항목이 많으면 목록을 다시 열었을 때 지금 고른 항목이 안 보여서
   * "카테고리 일부가 없는 것처럼" 보이기 때문입니다.
   * (열 때마다 ScrollView가 새로 마운트되므로 onLayout이 매번 호출됩니다.)
   */
  const handleOptionScrollLayout = () => {
    const selectedIndex = options.findIndex((option) => option.value === value);
    if (selectedIndex < visibleOptionCount) return;

    optionScrollRef.current?.scrollTo({
      y: (selectedIndex - visibleOptionCount + 1) * OPTION_HEIGHT,
      animated: false,
    });
  };

  // 목록 본문은 아래로 펼칠 때(제자리)와 위로 펼칠 때(Modal) 모두 같아서 한 번만 만들어 씁니다.
  const optionList = (
    <ScrollView
      ref={optionScrollRef}
      bounces={false}
      keyboardShouldPersistTaps="handled"
      nestedScrollEnabled
      onLayout={handleOptionScrollLayout}
      // 안드로이드는 스크롤을 멈추면 스크롤바가 사라져서, 목록이 더 있다는 걸 놓치기 쉽습니다.
      persistentScrollbar={isScrollable}
      showsVerticalScrollIndicator={isScrollable}
      style={{ maxHeight: visibleOptionCount * OPTION_HEIGHT }}>
      {options.map((option) => {
        const isSelected = option.value === value;

        return (
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ selected: isSelected }}
            key={option.value}
            onPress={() => handleSelect(option.value)}
            style={({ pressed }) => [
              styles.option,
              isSelected && styles.selectedOption,
              pressed && styles.pressedOption,
            ]}>
            {/* 한 줄로 고정합니다. 줄바꿈되면 행 높이가 달라져 스크롤 위치 계산이 어긋납니다. */}
            <Text numberOfLines={1} style={[styles.optionText, isSelected && styles.selectedOptionText]}>
              {option.label}
            </Text>
          </Pressable>
        );
      })}
    </ScrollView>
  );

  /**
   * Modal로 띄우는 목록의 위치를 계산합니다.
   * 기본은 선택 칸 위지만, 위쪽 공간이 목록 높이보다 부족하면 아래로 붙여 잘리지 않게 합니다.
   */
  const getFloatingTop = (triggerAnchor: TriggerAnchor) => {
    const topWhenAbove = triggerAnchor.y - DROPDOWN_GAP - dropdownHeight;
    if (topWhenAbove >= SCREEN_EDGE_MARGIN) return topWhenAbove;
    return triggerAnchor.y + triggerAnchor.height + DROPDOWN_GAP;
  };

  return (
    <View style={[styles.container, containerStyle]}>
      {label && !labelInside ? <Text style={[styles.label, hasError && styles.errorText]}>{label}</Text> : null}

      <View>
        <Pressable
          ref={triggerRef}
          accessibilityLabel={label ?? placeholder}
          accessibilityRole="button"
          accessibilityState={{ disabled, expanded: isOpen }}
          disabled={disabled}
          onPress={handleToggle}
          style={({ pressed }) => [
            styles.trigger,
            labelInside && styles.triggerWithLabel,
            isOpen && styles.focused,
            hasError && styles.error,
            disabled && styles.disabled,
            pressed && !disabled && styles.pressedTrigger,
          ]}>
          <View style={[styles.valueArea, labelInside && styles.insideValueArea]}>
            {labelInside ? <Text style={[styles.insideLabel, hasError && styles.errorText]}>{label}</Text> : null}
            <Text
              numberOfLines={1}
              style={[
                styles.valueText,
                labelInside && styles.insideValueText,
                !selectedOption && styles.placeholder,
              ]}>
              {selectedOption?.label ?? placeholder}
            </Text>
          </View>
          <Text style={styles.chevron}>{isOpen ? '⌃' : '⌄'}</Text>
        </Pressable>

        {/* 아래로 펼칠 때는 예전과 똑같이 제자리에서 펼쳐, 아래 요소들을 밀어냅니다. */}
        {isOpen && !isDropdownUp ? <View style={styles.dropdown}>{optionList}</View> : null}
      </View>

      {errorMessage ? <Text style={[styles.errorMessage, styles.errorText]}>{errorMessage}</Text> : null}

      {/*
        위로 펼칠 때는 Modal 위에 그립니다. 화면 전체를 덮는 창이라 목록이 어떤 요소에도 가리지 않고,
        무엇보다 터치·스크롤이 정상적으로 전달됩니다.
        (statusBarTranslucent를 켜서 창 좌표계를 measureInWindow 결과와 맞춥니다.)
      */}
      {isOpen && isDropdownUp && anchor ? (
        <Modal
          animationType="none"
          onRequestClose={() => setIsOpen(false)}
          statusBarTranslucent
          transparent
          visible>
          {/* 목록 밖을 누르면 닫힙니다. */}
          <Pressable onPress={() => setIsOpen(false)} style={StyleSheet.absoluteFill} />
          <View
            style={[
              styles.dropdown,
              styles.dropdownFloating,
              { top: getFloatingTop(anchor), left: anchor.x, width: anchor.width },
            ]}>
            {optionList}
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { width: '100%' },
  label: { marginBottom: 6, color: Colors.light.placeholder, fontSize: 13, fontWeight: '600' },
  trigger: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 14,
    backgroundColor: Colors.light.inputBackground,
  },
  triggerWithLabel: {
    // DateInput과 같은 상단 여백과 높이를 사용해 카테고리·날짜를 나란히 정렬합니다.
    minHeight: 90,
    paddingVertical: 16,
    alignItems: 'stretch',
  },
  valueArea: {
    flex: 1,
    gap: 5,
  },
  // DateInput처럼 라벨을 필드 상단에 고정해 두 칸을 나란히 배치해도 기준선이 맞습니다.
  insideValueArea: {
    justifyContent: 'flex-start',
  },
  insideLabel: {
    color: Colors.light.text,
    fontSize: 13,
    fontWeight: '700',
  },
  valueText: { flex: 1, color: Colors.light.text, fontSize: 16 },
  insideValueText: { flex: 0, fontSize: 15 },
  placeholder: { color: Colors.light.placeholder },
  chevron: { marginLeft: 8, color: Colors.light.text, fontSize: 22, fontWeight: '700' },
  dropdown: {
    marginTop: DROPDOWN_GAP,
    borderWidth: 1,
    borderColor: Colors.light.border,
    borderRadius: 14,
    // 선택된 옵션의 배경도 드롭다운 둥근 모서리 안에서만 보이도록 합니다.
    overflow: 'hidden',
    backgroundColor: Colors.light.cardBackground,
    elevation: 4,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.14,
    shadowRadius: 8,
  },
  // Modal 안에서 선택 칸 위치에 맞춰 띄우는 목록. 위치는 화면 좌표로 직접 지정합니다.
  dropdownFloating: {
    position: 'absolute',
    marginTop: 0,
    elevation: 16,
    shadowOpacity: 0.2,
  },
  option: { minHeight: OPTION_HEIGHT, justifyContent: 'center', paddingHorizontal: 16 },
  // 선택 여부와 관계없이 행 높이를 유지하고 배경색만 변경합니다.
  selectedOption: { backgroundColor: Colors.light.primary },
  optionText: { color: Colors.light.text, fontSize: 16 },
  selectedOptionText: { color: Colors.onboarding.inverseText, fontWeight: '600' },
  focused: { borderColor: Colors.light.primary },
  error: { borderColor: Colors.light.danger },
  disabled: { backgroundColor: Colors.light.disabled, opacity: 0.7 },
  pressedTrigger: { opacity: 0.8 },
  pressedOption: { opacity: 0.75 },
  errorMessage: { minHeight: 20, marginTop: 4, fontSize: 12 },
  errorText: { color: Colors.light.danger },
});
