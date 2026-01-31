/**
 * MathGraph: Schema to SQL Generator
 * 
 * Translates Information Schema to Relational Database schemas (PostgreSQL, MySQL)
 * 
 * Mapping Rules:
 * - Entities/Objectified Facts → Tables
 * - Uniqueness Constraints → PRIMARY KEY / UNIQUE
 * - Total Role Constraints → NOT NULL
 * - Specialization → Foreign Keys or Table-per-Hierarchy
 * - Unary Facts → Boolean Columns
 * - Enumerations → CHECK Constraints
 */

import type {
  InformationSchema,
  Entity,
  FactType,
  Predicator,
  ObjectType,
  LabelType,
  UniqueConstraint,
  SQLSchema,
  SQLTable,
  SQLColumn,
  SQLForeignKey,
  SQLCheckConstraint,
  SQLIndex,
  Omega
} from './types';
import {
  SQLDialect,
  DataType,
  SQL_TYPE_MAPPING,
  ForeignKeyAction,
  DEFAULT_STRING_LENGTH
} from './constants';

/**
 * Main SQL Generator
 */
export class SQLGenerator {
  private dialect: SQLDialect;

  constructor(dialect: SQLDialect = SQLDialect.PostgreSQL) {
    this.dialect = dialect;
  }

  /**
   * Generate complete SQL schema from Information Schema
   */
  generateSchema(schema: InformationSchema): SQLSchema {
    const tables: SQLTable[] = [];

    // 1. Generate tables for entities
    for (const [, entity] of schema.entities) {
      tables.push(this.generateEntityTable(entity, schema));
    }

    // 2. Generate tables for objectified fact types
    for (const [, factType] of schema.factTypes) {
      if (factType.isObjectified && factType.objectifiedAsId) {
        tables.push(this.generateObjectifiedFactTable(factType, schema));
      }
    }

    // 3. Generate tables for non-objectified fact types (many-to-many)
    for (const [, factType] of schema.factTypes) {
      if (!factType.isObjectified && !factType.isUnary && factType.arity > 1) {
        const needsTable = this.requiresSeparateTable(factType, schema);
        if (needsTable) {
          tables.push(this.generateFactTypeTable(factType, schema));
        }
      }
    }

    // 4. Generate indexes for performance
    const indexes = this.generateIndexes(schema, tables);

    return {
      dialect: this.dialect,
      tables,
      indexes
    };
  }

  /**
   * Generate SQL DDL statements
   */
  generateDDL(sqlSchema: SQLSchema): string {
    const statements: string[] = [];

    // Create tables
    for (const table of sqlSchema.tables) {
      statements.push(this.generateCreateTableStatement(table));
    }

    // Create indexes
    if (sqlSchema.indexes) {
      for (const index of sqlSchema.indexes) {
        statements.push(this.generateCreateIndexStatement(index));
      }
    }

    return statements.join('\n\n');
  }

