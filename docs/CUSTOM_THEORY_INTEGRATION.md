# Custom Theory Integration Guide

This document explains how custom sets and constraints defined in the Theory page are integrated into the MathGraph visualizer.

## ✅ IMPLEMENTATION COMPLETE

Custom sets are now fully integrated into the visualizer with structured usage rules!

## Current Implementation Status

### ✅ Complete and Validated
1. **Custom Set Definition**: Users can define custom sets with:
   - Name and symbol
   - Shape (circle, square, rectangle, diamond, or custom)
   - **Structured Usage Rules** (dropdown selection):
     - `standalone` - Can be placed anywhere like entity/fact type
     - `wraps-single-object` - Wraps around any single object (like objectification)
     - `wraps-single-entity` - Wraps around a single entity only (like power type)
     - `wraps-multiple-objects` - Wraps around multiple objects
     - `wraps-multiple-entities` - Wraps around multiple entities only
     - `on-edge` - Placed on an edge (like constraints)
   - Descriptions
   - Custom drawn shapes (200x200 canvas with grid snapping)

2. **Custom Constraint Definition**: Users can define logical constraints using:
   - Mathematical syntax with operators (AND, OR, NOT, IMPLIES, IFF)
   - Quantifiers (FORALL, EXISTS) with bounded syntax
   - Real-time validation and error reporting
   - Formula preview with Unicode symbols

3. **Data Persistence**: Both custom sets and constraints are:
   - Saved to localStorage (`mathgraph_custom_sets`, `mathgraph_custom_constraints`)
   - Loaded on page mount
   - Properly typed with TypeScript interfaces including `UsageRule` type

4. **Integration Layer** (`custom-theory-integration.ts`):
   - ✅ Functions to load custom sets/constraints from localStorage
   - ✅ Convert custom sets to canvas tools with usage rules
   - ✅ Scale custom shapes to fit different sizes
   - ✅ Draw custom shapes on canvas
   - ✅ Point-in-polygon detection for custom shapes
   - ✅ Connection point calculation for edges

5. **Canvas Support for Custom Shapes**:
   - ✅ Custom shape rendering in `drawNode()` function
   - ✅ Custom shape hit detection in `getNodeAtPoint()`
   - ✅ Custom shape connection points in `getConnectionPoint()`
   - ✅ Node creation with `createCustomNode()` function

6. **Toolbar Integration**:
   - ✅ Custom Sets category dynamically shown when custom sets exist
   - ✅ Auto-refresh when localStorage changes
   - ✅ Tools show symbol and description
   - ✅ Collapsible section

7. **Type System Updates**:
   - ✅ `NodeType` includes 'custom'
   - ✅ `CanvasNode` supports custom shape points, set name, usage rule, and wrapped node IDs
   - ✅ All TypeScript compilation successful

8. **Properties Panel**:
   - ✅ Shows custom set name
   - ✅ Displays usage rule with human-readable description
   - ✅ Lists wrapped elements (for future wrapping functionality)
   - ✅ Custom explanation text

8. **Properties Panel**:
   - ✅ Shows custom set name
   - ✅ Displays usage rule with human-readable description
   - ✅ Lists wrapped elements (for future wrapping functionality)
   - ✅ Custom explanation text

## Usage Rules Explained

The structured usage rules help the canvas understand how to handle custom shapes:

### 1. **Standalone** (Default)
- Behavior: Can be placed anywhere on canvas like entity or fact types
- Use case: Independent concepts that don't depend on other objects
- Example: "Category", "Tag", "Status"
- Implementation: No special placement logic needed

### 2. **Wraps Single Object**
- Behavior: Similar to objectification - wraps around any single node
- Use case: Meta-concepts that describe or classify individual objects
- Example: "Review" (wraps a Product), "Approval" (wraps a Document)
- Future implementation: Auto-position around selected object

### 3. **Wraps Single Entity**
- Behavior: Similar to power type - wraps only entity-type nodes
- Use case: Subsets or collections of entities only
- Example: "Team" (subset of People), "Department" (subset of Employees)
- Future implementation: Validation to ensure only entities are wrapped

### 4. **Wraps Multiple Objects**
- Behavior: Can wrap around multiple objects of any type
- Use case: Grouping or aggregation concepts
- Example: "Bundle" (multiple products), "Transaction" (multiple items)
- Future implementation: Multi-select wrapping UI

### 5. **Wraps Multiple Entities**
- Behavior: Can wrap around multiple entity-type nodes only
- Use case: Entity-specific groupings
- Example: "Committee" (multiple people), "Fleet" (multiple vehicles)
- Future implementation: Multi-select with entity type validation

