// 여러 화면(지도 내 장소, 필터 등)에서 재사용하는 공용 Bottom Sheet.
// react-native-gesture-handler(Gesture.Pan) + react-native-reanimated 조합으로 구현했다.
// 원래는 RN 기본 PanResponder로 만들었는데, react-native-screens(탭/스택 네비게이션)의 네이티브 제스처와
// 충돌해서 네이티브 기기에서 드래그가 제대로 인식되지 않는 문제가 있어 이 조합으로 다시 만들었다.
// 드래그 중에는 손가락을 따라 모든 높이로 움직이고, 손을 떼면 그 자리에서 그대로 멈춘다(스냅 없음).
import { useEffect, useState, type ReactNode } from "react";
import { Dimensions, Modal, Pressable, StyleSheet, View } from "react-native";
import {
  Gesture,
  GestureDetector,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
} from "react-native-reanimated";

import Colors from "@/constants/Colors";

type CommonBottomSheetProps = {
  visible: boolean;
  onClose?: () => void;
  // 핸들 바로 아래, 스크롤되는 children 위에 오는 영역(제목 등). 핸들과 같은 드래그 영역으로 묶여서,
  // 이 부분을 눌러 끌어도 시트가 드래그된다. children은 리스트/스크롤이 들어갈 수 있어 드래그 영역 밖에 둔다.
  header?: ReactNode;
  children: ReactNode;
  minHeight?: number; // 화면 높이 대비 비율(0~1). 드래그로 줄일 수 있는 최소 높이. 기본 0.4
  maxHeight?: number; // 화면 높이 대비 비율(0~1). 드래그로 늘릴 수 있는 최대 높이. 기본 0.85
  initialHeight?: number; // 열릴 때 시작할 높이(비율). 기본값은 minHeight
  draggable?: boolean; // 드래그로 높이를 바꿀 수 있는지. 기본 true
  dismissOnDragDown?: boolean; // 최소 높이보다 더 내리면 닫히게 할지. 기본 true
  // 화면에 실제로 보이는 시트 높이(px)가 확정될 때마다 알려주는 콜백.
  // 열릴 때 한 번 + 드래그를 놓을 때마다 호출된다(드래그 중에는 호출하지 않는다 — 매 프레임 리렌더 방지).
  // 시트 안 내용물이 "지금 보이는 만큼"에 맞춰 스스로 크기를 조절해야 할 때 쓴다(예: 지도 탭 내 장소 목록).
  onVisibleHeightChange?: (heightPx: number) => void;
};

type ModalBottomSheetProps = CommonBottomSheetProps & {
  // Modal + 배경 딤 처리로 뜸, 뒤 화면은 조작 불가 (필터, 전체 리스트 등). 기본값이라 안 넘겨도 됨.
  modal?: true;
  closeOnBackdropPress?: boolean; // 배경(딤 처리 영역)을 눌러서 닫을지. 기본 true
};

type NonModalBottomSheetProps = CommonBottomSheetProps & {
  // Modal 없이 화면에 얹혀서 뜸, 배경 딤 처리 없음, 시트가 덮지 않은 영역은 뒤 화면(지도 등)이 계속 조작 가능.
  // 배경 자체가 없어서 closeOnBackdropPress는 받지 않는다(줘도 타입 에러).
  modal: false;
};

// modal=false일 땐 배경이 없어서 closeOnBackdropPress를 받지 않는다 — 두 모드를 하나의 타입으로 합치면
// 이 제약이 사라져서(무의미한 조합도 통과됨) 판별 유니언으로 나눴다.
type BottomSheetProps = ModalBottomSheetProps | NonModalBottomSheetProps;

