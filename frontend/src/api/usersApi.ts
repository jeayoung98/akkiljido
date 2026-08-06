import type {
  TokenResult,
  UserRole,
} from '@/src/api/authApi';
import { apiRequest } from '@/src/api/apiClient';

export type NicknameRegistrationResult =
  TokenResult & {
    nickname: string;
    role: UserRole;
  };

export type UserProfile = {
  userId: number;
  nickname: string;
  provider: 'GOOGLE';
  role: UserRole;
};

export async function registerNickname(
  nickname: string,
): Promise<NicknameRegistrationResult> {
  return apiRequest<NicknameRegistrationResult>(
    '/api/v1/users/me/nickname',
    {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        nickname,
      }),
    },
  );
}

export async function getMyProfile(): Promise<UserProfile> {
  return apiRequest<UserProfile>(
    '/api/v1/users/me',
  );
}