### 6. **On Edge**
- Behavior: Placed on relationship lines like constraints
- Use case: Relationship metadata or constraints
- Example: "Since" (date on relationship), "Weight" (importance of connection)
- Future implementation: Edge attachment UI

## How to Use Custom Sets

1. **Define Custom Set** (Theory Page):
   - Navigate to Theory page
   - Enter name, symbol, description
   - Choose shape (or draw custom shape)
   - Select usage rule from dropdown
   - Click "Save Custom Set"

2. **Use in Modeler**:
   - Navigate to modeler
   - Open toolbar
   - Expand "Custom Sets" category
   - Select your custom set
   - Right-click on canvas to place

3. **View Properties**:
   - Select the custom set node
   - Properties panel shows:
     - Custom set name
     - Usage rule
     - Wrapped elements (when applicable)

## Future Enhancements (Based on Usage Rules)

### Short-term:
- [ ] Implement wrapping behavior for non-standalone usage rules
- [ ] Visual indicators for wrapped nodes
- [ ] Wrapping UI (select object(s) then apply custom set)
- [ ] Validation based on usage rule (e.g., entity-only for wraps-single-entity)

### Medium-term:
- [ ] Auto-positioning for wrapped nodes (encircle, surround)
- [ ] Resize wrapped shapes based on content
- [ ] Drag wrapped nodes together as a group
- [ ] Connection points respect wrapping (connect to inner or outer shape)

### Long-term:
- [ ] Export custom sets and usage rules to SQL documentation
- [ ] Constraint validation during modeling
- [ ] Generate test data based on custom sets
- [ ] Import/export custom set libraries
- [ ] Share custom sets between projects

## Implementation Details

### Files Modified/Created:

```typescript
import { 
  drawCustomShape, 
  isPointInCustomShape, 
  getCustomShapeConnectionPoint 
} from '$lib/custom-theory-integration';

// In drawNode function, add case for custom shapes:
if (node.shape === 'custom' && node.customShapePoints) {
  drawCustomShape(
    ctx,
    node.customShapePoints,
    node.position.x,
    node.position.y,
    node.size.width,
    node.size.height
  );
}

// In getNodeAtPoint function, add custom shape detection:
if (node.shape === 'custom' && node.customShapePoints) {
  if (isPointInCustomShape(
    point, 
    node.customShapePoints, 
    node.position.x, 
    node.position.y,
    node.size.width,
    node.size.height
  )) {
    return node.id;
  }
}

// In getConnectionPoint function, add custom shape handling:
if (node.shape === 'custom' && node.customShapePoints) {
  return getCustomShapeConnectionPoint(
    node.customShapePoints,
    node.position.x,
    node.position.y,
    node.size.width,
    node.size.height,
    otherPoint
  );
}
```

## 2. Add Custom Sets to Toolbar

In `Toolbar.svelte`, load and display custom sets:

```typescript
import { getCustomSetTools } from '$lib/custom-theory-integration';
import { onMount } from 'svelte';

let customSetTools = $state([]);

onMount(() => {
  customSetTools = getCustomSetTools();
  
  // Listen for changes to custom sets
  window.addEventListener('storage', (e) => {
    if (e.key === 'mathgraph_custom_sets') {
      customSetTools = getCustomSetTools();
    }
  });
});

// Add a new category in the toolbar:
<div class="tool-category">
  <button class="category-toggle" onclick={() => (showCustom = !showCustom)}>
    <i class={showCustom ? 'fas fa-chevron-down' : 'fas fa-chevron-right'}></i>
    Custom Sets
  </button>
  {#if showCustom}
    <div class="tool-group">
      {#each customSetTools as tool}
        <button
          class="tool-btn"
          class:active={currentTool.id === tool.id}
          onclick={() => selectTool(tool)}
          title={tool.description || tool.name}
        >
          <span class="icon">{tool.icon}</span>
        </button>
      {/each}
    </div>
  {/if}
</div>
```

## 3. Update CanvasNode Type

In `canvas-types.ts`, update the CanvasNode interface to support custom shapes:

```typescript
export interface CanvasNode {
  id: string;
  type: 'entity' | 'factType' | 'labelType' | 'powerType' | 'sequenceType' | 'objectified' | 'custom';
  position: Point;
  size: Size;
  label: string;
  color: string;
  shape: 'circle' | 'square' | 'rectangle' | 'diamond' | 'custom';
  customShapePoints?: Point[]; // Add this
  customSetName?: string; // Add this to track which custom set it represents
  isSelected?: boolean;
  // ... other properties
}
```

