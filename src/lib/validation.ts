/**
 * MathGraph: Constraint Validation Engine
 * 
 * Validates populations against the constraint system to detect illegal populations
 */

import { VALIDATION_MESSAGES, type ViolationSeverity } from './constants';

/**
 * Main validation orchestrator
 */
export class ConstraintValidator {
  /**
   * Validates entire schema population against all constraints
   */
  static validate(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ValidationResult {
    const violations: ConstraintViolation[] = [];

    // Validate each constraint type
    violations.push(...this.validateUniquenessConstraints(schema, population));
    violations.push(...this.validateTotalRoleConstraints(schema, population));
    violations.push(...this.validateSetConstraints(schema, population));
    violations.push(...this.validateCardinalityConstraints(schema, population));
    violations.push(...this.validateFrequencyConstraints(schema, population));
    violations.push(...this.validateEnumerationConstraints(schema, population));
    violations.push(...this.validateCustomConstraints(schema, population));

    return {
      isValid: violations.filter(v => v.severity === 'Error').length === 0,
      violations
    };
  }

  /**
   * Validates uniqueness constraints (primary keys, unique combinations)
   */
  private static validateUniquenessConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [constraintId, constraint] of schema.uniqueConstraints) {
      // Get the fact type for this constraint
      const predicator = schema.predicators.get(constraint.predicatorIds[0]);
      if (!predicator) continue;

      const factType = schema.factTypes.get(predicator.factTypeId);
      if (!factType) continue;

      const factPop = population.factPopulations.get(factType.id);
      if (!factPop) continue;

      // Check for duplicate tuples based on constraint predicators
      const seenCombinations = new Set<string>();

      for (const tuple of factPop.tuples) {
        // Build key from constrained predicators
        const keyValues = constraint.predicatorIds
          .map(pid => tuple.get(pid))
          .map(v => JSON.stringify(v));
        const key = keyValues.join('|');

        if (seenCombinations.has(key)) {
          violations.push({
            constraintId,
            constraintType: 'Uniqueness',
            severity: 'Error',
            message: `${VALIDATION_MESSAGES.UNIQUENESS_VIOLATION}: ${constraint.name}`,
            affectedObjects: [factType.id],
            affectedFacts: [tuple]
          });
        }
        seenCombinations.add(key);
      }
    }

