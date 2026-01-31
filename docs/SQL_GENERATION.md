# SQL Generation System - Documentation

## Overview

MathGraph now features a comprehensive SQL generation system that translates visual information models into relational database schemas. The system follows formal information systems theory and applies well-defined mapping rules.

## Architecture

### 1. **Schema Converter** (`schema-converter.ts`)

Converts the visual canvas state (nodes, edges, constraints) into a formal Information Schema.

**Key Features:**
- Maps visual elements to theoretical constructs
- Handles all node types: entities, fact types, label types, power types, sequence types, objectified facts
- Processes edges to create predicators and relationships
- Translates canvas constraints to schema constraints

**Conversion Flow:**
```
Canvas State → Information Schema
  ├─ Nodes → Objects (Entities, Labels, Power/Sequence Types)
  ├─ Edges → Predicators & Fact Types
  └─ Constraints → Schema Constraints
```

### 2. **SQL Generator** (`sql-generator.ts`)

Translates Information Schema into SQL DDL statements for various database dialects.

**Supported Dialects:**
- PostgreSQL
- MySQL
- SQLite
- SQL Server

**Key Capabilities:**
- Entity-to-table mapping
- Objectified fact type handling
- Foreign key generation
- Constraint translation (uniqueness, mandatory, enumeration)
- Index generation for performance
- Specialization/inheritance support

## Mapping Rules

### Structural Mappings

| Information Schema Element | SQL Representation |
|---------------------------|-------------------|
| Entity | `CREATE TABLE` with surrogate or natural primary key |
| Objectified Fact Type | `CREATE TABLE` with ID and foreign keys to participants |
| Binary Fact (Functional) | Foreign key column in entity table |
| Many-to-Many Fact | Junction table with composite primary key |
| N-ary Fact (n > 2) | Junction table with multiple foreign keys |
| Label Type | Column with appropriate data type |
| Power Type | Not directly mapped; represented through relationships |
| Sequence Type | Not directly mapped; can use array types or separate tables |

### Constraint Mappings

| Information Schema Constraint | SQL Constraint |
|------------------------------|----------------|
| Uniqueness (Primary) | `PRIMARY KEY` |
| Uniqueness (Alternate) | `UNIQUE` |
| Total Role (Mandatory) | `NOT NULL` |
| Enumeration | `CHECK (column IN (...))` |
| Specialization | Foreign key with `ON DELETE CASCADE` |
| Subset | Application-level or trigger |
| Exclusion | Application-level or trigger |
| Frequency | Application-level validation |

### Data Type Mappings

#### PostgreSQL
```typescript
String   → VARCHAR(255)
Integer  → INTEGER
Decimal  → NUMERIC(10,2)
Boolean  → BOOLEAN
Date     → DATE
DateTime → TIMESTAMP
```

#### MySQL
```typescript
String   → VARCHAR(255)
Integer  → INT
Decimal  → DECIMAL(10,2)
Boolean  → BOOLEAN
Date     → DATE
DateTime → DATETIME
```

#### SQLite
```typescript
String   → TEXT
Integer  → INTEGER
Decimal  → REAL
Boolean  → INTEGER (0/1)
Date     → TEXT
DateTime → TEXT
```

#### SQL Server
```typescript
String   → NVARCHAR(255)
Integer  → INT
Decimal  → DECIMAL(10,2)
Boolean  → BIT
Date     → DATE
DateTime → DATETIME2
```

## Decision Logic

### When to Create a Separate Table

A fact type requires a separate junction table when:

1. **Arity > 2**: Ternary or higher relationships always need their own table
2. **Many-to-Many**: Binary facts without a uniqueness constraint on either side
3. **Objectified Facts**: Always become tables (can participate in other facts)
4. **Explicit Modeling**: When the fact type has its own attributes/constraints

### When to Use Foreign Key Columns

A fact type can be represented as a foreign key column when:

1. **Binary & Functional**: Has a uniqueness constraint making it 1:1 or N:1
2. **Single-Valued**: The relationship from the entity perspective is single-valued
3. **Non-Objectified**: The fact type is not treated as an entity

### Specialization Handling

For subtypes/supertypes:

**Table-per-Hierarchy Approach** (Current Implementation):
- Each entity (super and sub) gets its own table
- Subtype tables have a foreign key to supertype table
- Foreign key uses `ON DELETE CASCADE` to maintain referential integrity
- Shared attributes go in supertype table
- Specialized attributes go in subtype tables

**Alternative: Table-per-Type** (Can be implemented):
- Single table with discriminator column
- All possible attributes in one table
- Better for simple hierarchies

## Usage Example

```typescript
import { SchemaConverter } from '$lib/schema-converter';
import { SQLGenerator } from '$lib/sql-generator';
import { SQLDialect } from '$lib/constants';

// 1. Convert canvas to schema
const informationSchema = SchemaConverter.convertToInformationSchema(
  canvasState,
  'My Project'
);

// 2. Generate SQL
const generator = new SQLGenerator(SQLDialect.PostgreSQL);
const sqlSchema = generator.generateSchema(informationSchema);
const ddl = generator.generateDDL(sqlSchema);

console.log(ddl);
```

## Benefits of This Approach

### 1. **Theoretical Soundness**
- Based on formal information systems theory
- Preserves semantic integrity
- Ensures valid transformations

### 2. **Flexibility**
- Support for multiple SQL dialects
- Extensible mapping rules
- Can handle complex relationships

### 3. **Completeness**
- Handles all ORM-like constructs
- Supports advanced features (specialization, objectification)
- Preserves constraints

### 4. **Maintainability**
- Clear separation of concerns
- Well-documented mapping rules
- Type-safe implementation

## Future Enhancements

### Planned Features

1. **Advanced Constraint Translation**
   - Subset constraints → Database triggers
   - Exclusion constraints → Database triggers
   - Complex CHECK constraints

2. **Index Optimization**
   - Automatic index recommendations
   - Query pattern analysis
   - Performance hints

3. **Migration Support**
   - Schema diff generation
   - ALTER TABLE statements
   - Version control integration

4. **Additional Dialects**
   - Oracle
   - MariaDB
   - CockroachDB

5. **Reverse Engineering**
   - Import existing database schemas
   - Generate visual models from SQL
   - Database discovery

6. **Validation**
   - SQL validation before export
   - Constraint feasibility checking
   - Database-specific compatibility checks

## References

- [THEORY.md](./THEORY.md) - Complete mathematical framework
- [Information Systems Theory](https://en.wikipedia.org/wiki/Information_systems) - Academic foundations
- [Object-Role Modeling](https://en.wikipedia.org/wiki/Object-role_modeling) - Related methodology

## Best Practices

### For Users

1. **Define Clear Identifiers**: Ensure entities have uniqueness constraints
2. **Use Meaningful Names**: They become table/column names in SQL
3. **Model Mandatory Relationships**: Use total role constraints
4. **Consider Normalization**: Factor out repeating groups
5. **Document Enumerations**: Use enumeration constraints for finite domains

### For Developers

1. **Extend Carefully**: New mapping rules should preserve semantics
2. **Test Thoroughly**: Each dialect has quirks
3. **Document Changes**: Update this file when modifying mappings
4. **Consider Performance**: Generated schemas should be efficient
5. **Validate Output**: Generated SQL should be syntactically correct

---

*Last Updated: January 30, 2026*
*MathGraph Version: 1.0.0*
