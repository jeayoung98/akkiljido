export type UserRole = 'GUEST' | 'USER';

export type TokenResult = {
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

export type LoginResult = TokenResult & {
  role: UserRole;
};

type ApiResponse<T> = {
  success: boolean;
  code?: string;
  msg?: string;
  data?: T;
};

export class AuthRequestError extends Error {
  readonly status: number;
  readonly code?: string;

  constructor(
    message: string,
    status: number,
    code?: string,
  ) {
    super(message);

    this.name = 'AuthRequestError';
    this.status = status;
    this.code = code;
  }
}

const apiBaseUrl =
  process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

function getApiBaseUrl(): string {
  if (!apiBaseUrl) {
    throw new Error(
      'API 서버 주소가 설정되지 않았습니다.',
    );
  }

  return apiBaseUrl;
}

async function readApiResponse<T>(
  response: Response,
): Promise<ApiResponse<T>> {
  const responseText = await response.text();

  if (!responseText) {
    return {
      success: response.ok,
    };
  }

  try {
    return JSON.parse(responseText) as ApiResponse<T>;
  } catch {
    throw new AuthRequestError(
      '백엔드 응답을 해석할 수 없습니다.',
      response.status,
    );
  }
}

export async function loginWithGoogle(
  idToken: string,
): Promise<LoginResult> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/auth/oauth/google`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        idToken,
      }),
    },
  );

  const body =
    await readApiResponse<LoginResult>(response);

  if (!response.ok || !body.success || !body.data) {
    throw new AuthRequestError(
      body.msg ?? '백엔드 로그인에 실패했습니다.',
      response.status,
      body.code,
    );
  }

  return body.data;
}

export async function reissueTokens(
  refreshToken: string,
): Promise<TokenResult> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/auth/token/reissue`,
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        refreshToken,
      }),
    },
  );

  const body =
    await readApiResponse<TokenResult>(response);

  if (!response.ok || !body.success || !body.data) {
    throw new AuthRequestError(
      body.msg ?? '토큰 재발급에 실패했습니다.',
      response.status,
      body.code,
    );
  }

  return body.data;
}

export async function logoutFromServer(
  accessToken: string,
): Promise<void> {
  const response = await fetch(
    `${getApiBaseUrl()}/api/v1/auth/logout`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
  );

  const body =
    await readApiResponse<void>(response);

  if (!response.ok || !body.success) {
    throw new AuthRequestError(
      body.msg ?? '로그아웃에 실패했습니다.',
      response.status,
      body.code,
    );
  }
}