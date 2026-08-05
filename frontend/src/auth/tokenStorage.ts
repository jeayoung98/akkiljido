import * as SecureStore from 'expo-secure-store';

import type {
  LoginResult,
  TokenResult,
  UserRole,
} from '@/src/api/authApi';

const AUTH_SESSION_KEY = 'auth.session';
const ACCESS_TOKEN_EXPIRATION_MARGIN_MS = 30 * 1000;

export type AuthSession = {
  role: UserRole;
  accessToken: string;
  refreshToken: string;
  accessTokenExpiresAt: number;
};

async function writeAuthSession(
  session: AuthSession,
): Promise<void> {
  await SecureStore.setItemAsync(
    AUTH_SESSION_KEY,
    JSON.stringify(session),
  );
}

export async function saveAuthSession(
  loginResult: LoginResult,
): Promise<void> {
  const session: AuthSession = {
    role: loginResult.role,
    accessToken: loginResult.accessToken,
    refreshToken: loginResult.refreshToken,
    accessTokenExpiresAt:
      Date.now() + loginResult.accessTokenExpiresIn * 1000,
  };

  await writeAuthSession(session);
}

export async function replaceAuthTokens(
  tokens: TokenResult,
): Promise<AuthSession> {
  const currentSession = await getAuthSession();

  if (!currentSession) {
    throw new Error('교체할 인증 세션이 없습니다.');
  }

  const updatedSession: AuthSession = {
    ...currentSession,
    accessToken: tokens.accessToken,
    refreshToken: tokens.refreshToken,
    accessTokenExpiresAt:
      Date.now() + tokens.accessTokenExpiresIn * 1000,
  };

  await writeAuthSession(updatedSession);

  return updatedSession;
}

export async function getAuthSession(): Promise<AuthSession | null> {
  const storedValue = await SecureStore.getItemAsync(AUTH_SESSION_KEY);

  if (!storedValue) {
    return null;
  }

  try {
    const parsedSession = JSON.parse(storedValue) as Partial<AuthSession>;

    if (
      (parsedSession.role !== 'GUEST' && parsedSession.role !== 'USER') ||
      !parsedSession.accessToken ||
      !parsedSession.refreshToken ||
      typeof parsedSession.accessTokenExpiresAt !== 'number'
    ) {
      await clearAuthSession();
      return null;
    }

    return parsedSession as AuthSession;
  } catch {
    await clearAuthSession();
    return null;
  }
}

export async function clearAuthSession(): Promise<void> {
  await SecureStore.deleteItemAsync(AUTH_SESSION_KEY);
}

export function isAccessTokenExpiring(
  session: AuthSession,
): boolean {
  return (
    session.accessTokenExpiresAt <=
    Date.now() + ACCESS_TOKEN_EXPIRATION_MARGIN_MS
  );
}
