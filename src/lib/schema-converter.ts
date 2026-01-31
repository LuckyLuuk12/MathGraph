/**
 * MathGraph: Canvas to Information Schema Converter
 * 
 * Converts visual canvas state (nodes, edges, constraints) into a formal Information Schema
 * that can be used for SQL generation and validation.
 */

import type { CanvasState } from './canvas-types';
import type {
  InformationSchema,
  Entity,
  FactType,
  Predicator,
  ObjectType,
  LabelType,
  PowerType,
  SequenceType,
  UniqueConstraint,
  TotalRoleConstraint,
  SetConstraint,
  CardinalityConstraint,
  FrequencyConstraint,
  EnumerationConstraint
} from './types';
import { DataType } from './constants';

/**
 * Convert Canvas State to Information Schema
 */
export class SchemaConverter {
  /**
   * Main conversion method
   */
  static convertToInformationSchema(
    canvasState: CanvasState,
    schemaName: string = 'Untitled Schema'
  ): InformationSchema {
    const schema: InformationSchema = {
      id: crypto.randomUUID(),
      name: schemaName,
      version: '1.0.0',
      objects: new Map(),
      entities: new Map(),
      factTypes: new Map(),
      predicators: new Map(),
      powerTypes: new Map(),
      sequenceTypes: new Map(),
      labelTypes: new Map(),
      uniqueConstraints: new Map(),
      totalRoleConstraints: new Map(),
      setConstraints: new Map(),
      cardinalityConstraints: new Map(),
      frequencyConstraints: new Map(),
      enumerationConstraints: new Map(),
      customConstraints: new Map()
    };

    // Step 1: Convert nodes to objects
    this.convertNodes(canvasState, schema);

    // Step 2: Convert edges to predicators and fact types
    this.convertEdges(canvasState, schema);

    // Step 3: Convert constraints
    this.convertConstraints(canvasState, schema);

    return schema;
  }

  /**
   * Convert canvas nodes to objects (entities, label types, etc.)
   */
  private static convertNodes(canvasState: CanvasState, schema: InformationSchema): void {
    for (const [nodeId, node] of canvasState.nodes) {
      switch (node.type) {
        case 'entity': {
          const entity: Entity = {
            id: nodeId,
            name: node.label || 'Unnamed Entity',
            kind: 'Entity',
            identifiers: []
          };
          schema.entities.set(nodeId, entity);
          schema.objects.set(nodeId, entity);
          break;
        }

        case 'labelType': {
          const labelType: LabelType = {
            id: nodeId,
            name: node.label || 'Unnamed Label',
            kind: 'Label',
            dataType: this.mapDataType(node.dataType || 'string')
          };
          schema.labelTypes.set(nodeId, labelType);
          schema.objects.set(nodeId, labelType);
          break;
        }

        case 'powerType': {
          const powerType: PowerType = {
            id: nodeId,
            name: node.label || 'Unnamed Power Type',
            kind: 'Power',
            elementTypeId: node.memberEntityId || ''
          };
          schema.powerTypes.set(nodeId, powerType);
          schema.objects.set(nodeId, powerType);
          break;
        }

        case 'sequenceType': {
          const sequenceType: SequenceType = {
            id: nodeId,
            name: node.label || 'Unnamed Sequence',
            kind: 'Sequence',
            elementTypeId: node.memberEntityId || '',
            isOrdered: true,
            allowsDuplicates: false
          };
          schema.sequenceTypes.set(nodeId, sequenceType);
          schema.objects.set(nodeId, sequenceType);
          break;
        }

        case 'objectified': {
          // Objectified fact types become entities
          const entity: Entity = {
            id: nodeId,
            name: node.label || 'Unnamed Objectified Fact',
            kind: 'Entity',
            objectifiedFactTypeId: node.objectifiedFactId,
            identifiers: []
          };
          schema.entities.set(nodeId, entity);
          schema.objects.set(nodeId, entity);
          break;
        }

        case 'factType': {
          // Fact types are handled during edge conversion
          const factType: FactType = {
            id: nodeId,
            name: node.label || 'Unnamed Fact',
            predicators: [],
            isUnary: (node.arity || 2) === 1,
            isObjectified: false,
            arity: node.arity || 2
          };
          schema.factTypes.set(nodeId, factType);
          break;
        }
      }
    }
  }

  /**
   * Convert canvas edges to predicators and connect to fact types
   */
  private static convertEdges(canvasState: CanvasState, schema: InformationSchema): void {
    // Group edges by fact type
    const factTypeEdges = new Map<string, typeof canvasState.edges>();

    for (const [edgeId, edge] of canvasState.edges) {
      if (edge.type === 'predicator') {
        // Determine which node is the fact type
        const sourceNode = canvasState.nodes.get(edge.sourceNodeId);
        const targetNode = canvasState.nodes.get(edge.targetNodeId);

        let factTypeId: string | undefined;
        let objectId: string | undefined;

        if (sourceNode?.type === 'factType') {
          factTypeId = edge.sourceNodeId;
          objectId = edge.targetNodeId;
        } else if (targetNode?.type === 'factType') {
          factTypeId = edge.targetNodeId;
          objectId = edge.sourceNodeId;
        }

        if (factTypeId && objectId) {
          if (!factTypeEdges.has(factTypeId)) {
            factTypeEdges.set(factTypeId, new Map());
          }
          factTypeEdges.get(factTypeId)!.set(edgeId, edge);

          // Create predicator
          const predicator: Predicator = {
            id: edgeId,
            name: edge.label || 'unnamed_role',
            factTypeId: factTypeId,
            position: 0, // Will be set below
            objectId: objectId,
            isOptional: true // Default, can be overridden by total role constraint
          };
          schema.predicators.set(edgeId, predicator);
        }
      } else if (edge.type === 'specialization') {
        // Handle specialization relationships
        const subtype = schema.entities.get(edge.sourceNodeId);
        if (subtype) {
          if (!subtype.specializationOf) {
            subtype.specializationOf = [];
          }
          subtype.specializationOf.push(edge.targetNodeId);
        }
      }
    }

    // Update fact types with their predicators
    for (const [factTypeId, edges] of factTypeEdges) {
      const factType = schema.factTypes.get(factTypeId);
      if (factType) {
        const predicatorIds = Array.from(edges.keys());
        factType.predicators = predicatorIds;
        factType.arity = predicatorIds.length;
        factType.isUnary = predicatorIds.length === 1;

        // Update predicator positions
        predicatorIds.forEach((predId, index) => {
          const pred = schema.predicators.get(predId);
          if (pred) {
            pred.position = index;
          }
        });
      }
    }
  }

