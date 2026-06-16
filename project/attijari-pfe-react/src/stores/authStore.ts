import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { AppUser, AuthTokens } from '@/types';

interface AuthState {
  user: AppUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  rememberMe: boolean;
  logoutReason: 'manual' | 'expired' | null;
  login: (user: AppUser, tokens: AuthTokens, rememberMe?: boolean) => void;
  setUser: (user: AppUser | null) => void;
  setTokens: (tokens: Partial<AuthTokens>) => void;
  clearLogoutReason: () => void;
  logout: (reason?: 'manual' | 'expired') => void;
}

// If user chose "no remember me", clear auth when browser session ends.
// On page reload (F5), sessionStorage survives → stays logged in.
// On new browser window/tab open from cold start, sessionStorage is gone → auto-logout.
function checkSessionValidity() {
  if (typeof window === 'undefined') return;

  const stored = localStorage.getItem('attijari-auth-store');
  if (!stored) return;

  try {
    const parsed = JSON.parse(stored) as { state?: Partial<AuthState> };
    const state = parsed?.state;

    if (state?.isAuthenticated && state.rememberMe === false) {
      const sessionActive = sessionStorage.getItem('attijari-session');
      if (!sessionActive) {
        localStorage.removeItem('attijari-auth-store');
      }
    }
  } catch {
    // ignore malformed data
  }
}

checkSessionValidity();

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      accessToken: null,
      refreshToken: null,
      isAuthenticated: false,
      rememberMe: true,
      logoutReason: null,

      login: (user, tokens, rememberMe = true) => {
        sessionStorage.setItem('attijari-session', '1');
        set({
          user,
          accessToken: tokens.accessToken,
          refreshToken: tokens.refreshToken,
          isAuthenticated: true,
          rememberMe,
          logoutReason: null,
        });
      },

      setUser: (user) =>
        set((state) => ({
          user,
          isAuthenticated: user ? state.isAuthenticated : false,
        })),

      setTokens: (tokens) =>
        set((s) => ({
          accessToken: tokens.accessToken ?? s.accessToken,
          refreshToken: tokens.refreshToken ?? s.refreshToken,
        })),

      clearLogoutReason: () => set({ logoutReason: null }),

      logout: (reason = 'manual') => {
        sessionStorage.removeItem('attijari-session');
        set({
          user: null,
          accessToken: null,
          refreshToken: null,
          isAuthenticated: false,
          rememberMe: true,
          logoutReason: reason,
        });
      },
    }),
    {
      name: 'attijari-auth-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);
