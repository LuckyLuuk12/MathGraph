/**
 * Local Storage Utility
 * Handles persistence: projects, current project, app state
 */

import { InformationStructure } from '$lib/theory/information-structure';
import type { Project } from '$lib/types';

const PROJECTS_KEY = 'mathgraph_projects';
const CURRENT_PROJECT_KEY = 'mathgraph_current_project_id';

/** Generate UUID v4 */
function genId(): string {
  return crypto.randomUUID();
}

/** Get all projects from localStorage */
export function getProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  const data = localStorage.getItem(PROJECTS_KEY);
  return data ? JSON.parse(data) : [];
}

/** Get current project ID */
export function getCurrentProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(CURRENT_PROJECT_KEY);
}

/** Get current project by ID */
export function getCurrentProject(): Project | null {
  const id = getCurrentProjectId();
  if (!id) return null;
  const projects = getProjects();
  return projects.find((p) => p.id === id) || null;
}

/** Create new project */
export function createProject(name: string): Project {
  const id = genId();
  const project: Project = {
    id,
    name,
    createdAt: new Date(),
    updatedAt: new Date(),
    informationStructure: new InformationStructure(),
    treeRepresentations: []
  };

  const projects = getProjects();
  projects.push(project);
  saveProjects(projects);
  setCurrentProjectId(id);

  return project;
}

/** Set current project ID */
export function setCurrentProjectId(id: string) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(CURRENT_PROJECT_KEY, id);
}

/** Save all projects */
function saveProjects(projects: Project[]) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
}

/** Update project */
export function updateProject(project: Project) {
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);
  if (idx >= 0) {
    projects[idx] = { ...project, updatedAt: new Date() };
    saveProjects(projects);
  }
}

/** Import full project JSON (overwrites if id exists) */
export function importProject(project: Project) {
  if (typeof window === 'undefined') return;
  const projects = getProjects();
  const idx = projects.findIndex((p) => p.id === project.id);

  // Normalize dates if needed
  const normalize = (d: any) => (d ? new Date(d) : new Date());

  const toSave: Project = {
    ...project,
    createdAt: normalize(project.createdAt),
    updatedAt: normalize(project.updatedAt)
  } as any;

  if (idx >= 0) projects[idx] = toSave;
  else projects.push(toSave);

  saveProjects(projects);
  setCurrentProjectId(toSave.id);
}

const VISUAL_KEY_PREFIX = 'mathgraph_visual_';

/** Save visual/editor state for a project */
export function saveVisualState(projectId: string, state: any) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(VISUAL_KEY_PREFIX + projectId, JSON.stringify(state));
  } catch (e) {
    // ignore quota errors
  }
}

/** Load visual/editor state for a project */
export function loadVisualState(projectId: string): any | null {
  if (typeof window === 'undefined') return null;
  const raw = localStorage.getItem(VISUAL_KEY_PREFIX + projectId);
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch (e) {
    return null;
  }
}