  /**
   * Convert canvas constraints to schema constraints
   */
  private static convertConstraints(canvasState: CanvasState, schema: InformationSchema): void {
    for (const [constraintId, constraint] of canvasState.constraints) {
      switch (constraint.type) {
        case 'uniqueness': {
          const uniqueConstraint: UniqueConstraint = {
            id: constraintId,
            name: constraint.name || 'Unique Constraint',
            predicatorIds: constraint.predicatorIds || constraint.appliesTo,
            isPrimary: false,
            isPreferred: false
          };
          schema.uniqueConstraints.set(constraintId, uniqueConstraint);

          // Add to entity identifiers
          if (uniqueConstraint.predicatorIds.length > 0) {
            const firstPred = schema.predicators.get(uniqueConstraint.predicatorIds[0]);
            if (firstPred) {
              const entity = schema.entities.get(firstPred.objectId);
              if (entity) {
                entity.identifiers.push(uniqueConstraint);
                // If this is the first identifier, make it primary
                if (entity.identifiers.length === 1) {
                  uniqueConstraint.isPrimary = true;
                }
              }
            }
          }
          break;
        }

        case 'mandatory': {
          if (constraint.appliesTo.length > 0) {
            const predicatorId = constraint.appliesTo[0];
            const predicator = schema.predicators.get(predicatorId);
            if (predicator) {
              predicator.isOptional = false;

              const totalRoleConstraint: TotalRoleConstraint = {
                id: constraintId,
                name: constraint.name || 'Mandatory Constraint',
                predicatorId: predicatorId,
                objectId: predicator.objectId
              };
              schema.totalRoleConstraints.set(constraintId, totalRoleConstraint);
            }
          }
          break;
        }

        case 'subset':
        case 'equality':
        case 'exclusion': {
          const setConstraint: SetConstraint = {
            id: constraintId,
            name: constraint.name || `${constraint.type} Constraint`,
            type: constraint.type === 'subset' ? 'Subset' :
              constraint.type === 'equality' ? 'Equality' : 'Exclusion',
            sourcePredicatorIds: constraint.predicatorIds?.slice(0, constraint.predicatorIds.length / 2) || [],
            targetPredicatorIds: constraint.predicatorIds?.slice(constraint.predicatorIds.length / 2) || []
          };
          schema.setConstraints.set(constraintId, setConstraint);
          break;
        }

        case 'frequency': {
          const params = constraint.parameters || {};
          const frequencyConstraint: FrequencyConstraint = {
            id: constraintId,
            name: constraint.name || 'Frequency Constraint',
            factTypeId: constraint.appliesTo[0] || '',
            min: params.min,
            max: params.max === 'infinity' ? undefined : params.max as number
          };
          schema.frequencyConstraints.set(constraintId, frequencyConstraint);
          break;
        }

        case 'enumeration': {
          const params = constraint.parameters || {};
          const enumConstraint: EnumerationConstraint = {
            id: constraintId,
            name: constraint.name || 'Enumeration Constraint',
            labelTypeId: constraint.appliesTo[0] || '',
            allowedValues: params.values || []
          };
          schema.enumerationConstraints.set(constraintId, enumConstraint);
          break;
        }

        case 'atLeast':
        case 'limit': {
          const params = constraint.parameters || {};
          const cardinalityConstraint: CardinalityConstraint = {
            id: constraintId,
            name: constraint.name || 'Cardinality Constraint',
            predicatorId: constraint.appliesTo[0] || '',
            min: constraint.type === 'atLeast' ? params.n : undefined,
            max: constraint.type === 'limit' ? params.m : undefined
          };
          schema.cardinalityConstraints.set(constraintId, cardinalityConstraint);
          break;
        }
      }
    }
  }

  /**
   * Map canvas data types to schema DataType enum
   */
  private static mapDataType(canvasDataType: string): DataType {
    switch (canvasDataType.toLowerCase()) {
      case 'string':
      case 'text':
      case 'char':
        return DataType.String;
      case 'integer':
      case 'int':
        return DataType.Integer;
      case 'float':
      case 'double':
      case 'decimal':
        return DataType.Decimal;
      case 'boolean':
      case 'bool':
        return DataType.Boolean;
      case 'date':
        return DataType.Date;
      case 'timestamp':
      case 'datetime':
        return DataType.DateTime;
      default:
        return DataType.String;
    }
  }
}
