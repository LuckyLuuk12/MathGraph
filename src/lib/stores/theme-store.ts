/**
 * Theme Store - Dark/Light Mode Management
 */

import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'light' | 'dark';

function getSystemTheme(): Theme {
  if (!browser) return 'light';
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function getStoredTheme(): Theme | null {
  if (!browser) return null;
  return localStorage.getItem('theme') as Theme | null;
}

function createThemeStore() {
  const initialTheme = getStoredTheme() || getSystemTheme();
  const { subscribe, set } = writable<Theme>(initialTheme);

  return {
    subscribe,
    toggle: () => {
      const newTheme = getStoredTheme() === 'dark' ? 'light' : 'dark';
      if (browser) {
        localStorage.setItem('theme', newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
      }
      set(newTheme);
    },
    set: (theme: Theme) => {
      if (browser) {
        localStorage.setItem('theme', theme);
        document.documentElement.setAttribute('data-theme', theme);
      }
      set(theme);
    },
    init: () => {
      if (browser) {
        const theme = getStoredTheme() || getSystemTheme();
        document.documentElement.setAttribute('data-theme', theme);
        set(theme);

        // Listen for system theme changes
        window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (e) => {
          if (!getStoredTheme()) {
            const newTheme = e.matches ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            set(newTheme);
          }
        });
      }
    }
  };
}

export const theme = createThemeStore();
