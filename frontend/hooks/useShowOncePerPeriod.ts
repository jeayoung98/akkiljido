import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';

// storageKey에 저장된 "마지막으로 보여준 기간 식별자"와 currentIdentifier(예: "2026-W32")를 비교해서,
// 다르면(=이 기간에 처음 들어온 것) true를 반환하고, 그 즉시 현재 식별자를 저장해 같은 기간엔 다시 안 뜨게 한다.
export function useShowOncePerPeriod(storageKey: string, currentIdentifier: string) {
  const [shouldShow, setShouldShow] = useState(false);

  useEffect(() => {
    let cancelled = false;

    AsyncStorage.getItem(storageKey).then((lastShownIdentifier) => {
      if (cancelled || lastShownIdentifier === currentIdentifier) {
        return;
      }
      setShouldShow(true);

      // 현재 기간 저장
      AsyncStorage.setItem(storageKey, currentIdentifier);
    });

    return () => {
      cancelled = true;
    };
  }, [storageKey, currentIdentifier]);

  return shouldShow;
}
