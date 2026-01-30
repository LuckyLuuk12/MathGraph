# MathGraph Enhancement Plan

## ✅ Completed Features

### 1. Undo/Redo Toolbar Buttons
- Added visual undo/redo buttons to the Toolbar component
- Buttons are disabled when there's no history to undo/redo
- Icons: ↶ (undo) and ↷ (redo)

### 2. Project Store with LocalStorage
- Created `project-store.ts` with full localStorage persistence
- Supports multiple projects with unique IDs
- Each project stores: name, canvas state, timestamps (created/updated)
- Auto-saves to localStorage on every change

## 🚧 In Progress / Next Steps

### 3. Multi-Project Support (Recommended Next Steps)

#### A. Update Home Page (`src/routes/+page.svelte`)
Replace the current example schema page with a project list:
- Grid of project cards showing name, dates, element counts
- "Create New Project" button
- Rename and delete project actions
- Click card to open project in modeler

#### B. Create Dynamic Modeler Route (`src/routes/modeler/[id]/+page.svelte`)
Move the existing modeler to accept a project ID parameter:
```svelte
<script lang="ts">
  import { page } from '$app/stores';
  import { onMount } from 'svelte';
  import { projectStore } from '$lib/stores/project-store';
  import { canvasStore } from '$lib/stores/canvas-store';
  
  const projectId = $page.params.id;
  
  onMount(() => {
    // Load project from store
    const project = projectStore.getCurrentProject();
    if (project && project.id === projectId) {
      // Initialize canvas with project data
      canvasStore.loadState(project.canvasState);
    }
  });
  
  // Auto-save on canvas changes
  $: {
    if ($canvasStore) {
      projectStore.updateProject(projectId, $canvasStore);
    }
  }
</script>
```

#### C. Add canvasStore.loadState() Method
Update `canvas-store.ts` to support loading saved state:
```typescript
loadState: (state: CanvasState) => {
  set(state);
  // Reset history after loading
  history = [{
    nodes: cloneMap(state.nodes),
    edges: cloneMap(state.edges)
  }];
  historyIndex = 0;
}
```

### 4. Constraints System (Future Enhancement)

#### Data Model Extension
Add constraints to the canvas types:
```typescript
export interface Constraint {
  id: string;
  type: 'uniqueness' | 'mandatory' | 'frequency' | 'valueRange' | 'subtype';
  appliesTo: string[];  // Node or edge IDs
  parameters?: Record<string, any>;
}

export interface CanvasState {
  // ... existing fields
  constraints: Map<string, Constraint>;
}
```

#### UI Components
- Constraints panel to list and manage constraints
- Visual indicators on canvas (e.g., uniqueness bar above nodes)
- Context menu to add constraints to selected elements

### 5. Custom Visuals Editor (Advanced Feature)

#### Concept
Allow users to create custom element types (e.g., "Generalization"):
- Define visual appearance (line style, arrowhead, color)
- Specify connection rules (what can connect to what)
- Add semantic meaning/logic

#### Implementation Approach
1. **Custom Element Definition Store**
   ```typescript
   interface CustomElementType {
     id: string;
     name: string;
     category: 'node' | 'edge';
     visual: {
       shape?: 'circle' | 'square' | 'diamond' | 'custom';
       lineStyle?: 'solid' | 'dashed' | 'dotted';
       arrowhead?: 'none' | 'simple' | 'diamond' | 'circle';
       color?: string;
     };
     semantics: {
       description: string;
       rules?: string[];  // Logic rules in natural language or DSL
     };
   }
   ```

2. **Editor UI** (`/routes/custom-elements`)
   - List of custom elements
   - Visual editor for creating new types
   - Preview canvas
   - Logic/rules editor (could start simple with text, evolve to visual logic)

3. **Dynamic Rendering**
   - Extend Canvas.svelte to render custom elements
   - Use element type registry to look up rendering function
   - Allow custom draw functions for advanced users

## 📋 Implementation Checklist

- [x] Add undo/redo buttons to toolbar
- [x] Create project store with localStorage
- [ ] Replace home page with project list
- [ ] Create /modeler/[id] dynamic route
- [ ] Add project loading to modeler
- [ ] Implement auto-save on canvas changes
- [ ] Add "Back to Projects" button in modeler header
- [ ] Add constraints data model
- [ ] Create constraints UI panel
- [ ] Design custom visuals system
- [ ] Implement custom elements editor

## 🎯 Immediate Actionable Items

1. **Test Current Features**
   - Verify undo/redo buttons work
   - Check that project store saves to localStorage

2. **Project List Home Page**
   - Use the code provided in this session
   - Replaces current example schema page
   - Provides clean project management

3. **Dynamic Modeler Route**
   - Copy existing modeler to `/modeler/[id]/+page.svelte`
   - Add project loading logic
   - Implement auto-save

4. **Constraints (Quick Start)**
   - Add a "Constraints" button to toolbar
   - Create simple panel to add/remove uniqueness constraints
   - Visual representation as colored bars/icons on elements

## 🚀 Getting Started

To continue this implementation:

1. Review the `project-store.ts` file created
2. Decide if you want to move forward with multi-project support
3. Let me know which feature to implement next, and I'll provide the complete code

## 💡 Design Decisions to Make

1. **Auto-save frequency**: Every change? Debounced (e.g., after 1 second of inactivity)?
2. **Project export/import**: Should users be able to export projects as JSON files?
3. **Constraint visualization**: How should different constraint types be displayed?
4. **Custom elements**: Start simple (predefined set) or full editor from the start?

Let me know which direction you'd like to take!