  /**
   * Generate table for an Entity
   */
  private generateEntityTable(entity: Entity, schema: InformationSchema): SQLTable {
    const columns: SQLColumn[] = [];
    const foreignKeys: SQLForeignKey[] = [];
    const checkConstraints: SQLCheckConstraint[] = [];
    const uniqueConstraints: string[][] = [];

    // Get the primary identifier
    const primaryIdentifier = entity.identifiers.find(c => c.isPrimary) || entity.identifiers[0];

    // Generate columns from predicators where this entity participates
    for (const [, predicator] of schema.predicators) {
      if (predicator.objectId === entity.id) {
        const factType = schema.factTypes.get(predicator.factTypeId);
        if (!factType) continue;

        // Handle unary facts as boolean columns
        if (factType.isUnary) {
          columns.push({
            name: this.sanitizeName(factType.name),
            dataType: this.getSQLType(DataType.Boolean),
            isNullable: predicator.isOptional,
            isPrimaryKey: false,
            isUnique: false
          });
          continue;
        }

        // For binary/n-ary facts, determine if it should be a column or separate table
        if (factType.arity === 2 && this.shouldBeColumn(factType, predicator, schema)) {
          const otherPredicator = factType.predicators
            .map(id => schema.predicators.get(id))
            .find(p => p && p.id !== predicator.id);

          if (otherPredicator) {
            const referencedObject = schema.objects.get(otherPredicator.objectId);
            if (referencedObject) {
              const column = this.createForeignKeyColumn(
                otherPredicator,
                referencedObject,
                predicator.isOptional,
                schema
              );
              columns.push(column);

              // Add foreign key constraint
              if (column.references) {
                foreignKeys.push({
                  name: `fk_${this.sanitizeName(entity.name)}_${column.name}`,
                  columns: [column.name],
                  referencedTable: column.references.table,
                  referencedColumns: [column.references.column],
                  onDelete: ForeignKeyAction.RESTRICT,
                  onUpdate: ForeignKeyAction.CASCADE
                });
              }
            }
          }
        }
      }
    }

    // Add surrogate key if no natural primary key exists
    if (!primaryIdentifier || primaryIdentifier.predicatorIds.length === 0) {
      columns.unshift({
        name: 'id',
        dataType: this.getAutoIncrementColumn(),
        isNullable: false,
        isPrimaryKey: true,
        isUnique: true
      });
    } else {
      // Mark primary key columns
      const pkColumns = this.getColumnsForConstraint(primaryIdentifier, schema, entity.id);
      pkColumns.forEach(colName => {
        const col = columns.find(c => c.name === colName);
        if (col) {
          col.isPrimaryKey = true;
          col.isNullable = false;
        }
      });
    }

    // Add unique constraints (non-primary identifiers)
    for (const identifier of entity.identifiers) {
      if (!identifier.isPrimary) {
        const cols = this.getColumnsForConstraint(identifier, schema, entity.id);
        if (cols.length > 0) {
          uniqueConstraints.push(cols);
        }
      }
    }

    // Handle specialization (subtyping)
    if (entity.specializationOf && entity.specializationOf.length > 0) {
      for (const parentId of entity.specializationOf) {
        const parent = schema.entities.get(parentId);
        if (parent) {
          foreignKeys.push({
            name: `fk_${this.sanitizeName(entity.name)}_parent`,
            columns: ['id'],
            referencedTable: this.sanitizeName(parent.name),
            referencedColumns: ['id'],
            onDelete: ForeignKeyAction.CASCADE,
            onUpdate: ForeignKeyAction.CASCADE
          });
        }
      }
    }

    // Add enumeration constraints
    for (const [, enumConstraint] of schema.enumerationConstraints) {
      const labelType = schema.labelTypes.get(enumConstraint.labelTypeId);
      if (labelType) {
        const column = columns.find(c => c.name === this.sanitizeName(labelType.name));
        if (column) {
          checkConstraints.push(
            this.generateEnumCheckConstraint(column.name, enumConstraint.allowedValues)
          );
        }
      }
    }

    return {
      name: this.sanitizeName(entity.name),
      columns,
      primaryKey: columns.filter(c => c.isPrimaryKey).map(c => c.name),
      foreignKeys,
      uniqueConstraints,
      checkConstraints
    };
  }

  /**
   * Generate table for an Objectified Fact Type
   */
  private generateObjectifiedFactTable(factType: FactType, schema: InformationSchema): SQLTable {
    const columns: SQLColumn[] = [];
    const foreignKeys: SQLForeignKey[] = [];

    // Add ID column (objectified facts become entities)
    columns.push({
      name: 'id',
      dataType: this.getAutoIncrementColumn(),
      isNullable: false,
      isPrimaryKey: true,
      isUnique: true
    });

    // Add column for each predicator in the fact type
    for (const predId of factType.predicators) {
      const predicator = schema.predicators.get(predId);
      if (!predicator) continue;

      const referencedObject = schema.objects.get(predicator.objectId);
      if (!referencedObject) continue;

      const column = this.createForeignKeyColumn(
        predicator,
        referencedObject,
        predicator.isOptional,
        schema
      );
      columns.push(column);

      if (column.references) {
        foreignKeys.push({
          name: `fk_${this.sanitizeName(factType.name)}_${column.name}`,
          columns: [column.name],
          referencedTable: column.references.table,
          referencedColumns: [column.references.column],
          onDelete: ForeignKeyAction.RESTRICT,
          onUpdate: ForeignKeyAction.CASCADE
        });
      }
    }

    return {
      name: this.sanitizeName(factType.name),
      columns,
      primaryKey: ['id'],
      foreignKeys,
      uniqueConstraints: [],
      checkConstraints: []
    };
  }