    return violations;
  }

  /**
   * Validates total role constraints (mandatory participation - SQL NOT NULL logic)
   */
  private static validateTotalRoleConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [constraintId, constraint] of schema.totalRoleConstraints) {
      const predicator = schema.predicators.get(constraint.predicatorId);
      if (!predicator) continue;

      const factType = schema.factTypes.get(predicator.factTypeId);
      if (!factType) continue;

      const objectPop = population.objectPopulations.get(constraint.objectId);
      if (!objectPop) continue;

      const factPop = population.factPopulations.get(factType.id);
      if (!factPop) continue;

      // Every instance in object population must appear in at least one fact
      const participatingInstances = new Set<Omega>();

      for (const tuple of factPop.tuples) {
        const value = tuple.get(constraint.predicatorId);
        if (value !== null && value !== undefined) {
          participatingInstances.add(value);
        }
      }

      // Check for instances that don't participate
      for (const instance of objectPop.instances) {
        if (!participatingInstances.has(instance)) {
          violations.push({
            constraintId,
            constraintType: 'TotalRole',
            severity: 'Error',
            message: `${VALIDATION_MESSAGES.TOTAL_ROLE_VIOLATION}: ${constraint.name}`,
            affectedObjects: [constraint.objectId],
            affectedFacts: []
          });
        }
      }
    }

    return violations;
  }

  /**
   * Validates set constraints (Subset, Equality, Exclusion)
   */
  private static validateSetConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [constraintId, constraint] of schema.setConstraints) {
      // Get populations for source and target predicators
      const sourcePop = this.getPredicatorPopulation(
        constraint.sourcePredicatorIds,
        schema,
        population
      );
      const targetPop = this.getPredicatorPopulation(
        constraint.targetPredicatorIds,
        schema,
        population
      );

      switch (constraint.type) {
        case 'Subset':
          // sourcePop ⊆ targetPop
          for (const sourceValue of sourcePop) {
            if (!targetPop.has(sourceValue)) {
              violations.push({
                constraintId,
                constraintType: 'SetConstraint',
                severity: 'Error',
                message: `${VALIDATION_MESSAGES.SUBSET_VIOLATION}: ${constraint.name}`,
                affectedObjects: constraint.sourcePredicatorIds,
                affectedFacts: []
              });
              break;
            }
          }
          break;

        case 'Equality':
          // sourcePop = targetPop
          if (sourcePop.size !== targetPop.size) {
            violations.push({
              constraintId,
              constraintType: 'SetConstraint',
              severity: 'Error',
              message: `${VALIDATION_MESSAGES.EQUALITY_VIOLATION}: ${constraint.name}`,
              affectedObjects: [...constraint.sourcePredicatorIds, ...constraint.targetPredicatorIds],
              affectedFacts: []
            });
          } else {
            for (const value of sourcePop) {
              if (!targetPop.has(value)) {
                violations.push({
                  constraintId,
                  constraintType: 'SetConstraint',
                  severity: 'Error',
                  message: `${VALIDATION_MESSAGES.EQUALITY_VIOLATION}: ${constraint.name}`,
                  affectedObjects: [...constraint.sourcePredicatorIds, ...constraint.targetPredicatorIds],
                  affectedFacts: []
                });
                break;
              }
            }
          }
          break;

        case 'Exclusion':
          // sourcePop ∩ targetPop = ∅
          for (const value of sourcePop) {
            if (targetPop.has(value)) {
              violations.push({
                constraintId,
                constraintType: 'SetConstraint',
                severity: 'Error',
                message: `${VALIDATION_MESSAGES.EXCLUSION_VIOLATION}: ${constraint.name}`,
                affectedObjects: [...constraint.sourcePredicatorIds, ...constraint.targetPredicatorIds],
                affectedFacts: []
              });
              break;
            }
          }
          break;
      }
    }

    return violations;
  }

  /**
   * Validates cardinality constraints (min/max participation per instance)
   */
  private static validateCardinalityConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [constraintId, constraint] of schema.cardinalityConstraints) {
      const predicator = schema.predicators.get(constraint.predicatorId);
      if (!predicator) continue;

      const factType = schema.factTypes.get(predicator.factTypeId);
      if (!factType) continue;

      const factPop = population.factPopulations.get(factType.id);
      if (!factPop) continue;

      // Count occurrences of each instance in this role
      const instanceCounts = new Map<Omega, number>();

      for (const tuple of factPop.tuples) {
        const value = tuple.get(constraint.predicatorId);
        if (value !== null && value !== undefined) {
          instanceCounts.set(value, (instanceCounts.get(value) || 0) + 1);
        }
      }

      // Check min/max constraints
      for (const [instance, count] of instanceCounts) {
        if (constraint.min !== undefined && count < constraint.min) {
          violations.push({
            constraintId,
            constraintType: 'Cardinality',
            severity: 'Error',
            message: `${VALIDATION_MESSAGES.CARDINALITY_MIN_VIOLATION}: ${constraint.name} (min: ${constraint.min}, actual: ${count})`,
            affectedObjects: [predicator.objectId],
            affectedFacts: []
          });
        }

        if (constraint.max !== undefined && count > constraint.max) {
          violations.push({
            constraintId,
            constraintType: 'Cardinality',
            severity: 'Error',
            message: `${VALIDATION_MESSAGES.CARDINALITY_MAX_VIOLATION}: ${constraint.name} (max: ${constraint.max}, actual: ${count})`,
            affectedObjects: [predicator.objectId],
            affectedFacts: []
          });
        }
      }
    }

    return violations;
  }

  /**
   * Validates frequency constraints (tuple count for fact types)
   */
  private static validateFrequencyConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [constraintId, constraint] of schema.frequencyConstraints) {
      const factPop = population.factPopulations.get(constraint.factTypeId);
      const count = factPop?.tuples.length || 0;

      if (constraint.min !== undefined && count < constraint.min) {
        violations.push({
          constraintId,
          constraintType: 'Frequency',
          severity: 'Error',
          message: `${VALIDATION_MESSAGES.FREQUENCY_MIN_VIOLATION}: ${constraint.name} (min: ${constraint.min}, actual: ${count})`,
          affectedObjects: [constraint.factTypeId],
          affectedFacts: []
        });
      }

      if (constraint.max !== undefined && count > constraint.max) {
        violations.push({
          constraintId,
          constraintType: 'Frequency',
          severity: 'Error',
          message: `${VALIDATION_MESSAGES.FREQUENCY_MAX_VIOLATION}: ${constraint.name} (max: ${constraint.max}, actual: ${count})`,
          affectedObjects: [constraint.factTypeId],
          affectedFacts: []
        });
      }
    }

    return violations;
  }

  /**
   * Validates enumeration constraints (allowed values for label types)
   */
  private static validateEnumerationConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [constraintId, constraint] of schema.enumerationConstraints) {
      const objectPop = population.objectPopulations.get(constraint.labelTypeId);
      if (!objectPop) continue;

      const allowedSet = new Set(constraint.allowedValues);

      for (const instance of objectPop.instances) {
        if (!allowedSet.has(instance)) {
          violations.push({
            constraintId,
            constraintType: 'Enumeration',
            severity: 'Error',
            message: `${VALIDATION_MESSAGES.ENUMERATION_VIOLATION}: ${constraint.name}`,
            affectedObjects: [constraint.labelTypeId],
            affectedFacts: []
          });
        }
      }
    }

    return violations;
  }

  /**
   * Validates custom user-defined constraints
   */
  private static validateCustomConstraints(
    schema: InformationSchema,
    population: SchemaPopulation
  ): ConstraintViolation[] {
    const violations: ConstraintViolation[] = [];

    for (const [, constraint] of schema.customConstraints) {
      const result = constraint.constraintFunction(schema, population);
      violations.push(...result.violations);
    }

    return violations;
  }

  /**
   * Helper: Get population set for a list of predicators
   */
  private static getPredicatorPopulation(
    predicatorIds: string[],
    schema: InformationSchema,
    population: SchemaPopulation
  ): Set<string> {
    const result = new Set<string>();

    for (const predId of predicatorIds) {
      const predicator = schema.predicators.get(predId);
      if (!predicator) continue;

      const factType = schema.factTypes.get(predicator.factTypeId);
      if (!factType) continue;

      const factPop = population.factPopulations.get(factType.id);
      if (!factPop) continue;

      for (const tuple of factPop.tuples) {
        const value = tuple.get(predId);
        if (value !== null && value !== undefined) {
          result.add(JSON.stringify(value));
        }
      }
    }

    return result;
  }
}

/**
 * Example custom constraint: no_empty(e)
 * Ensures an entity has at least one instance
 */
export function createNoEmptyConstraint(entityId: string): CustomConstraint {
  return {
    id: `no_empty_${entityId}`,
    name: `No Empty Constraint for ${entityId}`,
    description: 'Ensures entity has at least one instance',
    appliesTo: [entityId],
    constraintFunction: (schema: InformationSchema, population: SchemaPopulation) => {
      const pop = population.objectPopulations.get(entityId);
      const violations: ConstraintViolation[] = [];

      if (!pop || pop.instances.size === 0) {
        violations.push({
          constraintId: `no_empty_${entityId}`,
          constraintType: 'Custom',
          severity: 'Error',
          message: `Entity ${entityId} must have at least one instance`,
          affectedObjects: [entityId]
        });
      }

      return { isValid: violations.length === 0, violations };
    }
  };
}