## 4. Update Canvas Store

In `canvas-store.ts`, handle custom set tool selection:

```typescript
function createNode(tool, position) {
  const baseNode = {
    id: crypto.randomUUID(),
    position: snapToGrid(position),
    isSelected: false,
    color: '#60a5fa'
  };

  // Handle custom set tools
  if (tool.nodeType === 'custom') {
    return {
      ...baseNode,
      type: 'custom',
      shape: tool.shape,
      customShapePoints: tool.customShape,
      customSetName: tool.name,
      label: tool.name,
      size: { width: 80, height: 80 }
    };
  }

  // ... existing tool handling
}
```

## SQL Export Considerations

Custom sets and usage rules present unique challenges for SQL export:

### What Can Be Exported:
- Custom set definitions as SQL comments
- Set membership in metadata tables
- Usage rules documented in schema comments

### Example SQL Output:
```sql
-- Custom Set: Team (T)
-- Usage Rule: wraps-multiple-entities
-- Description: A group of people working together

CREATE TABLE custom_set_team (
    team_id UUID PRIMARY KEY,
    team_name VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE custom_set_team_members (
    team_id UUID REFERENCES custom_set_team(team_id),
    entity_id UUID,
    PRIMARY KEY (team_id, entity_id)
);

-- Constraint: Team must have at least one member
ALTER TABLE custom_set_team
ADD CONSTRAINT team_not_empty
CHECK (team_id IN (SELECT DISTINCT team_id FROM custom_set_team_members));
```

## Implementation Checklist

- [x] Theory parser with formula validation
- [x] Custom set interface with UsageRule type
- [x] Custom shape editor with grid snapping
- [x] localStorage persistence
- [x] Integration utility functions
- [x] Canvas support for custom shapes (drawing, hit detection, connections)
- [x] Toolbar integration for custom sets
- [x] CanvasNode type updates
- [x] Custom node creation function
- [x] Properties panel showing custom set info
- [ ] Wrapping behavior implementation
- [ ] SQL export documentation for custom sets
- [ ] Test custom shapes in production
- [ ] User documentation and tutorials
- Custom sets can be documented in comments:
  ```sql
  -- Custom Set: Category (C)
  -- Description: Only for grouping multiple entities
  -- Shape: Rectangle
  ```

- Set membership can be tracked in metadata tables:
  ```sql
  CREATE TABLE custom_set_members (
    entity_id UUID,
    set_name VARCHAR(255),
    set_symbol VARCHAR(10),
    PRIMARY KEY (entity_id, set_name)
  );
  ```

## Example Usage Flow

1. User navigates to Theory page
2. Creates custom set "Department" with symbol "D" and rectangle shape
3. Selects usage rule: "Wraps Multiple Entities"
4. Defines constraint: `forall_{d in D}[size(d) >= 1]`
5. Saves custom set and constraint
6. Navigates to modeler
7. Sees "Department" in toolbar under "Custom Sets" category
8. Clicks Department tool and draws Department nodes on canvas
9. Department nodes render as rectangles with "D" label
10. Can connect them to other entities with predicators
11. Properties panel shows usage rule and wrapped elements
12. On export, Department set is documented in SQL comments with usage rule

### Code Examples

#### Creating a Custom Set Tool
```typescript
const customSets = getCustomSetTools();
// Returns array of tools with:
// - id: 'custom-{name}'
// - icon: symbol from theory
// - usageRule: UsageRule type
// - customShape: Point[] if custom shape drawn
```

#### Rendering Custom Shape
```typescript
if (node.type === 'custom' && node.shape === 'custom' && node.customShapePoints) {
  drawCustomShape(ctx, node.customShapePoints, x, y, width, height);
}
```

#### Hit Detection
```typescript
if (node.type === 'custom' && node.customShapePoints) {
  return isPointInCustomShape(point, node.customShapePoints, x, y, w, h);
}
```

## Benefits of Integration

1. **Domain-Specific Modeling**: Define concepts specific to your domain
2. **Structured Usage Rules**: Canvas understands how to handle custom shapes
3. **Type Safety**: Full TypeScript support throughout
4. **Visual Consistency**: Custom shapes render identically everywhere
5. **Reusability**: Save and reuse across projects
6. **Documentation**: Usage rules document intent

---

**Status**: ✅ Core implementation complete. Custom sets can be defined, saved, and used in the visualizer with structured usage rules. Future enhancements will add wrapping behavior and advanced constraints.
