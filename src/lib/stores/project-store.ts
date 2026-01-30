/**
 * Project Store - Manages multiple diagram projects with localStorage persistence
 */

import { writable, get } from 'svelte/store';
import type { CanvasState } from '../canvas-types';

export interface Project {
  id: string;
  name: string;
  canvasState: CanvasState;
  createdAt: string;
  updatedAt: string;
}

interface ProjectStoreState {
  projects: Map<string, Project>;
  currentProjectId: string | null;
}

const STORAGE_KEY = 'mathgraph_projects';
const CURRENT_PROJECT_KEY = 'mathgraph_current_project';

function loadFromLocalStorage(): ProjectStoreState {
  if (typeof window === 'undefined') {
    return { projects: new Map(), currentProjectId: null };
  }

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    const currentId = localStorage.getItem(CURRENT_PROJECT_KEY);

    if (stored) {
      const parsed = JSON.parse(stored) as any[];
      // Convert arrays back to Maps
      const projects = new Map<string, Project>(
        parsed.map((p) => [
          p.id,
          {
            ...p,
            canvasState: {
              ...p.canvasState,
              nodes: new Map(p.canvasState.nodes),
              edges: new Map(p.canvasState.edges),
              selectedNodes: new Set(p.canvasState.selectedNodes || []),
              selectedEdges: new Set(p.canvasState.selectedEdges || [])
            }
          }
        ])
      );
      return { projects, currentProjectId: currentId };
    }
  } catch (error) {
    console.error('Failed to load projects from localStorage:', error);
  }

  return { projects: new Map(), currentProjectId: null };
}

function saveToLocalStorage(state: ProjectStoreState) {
  if (typeof window === 'undefined') return;

  try {
    // Convert Maps to arrays for JSON serialization
    const projectsArray = Array.from(state.projects.values()).map(project => ({
      ...project,
      canvasState: {
        ...project.canvasState,
        nodes: Array.from(project.canvasState.nodes.entries()),
        edges: Array.from(project.canvasState.edges.entries()),
        selectedNodes: Array.from(project.canvasState.selectedNodes),
        selectedEdges: Array.from(project.canvasState.selectedEdges)
      }
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(projectsArray));
    if (state.currentProjectId) {
      localStorage.setItem(CURRENT_PROJECT_KEY, state.currentProjectId);
    } else {
      localStorage.removeItem(CURRENT_PROJECT_KEY);
    }
  } catch (error) {
    console.error('Failed to save projects to localStorage:', error);
  }
}

function createProjectStore() {
  const initialState = loadFromLocalStorage();
  const { subscribe, set, update } = writable<ProjectStoreState>(initialState);

  return {
    subscribe,

    createProject: (name: string): string => {
      const id = crypto.randomUUID();
      const now = new Date().toISOString();

      const newProject: Project = {
        id,
        name,
        canvasState: {
          nodes: new Map(),
          edges: new Map(),
          constraints: new Map(),
          selectedNodes: new Set(),
          selectedEdges: new Set(),
          selectedConstraints: new Set(),
          zoom: 1,
          pan: { x: 0, y: 0 },
          isDrawingEdge: false,
          isCreatingConstraint: false
        },
        createdAt: now,
        updatedAt: now
      };

      update(state => {
        state.projects.set(id, newProject);
        state.currentProjectId = id;
        saveToLocalStorage(state);
        return state;
      });

      return id;
    },

    loadProject: (id: string) => {
      update(state => {
        if (state.projects.has(id)) {
          state.currentProjectId = id;
          saveToLocalStorage(state);
        }
        return state;
      });
    },

    updateProject: (id: string, canvasState: CanvasState) => {
      update(state => {
        const project = state.projects.get(id);
        if (project) {
          project.canvasState = canvasState;
          project.updatedAt = new Date().toISOString();
          state.projects.set(id, project);
          saveToLocalStorage(state);
        }
        return state;
      });
    },

    renameProject: (id: string, name: string) => {
      update(state => {
        const project = state.projects.get(id);
        if (project) {
          project.name = name;
          project.updatedAt = new Date().toISOString();
          state.projects.set(id, project);
          saveToLocalStorage(state);
        }
        return state;
      });
    },

    deleteProject: (id: string) => {
      update(state => {
        state.projects.delete(id);
        if (state.currentProjectId === id) {
          state.currentProjectId = null;
        }
        saveToLocalStorage(state);
        return state;
      });
    },

    getCurrentProject: (): Project | null => {
      const state = get({ subscribe });
      if (state.currentProjectId) {
        return state.projects.get(state.currentProjectId) || null;
      }
      return null;
    },

    getAllProjects: (): Project[] => {
      const state = get({ subscribe });
      return Array.from(state.projects.values())
        .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
    }
  };
}

export const projectStore = createProjectStore();
