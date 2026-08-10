import {
  AuthRequestError,
  reissueTokens,
} from '@/src/api/authApi';
import {
  clearAuthSession,
  getAuthSession,
  isAccessTokenExpiring,
  replaceAuthTokens,
} from '@/src/auth/tokenStorage';

type ApiResponse<T> = {
  success: boolean;
  code?: string;
  msg?: string;
  data?: T;
};

type RequestResult<T> = {
  response: Response;
  body: ApiResponse<T>;
};

export class ApiRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = 'ApiRequestError';
    this.status = status;
    this.code = code;
  }
}

export class SessionExpiredError extends Error {
  constructor(message = '로그인이 만료되었습니다. 다시 로그인해주세요.') {
    super(message);
    this.name = 'SessionExpiredError';
  }
}

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

let refreshPromise: Promise<string> | null = null;

function getApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error('API 서버 주소가 설정되지 않았습니다.');
  }

  return apiBaseUrl;
}

async function readResponse<T>(
  response: Response,
): Promise<ApiResponse<T>> {
  const responseText = await response.text();

  if (!responseText) {
    return { success: response.ok };
  }

  try {
    return JSON.parse(responseText) as ApiResponse<T>;
  } catch {
    return {
      success: false,
      msg: '백엔드 응답을 해석할 수 없습니다.',
    };
  }
}

async function requestOnce<T>(
  path: string,
  init: RequestInit,
  accessToken: string,
): Promise<RequestResult<T>> {
  const headers = new Headers(init.headers);
  headers.set('Authorization', `Bearer ${accessToken}`);

  const response = await fetch(`${getApiBaseUrl()}${path}`, {
    ...init,
    headers,
  });
  const body = await readResponse<T>(response);

  return { response, body };
}

async function performTokenRefresh(): Promise<string> {
  const session = await getAuthSession();

  if (!session?.refreshToken) {
    await clearAuthSession();
    throw new SessionExpiredError();
  }

  try {
    const tokens = await reissueTokens(session.refreshToken);
    await replaceAuthTokens(tokens);

    console.info('[auth] access token reissued', {
      tokensSaved: true,
    });

    return tokens.accessToken;
  } catch (error) {
    /*
     * 서버가 refresh token을 401로 거절한 경우에만 세션을 제거한다.
     * 네트워크 오류나 서버 500 오류에서는 재시도할 수 있도록 유지한다.
     */
    if (error instanceof AuthRequestError && error.status === 401) {
      await clearAuthSession();
      throw new SessionExpiredError(error.message);
    }

    throw error;
  }
}

export async function refreshAccessToken(): Promise<string> {
  if (!refreshPromise) {
    refreshPromise = performTokenRefresh().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

async function getValidAccessToken(): Promise<string> {
  const session = await getAuthSession();

  if (!session?.accessToken) {
    throw new SessionExpiredError();
  }

  if (isAccessTokenExpiring(session)) {
    return refreshAccessToken();
  }

  return session.accessToken;
}

export async function apiRequest<T>(
  path: string,
  init: RequestInit = {},
): Promise<T> {
  if (!path.startsWith('/')) {
    throw new Error('API 경로는 /로 시작해야 합니다.');
  }

  const accessToken = await getValidAccessToken();
  let result = await requestOnce<T>(path, init, accessToken);

  /*
   * access token이 서버에서 거절되면 refresh token으로
   * 재발급한 뒤 요청을 한 번만 재시도한다.
   */
  if (result.response.status === 401) {
    const reissuedAccessToken = await refreshAccessToken();
    result = await requestOnce<T>(path, init, reissuedAccessToken);

    if (result.response.status === 401) {
      await clearAuthSession();
      throw new SessionExpiredError();
    }
  }

  if (!result.response.ok || !result.body.success) {
    throw new ApiRequestError(
      result.body.msg ??
        `API 요청에 실패했습니다. (${result.response.status})`,
      result.response.status,
      result.body.code,
    );
  }

  return result.body.data as T;
}
