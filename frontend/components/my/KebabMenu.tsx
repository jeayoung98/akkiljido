import { Ionicons } from '@expo/vector-icons';
import { useRef, useState } from 'react';
import { Dimensions, Modal, Pressable, StyleSheet, Text, View } from 'react-native';

import Colors from '@/constants/Colors';

export type KebabMenuAction = {
  key: string;
  label: string;
  onPress: () => void;
  /** 삭제처럼 되돌릴 수 없는 동작은 빨간 글씨로 강조합니다. */
  destructive?: boolean;
};

type KebabMenuProps = {
  actions: KebabMenuAction[];
  accessibilityLabel?: string;
};

const MENU_WIDTH = 160;
// item의 minHeight(44)와 같은 값. 메뉴가 실제로 뜨기 전에 높이를 미리 계산해서 아래/위 방향을 정하는 데 쓴다.
const MENU_ITEM_HEIGHT = 44;
const SCREEN_HEIGHT = Dimensions.get('window').height;

/**
 * 알림·장소 목록 행 등에서 쓰는 "⋮" 더보기 메뉴입니다. 목록 안에서 쓰이기 때문에(스크롤, 다른 행과
 * 겹침) 일반 절대 위치 대신 Modal로 화면 전체를 덮어서 항상 다른 행 위에 뜨게 하고, 버튼을 누른
 * 시점에 실제 화면 좌표(measureInWindow)를 재서 그 버튼 바로 아래에 메뉴를 붙입니다.
 */
export function KebabMenu({ actions, accessibilityLabel = '더보기' }: KebabMenuProps) {
  const triggerRef = useRef<View>(null);
  const [anchor, setAnchor] = useState<{ left: number; top: number } | null>(null);

  const handleOpen = () => {
    triggerRef.current?.measureInWindow((x, y, width, height) => {
      // 메뉴의 오른쪽 끝을 버튼의 오른쪽 끝에 맞추고, 화면 왼쪽 밖으로 나가지 않게 최솟값을 둔다.
      const left = Math.max(8, x + width - MENU_WIDTH);

      // 화면 하단 근처의 항목이면 아래로 펼칠 공간이 부족할 수 있어서, 트리거 아래에 다 안 들어가면
      // 위쪽에 펼친다(트리거 위 공간까지 부족한 극단적인 경우엔 화면 위로 안 벗어나게 최솟값을 둔다).
      const menuHeight = actions.length * MENU_ITEM_HEIGHT;
      const fitsBelow = y + height + 4 + menuHeight <= SCREEN_HEIGHT;
      const top = fitsBelow ? y + height + 4 : Math.max(8, y - menuHeight - 4);

      setAnchor({ left, top });
    });
  };

  const handleClose = () => setAnchor(null);

  const handleSelect = (action: KebabMenuAction) => {
    handleClose();
    action.onPress();
  };

  return (
    <>
      <Pressable
        accessibilityLabel={accessibilityLabel}
        accessibilityRole="button"
        hitSlop={8}
        onPress={handleOpen}
        ref={triggerRef}
        style={styles.trigger}>
        <Ionicons color={Colors.light.textSecondary} name="ellipsis-vertical" size={18} />
      </Pressable>

      {anchor ? (
        <Modal animationType="fade" onRequestClose={handleClose} transparent visible>
          <Pressable onPress={handleClose} style={StyleSheet.absoluteFill}>
            <View style={[styles.menu, { left: anchor.left, top: anchor.top }]}>
              {actions.map((action, index) => (
                <Pressable
                  key={action.key}
                  onPress={() => handleSelect(action)}
                  style={({ pressed }) => [
                    styles.item,
                    index > 0 && styles.itemDivider,
                    pressed && styles.itemPressed,
                  ]}>
                  <Text style={[styles.itemText, action.destructive && styles.itemTextDestructive]}>
                    {action.label}
                  </Text>
                </Pressable>
              ))}
            </View>
          </Pressable>
        </Modal>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  trigger: {
    padding: 6,
  },
  menu: {
    position: 'absolute',
    width: MENU_WIDTH,
    borderRadius: 12,
    backgroundColor: Colors.light.cardBackground,
    borderWidth: 1,
    borderColor: Colors.light.border,
    elevation: 6,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.16,
    shadowRadius: 10,
    overflow: 'hidden',
  },
  item: {
    minHeight: 44,
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  itemDivider: {
    borderTopWidth: 1,
    borderTopColor: Colors.light.border,
  },
  itemPressed: {
    backgroundColor: Colors.light.inputBackground,
  },
  itemText: {
    color: Colors.light.text,
    fontSize: 14,
    fontWeight: '600',
  },
  itemTextDestructive: {
    color: Colors.light.danger,
  },
});
