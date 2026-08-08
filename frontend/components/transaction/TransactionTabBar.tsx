import { Pressable, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { Text } from '@/components/common/typography/Text';

import Colors from '@/constants/Colors';

export type TransactionTab = 'list' | 'calendar' | 'analysis';

type TransactionTabBarProps = {
  /** 현재 선택된 거래내역 보기 방식입니다. */
  value: TransactionTab;
  /** 탭을 누르면 부모 화면에서 목록·달력·분석 콘텐츠를 전환합니다. */
  onChange: (tab: TransactionTab) => void;
  style?: StyleProp<ViewStyle>;
};

const TABS: ReadonlyArray<{ label: string; value: TransactionTab }> = [
  { label: '리스트', value: 'list' },
  { label: '캘린더', value: 'calendar' },
  { label: '분석', value: 'analysis' },
];

/** 거래내역 화면에서 리스트·캘린더·분석 보기를 전환하는 공통 탭 바입니다. */
export function TransactionTabBar({ value, onChange, style }: TransactionTabBarProps) {
  return (
    <View accessibilityRole="tablist" style={[styles.container, style]}>
      {TABS.map((tab) => {
        const isSelected = tab.value === value;

        return (
          <Pressable
            accessibilityLabel={`${tab.label} 보기`}
            accessibilityRole="tab"
            accessibilityState={{ selected: isSelected }}
            key={tab.value}
            onPress={() => onChange(tab.value)}
            style={({ pressed }) => [styles.tab, pressed && styles.pressed]}>
            <Text style={[styles.label, isSelected && styles.selectedLabel]}>{tab.label}</Text>
            {isSelected ? <View style={styles.indicator} /> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: Colors.light.border,
    backgroundColor: Colors.light.cardBackground,
  },
  tab: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  label: {
    color: Colors.light.placeholder,
    fontSize: 14,
    fontWeight: '600',
  },
  selectedLabel: {
    color: Colors.light.primary,
    fontWeight: '800',
  },
  indicator: {
    position: 'absolute',
    right: 16,
    bottom: -1,
    left: 16,
    height: 2,
    borderRadius: 999,
    backgroundColor: Colors.light.primary,
  },
  pressed: {
    opacity: 0.65,
  },
});
