/**
 * Integration layer between custom theory (sets/constraints) and the canvas visualizer
 * Allows custom sets defined in the theory page to be used as tools in the modeler
 */

import type { CustomSet, CustomConstraint, Point, UsageRule } from './theory-parser';
import type { Tool } from './canvas-types';

const CUSTOM_SETS_STORAGE_KEY = 'mathgraph_custom_sets';
const CUSTOM_CONSTRAINTS_STORAGE_KEY = 'mathgraph_custom_constraints';

/**
 * Load all custom sets from localStorage
 */
export function loadCustomSets(): CustomSet[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(CUSTOM_SETS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as CustomSet[];
  } catch (error) {
    console.error('Failed to load custom sets:', error);
    return [];
  }
}

/**
 * Load all custom constraints from localStorage
 */
export function loadCustomConstraints(): CustomConstraint[] {
  if (typeof window === 'undefined') return [];

  try {
    const data = localStorage.getItem(CUSTOM_CONSTRAINTS_STORAGE_KEY);
    if (!data) return [];
    return JSON.parse(data) as CustomConstraint[];
  } catch (error) {
    console.error('Failed to load custom constraints:', error);
    return [];
  }
}

/**
 * Convert a custom set to a canvas tool
 * This allows custom sets to appear in the toolbar and be drawn on the canvas
 */
export function customSetToTool(customSet: CustomSet): Tool & {
  nodeType: string;
  shape: CustomSet['shape'];
  customShape?: Point[];
  description?: string;
  usageRule: UsageRule;
} {
  return {
    id: `custom-${customSet.symbol}`,
    name: customSet.name,
    icon: customSet.symbol,
    cursor: 'crosshair',
    category: 'structure',
    nodeType: 'custom',
    shape: customSet.shape,
    customShape: customSet.customShape,
    description: customSet.description || `Custom set: ${customSet.name}`,
    usageRule: customSet.usageRule
  };
}

/**
 * Get all custom sets as canvas tools
 */
export function getCustomSetTools(): Array<Tool & {
  nodeType: string;
  shape: CustomSet['shape'];
  customShape?: Point[];
  description?: string;
  usageRule: CustomSet['usageRule'];
}> {
  const customSets = loadCustomSets();
  return customSets.map(customSetToTool);
}

/**
 * Scale custom shape points to fit a target size
 * Custom shapes are drawn at 200x200 in the editor, but may need different sizes in the canvas
 */
export function scaleCustomShape(points: Point[], targetWidth: number, targetHeight: number): Point[] {
  if (points.length === 0) return [];

  // Find bounds of original shape
  const minX = Math.min(...points.map(p => p.x));
  const maxX = Math.max(...points.map(p => p.x));
  const minY = Math.min(...points.map(p => p.y));
  const maxY = Math.max(...points.map(p => p.y));

  const originalWidth = maxX - minX;
  const originalHeight = maxY - minY;

  if (originalWidth === 0 || originalHeight === 0) return points;

  // Scale to fit target size while maintaining aspect ratio
  const scaleX = targetWidth / originalWidth;
  const scaleY = targetHeight / originalHeight;

  return points.map(p => ({
    x: (p.x - minX) * scaleX,
    y: (p.y - minY) * scaleY
  }));
}

/**
 * Draw a custom shape on canvas context
 */
export function drawCustomShape(
  ctx: CanvasRenderingContext2D,
  points: Point[],
  x: number,
  y: number,
  width: number,
  height: number
) {
  if (points.length < 3) return;

  const scaledPoints = scaleCustomShape(points, width, height);

  ctx.beginPath();
  ctx.moveTo(x + scaledPoints[0].x, y + scaledPoints[0].y);

  for (let i = 1; i < scaledPoints.length; i++) {
    ctx.lineTo(x + scaledPoints[i].x, y + scaledPoints[i].y);
  }

  ctx.closePath();
  ctx.fill();
  ctx.stroke();
}

/**
 * Check if a point is inside a custom shape (for click detection)
 * Uses ray casting algorithm
 */
export function isPointInCustomShape(
  point: Point,
  shapePoints: Point[],
  x: number,
  y: number,
  width: number,
  height: number
): boolean {
  if (shapePoints.length < 3) return false;

  const scaledPoints = scaleCustomShape(shapePoints, width, height);
  const testX = point.x - x;
  const testY = point.y - y;

  let inside = false;
  for (let i = 0, j = scaledPoints.length - 1; i < scaledPoints.length; j = i++) {
    const xi = scaledPoints[i].x;
    const yi = scaledPoints[i].y;
    const xj = scaledPoints[j].x;
    const yj = scaledPoints[j].y;

    const intersect = ((yi > testY) !== (yj > testY)) &&
      (testX < (xj - xi) * (testY - yi) / (yj - yi) + xi);

    if (intersect) inside = !inside;
  }

  return inside;
}

/**
 * Get connection point on custom shape boundary
 * Returns the point on the shape's edge closest to the target point
 */
export function getCustomShapeConnectionPoint(
  shapePoints: Point[],
  shapeX: number,
  shapeY: number,
  width: number,
  height: number,
  targetPoint: Point
): Point {
  if (shapePoints.length === 0) {
    // Fallback to center
    return { x: shapeX + width / 2, y: shapeY + height / 2 };
  }

  const scaledPoints = scaleCustomShape(shapePoints, width, height);
  const center = { x: shapeX + width / 2, y: shapeY + height / 2 };

  // Find intersection of line from center to target with shape boundary
  let closestPoint = scaledPoints[0];
  let minDistance = Infinity;

  for (let i = 0; i < scaledPoints.length; i++) {
    const p1 = scaledPoints[i];
    const p2 = scaledPoints[(i + 1) % scaledPoints.length];

    // Check intersection of edge with line from center to target
    const intersection = lineIntersection(
      center,
      targetPoint,
      { x: shapeX + p1.x, y: shapeY + p1.y },
      { x: shapeX + p2.x, y: shapeY + p2.y }
    );

    if (intersection) {
      const dist = distance(intersection, targetPoint);
      if (dist < minDistance) {
        minDistance = dist;
        closestPoint = { x: intersection.x - shapeX, y: intersection.y - shapeY };
      }
    }
  }

  return { x: shapeX + closestPoint.x, y: shapeY + closestPoint.y };
}

// Helper functions
function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

function lineIntersection(p1: Point, p2: Point, p3: Point, p4: Point): Point | null {
  const x1 = p1.x, y1 = p1.y;
  const x2 = p2.x, y2 = p2.y;
  const x3 = p3.x, y3 = p3.y;
  const x4 = p4.x, y4 = p4.y;

  const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
  if (Math.abs(denom) < 1e-10) return null;

  const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
  const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

  if (t >= 0 && t <= 1 && u >= 0 && u <= 1) {
    return {
      x: x1 + t * (x2 - x1),
      y: y1 + t * (y2 - y1)
    };
  }

  return null;
}