  /**
   * Generate table for a non-objectified fact type (many-to-many)
   */
  private generateFactTypeTable(factType: FactType, schema: InformationSchema): SQLTable {
    const columns: SQLColumn[] = [];
    const foreignKeys: SQLForeignKey[] = [];
    const primaryKey: string[] = [];

    for (const predId of factType.predicators) {
      const predicator = schema.predicators.get(predId);
      if (!predicator) continue;

      const referencedObject = schema.objects.get(predicator.objectId);
      if (!referencedObject) continue;

      const column = this.createForeignKeyColumn(
        predicator,
        referencedObject,
        false, // Fact type columns are typically not nullable
        schema
      );
      columns.push(column);
      primaryKey.push(column.name); // Composite primary key

      if (column.references) {
        foreignKeys.push({
          name: `fk_${this.sanitizeName(factType.name)}_${column.name}`,
          columns: [column.name],
          referencedTable: column.references.table,
          referencedColumns: [column.references.column],
          onDelete: ForeignKeyAction.CASCADE,
          onUpdate: ForeignKeyAction.CASCADE
        });
      }
    }

    return {
      name: this.sanitizeName(factType.name),
      columns,
      primaryKey,
      foreignKeys,
      uniqueConstraints: [],
      checkConstraints: []
    };
  }

  /**
   * Create a foreign key column
   */
  private createForeignKeyColumn(
    predicator: Predicator,
    referencedObject: ObjectType,
    isNullable: boolean,
    schema: InformationSchema
  ): SQLColumn {
    const columnName = this.sanitizeName(predicator.name);

    // Determine data type based on referenced object
    let dataType: string;
    let references: { table: string; column: string } | undefined;

    if (referencedObject.kind === 'Entity') {
      // Foreign key to entity
      dataType = 'INTEGER';
      references = {
        table: this.sanitizeName(referencedObject.name),
        column: 'id'
      };
    } else if (referencedObject.kind === 'Label') {
      // Value type
      const labelType = referencedObject as LabelType;
      dataType = this.getSQLType(labelType.dataType as DataType);
    } else {
      dataType = 'INTEGER';
    }

    return {
      name: columnName,
      dataType,
      isNullable,
      isPrimaryKey: false,
      isUnique: false,
      references
    };
  }

  /**
   * Determine if a fact type should be represented as a column vs separate table
   */
  private shouldBeColumn(factType: FactType, predicator: Predicator, schema: InformationSchema): boolean {
    // Binary fact types can often be columns
    if (factType.arity !== 2) return false;

    // Check if there's a uniqueness constraint that makes this functional (1:1 or N:1)
    for (const [, constraint] of schema.uniqueConstraints) {
      if (constraint.predicatorIds.includes(predicator.id) &&
        constraint.predicatorIds.length === 1) {
        return true;
      }
    }

    return false;
  }

  /**
   * Determine if a fact type requires a separate table
   */
  private requiresSeparateTable(factType: FactType, schema: InformationSchema): boolean {
    if (factType.arity > 2) return true; // Ternary and higher
    if (factType.isObjectified) return false; // Already handled

    // Many-to-many relationships need separate tables
    const hasManyToMany = !factType.predicators.some(predId => {
      const uniqueConstraints = Array.from(schema.uniqueConstraints.values());
      return uniqueConstraints.some(uc =>
        uc.predicatorIds.length === 1 && uc.predicatorIds[0] === predId
      );
    });

    return hasManyToMany;
  }

  /**
   * Get column names for a uniqueness constraint
   */
  private getColumnsForConstraint(
    constraint: UniqueConstraint,
    schema: InformationSchema,
    entityId: string
  ): string[] {
    return constraint.predicatorIds
      .map(id => schema.predicators.get(id))
      .filter(p => p !== undefined)
      .map(p => this.sanitizeName(p.name));
  }

