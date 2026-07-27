// 다크모드를 지원하지 않는 앱이라 시스템 설정과 무관하게 항상 라이트로 고정
export const useColorScheme = () => 'light' as const;
