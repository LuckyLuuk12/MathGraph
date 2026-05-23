import type { ObjectId, ObjectKind, PredicatorId } from '$lib/theory/types';

/**
 * Basic Geometric Primitives
 */
export interface Point { x: number; y: number; }
export interface Dimension { width: number; height: number; }

/** 
 * Predefined connection points on a shape's perimeter for drawing links.
 */
export interface ConnectionPoint extends Point {
  id: string;
}

type PointPair = [Point, Point];

/**
 * Visual Shape Kinds based on PSM/ORM Theory
 */
export type VisualShapeKind =
  | 'ENTITY_CIRCLE'       // Solid circle
  | 'LABEL_CIRCLE'        // Dashed circle
  | 'FACT_BOX_N'          // n-connected squares
  | 'OBJECTIFIED_FACT'    // Circle/Ellipse around a fact box
  | 'POWER_TYPE_CIRCLE'   // Double circle (Circle around a circle)
  | 'SEQUENCE_TYPE_BOX';  // Rectangle/Box around a circle

/**
 * Link Kinds for relationships and hierarchies
 */
export type LinkKind =
  | 'PREDICATOR_LINE'       // Standard solid line
  | 'SPECIALIZATION_ARROW'  // Solid arrow (Subtype -> Supertype)
  | 'GENERALIZATION_ARROW'; // Dashed/Dotted arrow (Specifier -> General)

/**
 * Representation of a specific role (square) within a fact type box.
 * Predicators connect to these squares.
 */
export interface VisualRoleSquare {
  predicatorId: PredicatorId;
  center: Point; // Global canvas center of this specific square
  connectionPoints: ConnectionPoint[];
}

export interface VisualNode {
  id: ObjectId;
  kind: VisualShapeKind;
  position: Point; // Center of the whole shape
  dimensions: Dimension;
  connectionPoints: ConnectionPoint[]; // Points for the outer container
  label?: string; // Optional label for display
  fillColor?: string;
  isObjectified?: boolean;
  arity?: number;
  roles?: VisualRoleSquare[]; // Specific for FACT shapes
}

export interface VisualLink {
  fromId: ObjectId | PredicatorId;
  toId: ObjectId | PredicatorId;
  kind: LinkKind;
  path: Point[]; // Usually start and end points from pathfinding
}

/**
 * Utilities for calculating canvas positions and optimal connections.
 */
export class GraphUtils {
  private static readonly RADIUS = 30; // Default entity radius
  private static readonly SQUARE_SIZE = 24; // Default role square size

  /**
   * Factory to create a complete VisualNode with theoretical defaults.
   */
  public static createNode(
    id: ObjectId,
    kind: ObjectKind,
    pos: Point,
    options: {
      arity?: number,
      isObjectified?: boolean,
      isPowerType?: boolean,
      isSequenceType?: boolean
    } = {}
  ): VisualNode {
    const { arity = 2, isObjectified = false, isPowerType = false, isSequenceType = false } = options;

    let shape: VisualShapeKind = 'ENTITY_CIRCLE';
    let dim: Dimension = { width: this.RADIUS * 2, height: this.RADIUS * 2 };
    const roles: VisualRoleSquare[] = [];

    // 1. Determine Shape and Dimensions
    if (isSequenceType) {
      shape = 'SEQUENCE_TYPE_BOX';
      dim = { width: (this.RADIUS + 12) * 2, height: (this.RADIUS + 12) * 2 };
    } else if (isPowerType) {
      shape = 'POWER_TYPE_CIRCLE';
      dim = { width: (this.RADIUS + 8) * 2, height: (this.RADIUS + 8) * 2 };
    } else if (kind === 'LABEL') {
      shape = 'LABEL_CIRCLE';
    } else if (kind === 'FACT' || isObjectified) {
      shape = isObjectified ? 'OBJECTIFIED_FACT' : 'FACT_BOX_N';
      dim = { width: arity * this.SQUARE_SIZE, height: this.SQUARE_SIZE };

      // Calculate role squares for n-ary facts [Source 167]
      for (let i = 0; i < arity; i++) {
        const xOffset = (i * this.SQUARE_SIZE) - (dim.width / 2) + (this.SQUARE_SIZE / 2);
        const squareCenter = { x: pos.x + xOffset, y: pos.y };
        roles.push({
          predicatorId: `p${i}` as any, // Typically mapped from structural predicators
          center: squareCenter,
          connectionPoints: this.getBoxPoints(squareCenter, { width: this.SQUARE_SIZE, height: this.SQUARE_SIZE })
        });
      }
    }

    // 2. Generate Perimeter Connection Points
    const connectionPoints = (shape === 'FACT_BOX_N' || shape === 'SEQUENCE_TYPE_BOX')
      ? this.getBoxPoints(pos, dim)
      : this.getCirclePoints(pos, dim.width / 2);

    return { id, kind: shape, position: pos, dimensions: dim, connectionPoints, roles };
  }

  /**
   * Finds connection points for a rectangle (Top, Bottom, Left, Right).
   */
  public static getBoxPoints(center: Point, dim: Dimension): ConnectionPoint[] {
    return [
      { id: 't', x: center.x, y: center.y - dim.height / 2 },
      { id: 'b', x: center.x, y: center.y + dim.height / 2 },
      { id: 'l', x: center.x - dim.width / 2, y: center.y },
      { id: 'r', x: center.x + dim.width / 2, y: center.y },
    ];
  }

  /**
   * Finds connection points for a circle at 45-degree intervals.
   */
  public static getCirclePoints(center: Point, radius: number): ConnectionPoint[] {
    const points: ConnectionPoint[] = [];
    for (let i = 0; i < 360; i += 45) {
      const rad = (i * Math.PI) / 180;
      points.push({
        id: `deg-${i}`,
        x: center.x + radius * Math.cos(rad),
        y: center.y + radius * Math.sin(rad),
      });
    }
    return points;
  }

  /**
   * Logic to find the two points that minimize distance between shapes.
   * Ensures predicator lines are drawn optimally.
   */
  public static findNearestPath(sourcePoints: ConnectionPoint[], targetPoints: ConnectionPoint[]): PointPair {
    // 1. Safety check: If either set is empty, no path can be calculated.
    if (sourcePoints.length === 0 || targetPoints.length === 0) {
      return [{ x: 0, y: 0 }, { x: 0, y: 0 }]; // Default fallback points
    }

    let minDistance = Infinity;

    // 2. Fix: Initialize with the first individual Point from each array.
    // Accessing index  ensures we have a Point[] instead of a ConnectionPoint[][].
    let bestPair: PointPair = [sourcePoints[0], targetPoints[0]];

    for (const pS of sourcePoints) {
      for (const pT of targetPoints) {
        // 3. Standard Euclidean distance calculation between two points.
        const dist = Math.sqrt(Math.pow(pT.x - pS.x, 2) + Math.pow(pT.y - pS.y, 2));

        if (dist < minDistance) {
          minDistance = dist;
          // 4. Update the best pair found so far.
          bestPair = [pS, pT];
        }
      }
    }

    return bestPair;
  }

  /**
   * Returns the correct link style for specialization (Solid) or generalization (Dashed).
   */
  public static getHierarchyStyle(isGeneralization: boolean): LinkKind {
    return isGeneralization ? 'GENERALIZATION_ARROW' : 'SPECIALIZATION_ARROW';
  }
}
