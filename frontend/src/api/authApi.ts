export type UserRole = 'GUEST' | 'USER';

export type LoginResult = {
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresIn: number;
};

type ApiResponse<T> = {
  success: boolean;
  code?: string;
  msg?: string;
  data?: T;
};

const apiBaseUrl = process.env.EXPO_PUBLIC_API_BASE_URL?.replace(/\/+$/, '');

export async function loginWithGoogle(idToken: string): Promise<LoginResult> {
  if (!apiBaseUrl) {
    throw new Error('API 서버 주소가 설정되지 않았습니다.');
  }

  const response = await fetch(`${apiBaseUrl}/api/v1/auth/oauth/google`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ idToken }),
  });

  const body = (await response.json()) as ApiResponse<LoginResult>;

  if (!response.ok || !body.success || !body.data) {
    throw new Error(body.msg ?? '백엔드 로그인에 실패했습니다.');
  }

  return body.data;
}
