import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import type { AppTheme, ContentDensity, UserPreferences } from '@/types';

interface PreferencesState extends UserPreferences {
  hydratePreferences: (preferences: Partial<UserPreferences>) => void;
  setTheme: (theme: AppTheme) => void;
  setContentDensity: (density: ContentDensity) => void;
  setNotificationPreference: (
    key: keyof UserPreferences['notifications'],
    value: boolean,
  ) => void;
}

const defaultPreferences: UserPreferences = {
  language: 'fr',
  theme: 'light',
  contentDensity: 'comfortable',
  notifications: {
    emailEnabled: true,
    inAppEnabled: true,
    weeklyDigest: false,
    churnAlerts: true,
    marketingAlerts: true,
  },
};

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      hydratePreferences: (preferences) =>
        set((state) => ({
          ...state,
          ...preferences,
          notifications: {
            ...state.notifications,
            ...(preferences.notifications ?? {}),
          },
        })),

      setTheme: (theme) => set({ theme }),

      setContentDensity: (contentDensity) => set({ contentDensity }),

      setNotificationPreference: (key, value) =>
        set((state) => ({
          notifications: {
            ...state.notifications,
            [key]: value,
          },
        })),
    }),
    {
      name: 'attijari-preferences-store',
      storage: createJSONStorage(() => localStorage),
    },
  ),
);

export type { ContentDensity };
