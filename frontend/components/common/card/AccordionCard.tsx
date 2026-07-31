// 공용 아코디언 카드. 헤더를 탭하면 children(상세 내용)이 펼쳐지고 접힌다.
// 지도 탭의 가게별 거래 카드, 리포트 탭의 기간별 리포트 카드 등에서 재사용한다.
import { useState, type ReactNode } from 'react';
import { LayoutAnimation, Platform, Pressable, StyleProp, StyleSheet, UIManager, View, ViewStyle } from 'react-native';

import { IconButton } from '@/components/common/button/IconButton';
import Colors from '@/constants/Colors';

// Android 구 아키텍처에서는 LayoutAnimation을 쓰려면 명시적으로 켜줘야 함
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

type AccordionCardProps = {
  header: ReactNode; // 항상 보이는 부분. 헤더 줄 전체를 눌러도 토글된다.
  children: ReactNode; // 펼쳤을 때만 보이는 상세 내용
  defaultOpen?: boolean; // 처음부터 펼쳐진 상태로 시작할지 여부
  style?: StyleProp<ViewStyle>;
};

// 펼침/접힘 기능을 가진 공통 카드 컴포넌트
export default function AccordionCard({ header, children, defaultOpen = false, style }: AccordionCardProps) {
  const [open, setOpen] = useState(defaultOpen);

  // 펼침/접힘 상태 변경
  const toggle = () => {
    // 높이 변화에 애니메이션 적용
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setOpen((prev) => !prev);
  };

  return (
    <View style={[styles.card, style]}>
      <Pressable style={styles.header} onPress={toggle}>
        <View style={styles.headerContent}>{header}</View>
        {/* chevronDown 아이콘을 별도로 만들지 않고, 열렸을 때 180도 회전시켜 위쪽을 가리키게 한다 */}
        <IconButton
          name="chevronDown"
          color={Colors.light.cardAccent}
          onPress={toggle}
          style={open && styles.chevronOpen}
        />
      </Pressable>

      {open && (
        <>
          <View style={styles.divider} />
          <View style={styles.body}>{children}</View>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.light.cardBackground,
    borderRadius: 28,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  headerContent: {
    flex: 1,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.light.border,
    marginTop: 16,
    marginHorizontal: -24,
  },
  // 옅은 민트색 배경. 헤더 바로 아래부터 카드 맨 아래까지 꽉 채운다(바깥 카드의 상하 padding을 상쇄).
  body: {
    marginHorizontal: -24,
    marginBottom: -20,
    backgroundColor: Colors.light.cardMutedBackground,
    borderBottomLeftRadius: 28,
    borderBottomRightRadius: 28,
    padding: 20,
    gap: 20,
  },
  chevronOpen: {
    transform: [{ rotate: '180deg' }],
  },
});
