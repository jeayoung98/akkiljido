import { useEffect, useState } from 'react';
import { Keyboard, Platform } from 'react-native';

/**
 * 현재 화면을 덮고 있는 키보드의 높이(px)를 알려줍니다. 키보드가 닫혀 있으면 0입니다.
 *
 * 바텀시트처럼 화면 아래에 고정된 영역은 키보드가 올라와도 스스로 줄어들지 않아서
 * 아래쪽 입력창이 키보드에 가립니다. 이 값을 스크롤 영역의 아래 여백으로 더해 주면
 * 가려진 만큼 위로 스크롤할 수 있게 됩니다.
 *
 * iOS는 키보드가 서서히 올라오므로 will 이벤트를, 안드로이드는 will 이벤트가 없어
 * did 이벤트를 사용합니다.
 */
export function useKeyboardHeight() {
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSubscription = Keyboard.addListener(showEvent, (event) => {
      setKeyboardHeight(event.endCoordinates.height);
    });
    const hideSubscription = Keyboard.addListener(hideEvent, () => {
      setKeyboardHeight(0);
    });

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return keyboardHeight;
}
