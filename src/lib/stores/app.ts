/**
 * Here we mostly store app-wide state like what tool is selected, projects, loading status, navigation history, etc.
 */

import { writable } from 'svelte/store';
import type { Project, Tool } from '../types';
import { createProject, getCurrentProject, getProjects } from './localstorage';

/// Store to see if something is loading, the fullscreen loading component overlay will then auto-trigger and blur out / nearly fully darken the app.
export const isLoading = writable(true);
/// If undefined, we should attempt loading last active tool from local storage, if not found then we default to 'default' tool for landing page.
export const activeTool = writable<Tool>(undefined);
/// List of projects, if undefined we should attempt loading from local storage, if empty array then we have no projects.
export const projects = writable<Project[] | undefined>(undefined);
/// Current active project
export const currentProject = writable<Project | null>(null);

/// Runtime-only state for navigation history, not persisted, we use this to implement features like "back" and "forward" navigation between tools.
export const navigationHistory = writable<Tool[]>([]);

/// Init app state from localStorage
export function initializeApp() {
  const stored = getProjects();
  projects.set(stored);

  let current = getCurrentProject();

  // Auto-create if no projects exist
  if (stored.length === 0) {
    current = createProject('Default Project');
  }

  currentProject.set(current);
  isLoading.set(false);
}