const SCREEN_HEIGHT = Dimensions.get("window").height;
const DEFAULT_MIN_HEIGHT = 0.4;
const DEFAULT_MAX_HEIGHT = 0.85;
const DISMISS_THRESHOLD = 80; // 최소 높이보다 이만큼(px) 더 내리면 닫힘으로 판단
const FLICK_VELOCITY_THRESHOLD = 800; // 이 속도(px/s)보다 빠르게 아래로 튕기면 거리가 부족해도 닫힘
// overshootClamping: true로 목표값을 넘어서는 바운싱(오버슈트) 없이 딱 멈추게 한다
const SPRING_CONFIG = { damping: 20, stiffness: 200, overshootClamping: true };
// 최대 높이보다 더 위로 드래그했을 때, 시트 배경을 화면 아래로 이만큼 여유 있게 걸쳐두어
// 빈 틈으로 뒤 배경이 비치지 않게 한다(손을 떼면 어차피 최대 높이로 다시 clamp됨).
const OVERDRAG_BUFFER = 600;

export default function BottomSheet(props: BottomSheetProps) {
  const {
    visible,
    onClose,
    header,
    children,
    minHeight = DEFAULT_MIN_HEIGHT,
    maxHeight = DEFAULT_MAX_HEIGHT,
    initialHeight = minHeight,
    draggable = true,
    dismissOnDragDown = true,
    onVisibleHeightChange,
  } = props;
  const modal = props.modal ?? true;
  // modal=false면 애초에 배경(Pressable)이 없어서 이 값 자체가 의미 없다.
  const closeOnBackdropPress =
    props.modal === false ? false : (props.closeOnBackdropPress ?? true);

  // 비율(0~1)로 받은 높이들을 실제 픽셀로 변환한다.
  const minHeightPx = minHeight * SCREEN_HEIGHT;
  const maxHeightPx = maxHeight * SCREEN_HEIGHT;
  const initialHeightPx = initialHeight * SCREEN_HEIGHT;

  // translateY 값 규칙: 0이면 maxHeight만큼 다 보이는 상태.
  // 값이 커질수록 시트가 아래로 밀려나 더 많이 가려진다(=닫힘 방향).
  const translateY = useSharedValue(maxHeightPx);
  const startTranslateY = useSharedValue(maxHeightPx); // 드래그 시작 시점의 translateY
  const [mounted, setMounted] = useState(visible);

  // 워클릿(UI 스레드)에서 호출할 수 있도록 onClose를 평범한 JS 함수로 감싼다.
  const handleClose = () => {
    onClose?.();
  };

  // 워클릿(드래그 onEnd)에서 runOnJS로 호출할 수 있도록 감싼 버전.
  const notifyVisibleHeight = (heightPx: number) => {
    onVisibleHeightChange?.(heightPx);
  };

  useEffect(() => {
    if (visible) {
      setMounted(true);
    } else if (mounted) {
      translateY.value = withSpring(maxHeightPx, SPRING_CONFIG, (finished) => {
        if (finished) {
          runOnJS(setMounted)(false);
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [visible]);

  // Animated.View가 실제로 화면에 마운트된 뒤에 여는 애니메이션을 시작한다.
  // mounted=true로 바뀌는 것과 같은 effect에서 곧바로 애니메이션을 걸면, 웹에서는
  // 그 View가 아직 DOM에 없어서 reanimated가 애니메이션을 놓치는 경우가 있었다.
  useEffect(() => {
    if (mounted && visible) {
      translateY.value = withSpring(maxHeightPx - initialHeightPx, SPRING_CONFIG);
      // 열리는 애니메이션이 끝나면 시트는 initialHeight만큼 보이게 되므로, 그 값을 바로 알려준다.
      onVisibleHeightChange?.(initialHeightPx);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mounted]);

  // 드래그 핸들 영역에만 붙는 제스처. 시트 안쪽 리스트 등의 제스처와 겹치지 않는다.
  const panGesture = Gesture.Pan()
    .enabled(draggable)
    .onStart(() => {
      startTranslateY.value = translateY.value;
    })
    .onUpdate((event) => {
      translateY.value = startTranslateY.value + event.translationY;
    })
    .onEnd((event) => {
      const released = translateY.value;

      // 최소 높이보다 충분히 더 내렸거나, 아래로 빠르게 튕기면(거리가 조금 부족해도) 닫는다.
      const lowestTranslateY = maxHeightPx - minHeightPx;
      const draggedPastThreshold =
        released > lowestTranslateY + DISMISS_THRESHOLD;
      const flickedDown = event.velocityY > FLICK_VELOCITY_THRESHOLD;
      if (dismissOnDragDown && (draggedPastThreshold || flickedDown)) {
        translateY.value = withSpring(maxHeightPx, SPRING_CONFIG);
        runOnJS(handleClose)();
        return;
      }

      // 스냅 없이, 놓은 자리에서 그대로 멈춘다. 최소/최대 높이 범위 밖으로만 못 나가게 막는다.
      const clamped = Math.min(Math.max(released, 0), lowestTranslateY);
      translateY.value = withSpring(clamped, SPRING_CONFIG);
      // 손을 놓아 최종 높이가 확정된 시점에만, 화면에 보이게 될 시트 높이를 JS 스레드로 알려준다.
      runOnJS(notifyVisibleHeight)(maxHeightPx - clamped);
    });

  const sheetStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  if (!mounted) {
    return null;
  }

  // 시트 자체(핸들+내용)는 modal 여부와 무관하게 똑같다. 감싸는 컨테이너만 달라진다.
  const sheet = (
    <Animated.View
      style={[
        styles.sheet,
        { height: maxHeightPx + OVERDRAG_BUFFER, bottom: -OVERDRAG_BUFFER },
        sheetStyle,
      ]}
    >
      {/* sheet 자체는 오버드래그 여유분(OVERDRAG_BUFFER)까지 포함해서 화면보다 훨씬 크다.
          그 여유분이 handle/content의 flex 계산에 섞이지 않도록, "실제로 보이는 영역"만큼만인
          이 박스로 한 번 더 감싼다. 이 안에서는 flex:1이 항상 이 박스 기준으로만 계산된다. */}
      <View style={{ height: maxHeightPx }}>
        {draggable ? (
          <GestureDetector gesture={panGesture}>
            <View>
              <View style={styles.handleArea}>
                <View style={styles.handle} />
              </View>
              {header}
            </View>
          </GestureDetector>
        ) : (
          header
        )}
        <View style={styles.content}>{children}</View>
      </View>
    </Animated.View>
  );

  if (modal) {
    return (
      <Modal
        transparent
        visible={mounted}
        animationType="none"
        onRequestClose={handleClose}
        statusBarTranslucent
      >
        {/* Modal은 별도의 네이티브 화면으로 뜨기 때문에 앱 루트의 GestureHandlerRootView가 안 닿는다.
            제스처를 쓰려면 Modal 안에서 한 번 더 감싸야 한다. */}
        <GestureHandlerRootView style={styles.overlay}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeOnBackdropPress ? handleClose : undefined}
          />
          {sheet}
        </GestureHandlerRootView>
      </Modal>
    );
  }

  // modal=false: Modal/배경 딤 처리 없이 화면 트리 안에 그냥 얹는다.
  // pointerEvents="box-none"이라 이 컨테이너 자체는 터치를 가로채지 않고, 시트가 실제로 덮은 영역만 터치를 받는다.
  // (Modal이 아니라서 화면에 이미 있는 GestureHandlerRootView로 충분하다.)
  return (
    <View style={styles.nonModalOverlay} pointerEvents="box-none">
      {sheet}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.35)",
    justifyContent: "flex-end",
  },
  nonModalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: "flex-end",
  },
  sheet: {
    backgroundColor: Colors.light.cardBackground,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
  },
  handleArea: {
    paddingVertical: 10,
    alignItems: "center",
  },
  handle: {
    width: 40,
    height: 4,
    borderRadius: 2,
    backgroundColor: Colors.light.border,
  },
  content: {
    flex: 1,
  },
});
