import { useEffect, useState } from 'react';

/**
 * 값이 `delay`(ms) 동안 더 바뀌지 않을 때만 갱신된 값을 돌려줍니다.
 * 검색창처럼 한 글자 칠 때마다 API를 부르면 안 되는 곳에서 씁니다.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState(value);

  useEffect(() => {
    const timerId = setTimeout(() => setDebouncedValue(value), delay);
    // 값이 또 바뀌면 이전 타이머를 취소해서, 입력이 멈춘 뒤 한 번만 반영되게 합니다.
    return () => clearTimeout(timerId);
  }, [value, delay]);

  return debouncedValue;
}