  /**
   * Generate CREATE TABLE statement
   */
  private generateCreateTableStatement(table: SQLTable): string {
    const lines: string[] = [`CREATE TABLE ${table.name} (`];

    // Columns
    for (let i = 0; i < table.columns.length; i++) {
      const col = table.columns[i];
      let colDef = `  ${col.name} ${col.dataType}`;

      if (!col.isNullable) colDef += ' NOT NULL';
      if (col.defaultValue) colDef += ` DEFAULT ${col.defaultValue}`;
      if (col.isUnique && !col.isPrimaryKey) colDef += ' UNIQUE';

      if (i < table.columns.length - 1 || table.primaryKey || table.foreignKeys.length > 0 || table.checkConstraints.length > 0) {
        colDef += ',';
      }
      lines.push(colDef);
    }

    // Primary key
    if (table.primaryKey && table.primaryKey.length > 0) {
      const pkDef = `  PRIMARY KEY (${table.primaryKey.join(', ')})`;
      lines.push(pkDef + (table.foreignKeys.length > 0 || table.uniqueConstraints.length > 0 || table.checkConstraints.length > 0 ? ',' : ''));
    }

    // Unique constraints
    for (let i = 0; i < table.uniqueConstraints.length; i++) {
      const uc = table.uniqueConstraints[i];
      const ucDef = `  UNIQUE (${uc.join(', ')})`;
      lines.push(ucDef + (i < table.uniqueConstraints.length - 1 || table.foreignKeys.length > 0 || table.checkConstraints.length > 0 ? ',' : ''));
    }

    // Foreign keys
    for (let i = 0; i < table.foreignKeys.length; i++) {
      const fk = table.foreignKeys[i];
      let fkDef = `  CONSTRAINT ${fk.name} FOREIGN KEY (${fk.columns.join(', ')}) `;
      fkDef += `REFERENCES ${fk.referencedTable}(${fk.referencedColumns.join(', ')})`;
      if (fk.onDelete) fkDef += ` ON DELETE ${fk.onDelete}`;
      if (fk.onUpdate) fkDef += ` ON UPDATE ${fk.onUpdate}`;

      lines.push(fkDef + (i < table.foreignKeys.length - 1 || table.checkConstraints.length > 0 ? ',' : ''));
    }

    // Check constraints
    for (let i = 0; i < table.checkConstraints.length; i++) {
      const cc = table.checkConstraints[i];
      const ccDef = `  CONSTRAINT ${cc.name} CHECK (${cc.expression})`;
      lines.push(ccDef + (i < table.checkConstraints.length - 1 ? ',' : ''));
    }

    lines.push(');');
    return lines.join('\n');
  }

  /**
   * Generate CREATE INDEX statement
   */
  private generateCreateIndexStatement(index: SQLIndex): string {
    const unique = index.isUnique ? 'UNIQUE ' : '';
    return `CREATE ${unique}INDEX ${index.name} ON ${index.tableName} (${index.columns.join(', ')});`;
  }

  /**
   * Generate indexes for foreign keys and frequently queried columns
   */
  private generateIndexes(schema: InformationSchema, tables: SQLTable[]): SQLIndex[] {
    const indexes: SQLIndex[] = [];

    for (const table of tables) {
      // Index foreign key columns
      for (const fk of table.foreignKeys) {
        indexes.push({
          name: `idx_${table.name}_${fk.columns.join('_')}`,
          tableName: table.name,
          columns: fk.columns,
          isUnique: false
        });
      }
    }

    return indexes;
  }

  /**
   * Generate CHECK constraint for enumerations
   */
  private generateEnumCheckConstraint(columnName: string, allowedValues: Omega[]): SQLCheckConstraint {
    const values = allowedValues
      .map(v => typeof v === 'string' ? `'${v}'` : String(v))
      .join(', ');

    return {
      name: `chk_${columnName}_enum`,
      expression: `${columnName} IN (${values})`
    };
  }

  /**
   * Get SQL data type for a DataType
   */
  private getSQLType(dataType: DataType): string {
    return SQL_TYPE_MAPPING[this.dialect][dataType];
  }

  /**
   * Get auto-increment column definition for the current dialect
   */
  private getAutoIncrementColumn(): string {
    switch (this.dialect) {
      case SQLDialect.PostgreSQL:
        return 'SERIAL';
      case SQLDialect.MySQL:
        return 'INT AUTO_INCREMENT';
      case SQLDialect.SQLite:
        return 'INTEGER'; // SQLite auto-increments INTEGER PRIMARY KEY automatically
      case SQLDialect.SQLServer:
        return 'INT IDENTITY(1,1)';
      default:
        return 'INTEGER';
    }
  }

  /**
   * Sanitize names for SQL (remove spaces, special chars)
   */
  private sanitizeName(name: string): string {
    return name
      .replace(/\s+/g, '_')
      .replace(/[^a-zA-Z0-9_]/g, '')
      .toLowerCase();
  }
}

/**
 * Export SQL schema to file
 */
export function exportToSQL(schema: InformationSchema, dialect: SQLDialect = SQLDialect.PostgreSQL): string {
  const generator = new SQLGenerator(dialect);
  const sqlSchema = generator.generateSchema(schema);
  return generator.generateDDL(sqlSchema);
}
