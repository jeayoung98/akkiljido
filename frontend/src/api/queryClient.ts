import { QueryClient } from '@tanstack/react-query';

/**
 * 앱 전체가 공유하는 react-query 클라이언트입니다.
 * 이 인스턴스 하나가 서버에서 받아온 데이터의 캐시를 들고 있어서,
 * A 화면에서 수정한 결과를 B 화면이 자동으로 다시 받아오게 만들 수 있습니다.
 *
 * 추가 패키지 없이 react-query만으로 동작하도록, 네트워크 감지(@react-native-community/netinfo)나
 * 앱 포커스 감지 같은 선택 설정은 넣지 않았습니다. 대신 수정·삭제 후에는 훅에서 직접
 * invalidateQueries를 호출해 갱신합니다.
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 같은 조건으로 다시 조회해도 30초 안이면 캐시를 그대로 씁니다(탭 전환 때마다 요청하지 않도록).
      staleTime: 30_000,
      // 서버가 4xx로 거절한 요청(잘못된 파라미터, 없는 거래 등)은 다시 보내도 결과가 같으므로 재시도하지 않습니다.
      retry: (failureCount, error) => {
        const status = (error as { status?: number }).status;
        if (status !== undefined && status >= 400 && status < 500) return false;
        return failureCount < 1;
      },
      // 웹 브라우저의 창 포커스 개념이라 React Native에서는 동작하지 않습니다. 오해가 없도록 명시적으로 끕니다.
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: false,
    },
  },
});
