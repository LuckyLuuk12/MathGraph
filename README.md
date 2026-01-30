# MathGraph

**A SvelteKit + TypeScript Web Application for Visual Information Modeling**

MathGraph implements a formal mathematical theory of Information Systems, providing a rigorous framework for modeling data structures, constraints, and relational schemas through visual graph-based interfaces.

## 🎯 Core Features

- **Formal Mathematical Foundation**: Built on sets (P, O, E, F, G, S, L) and functions (Base, Pop)
- **Comprehensive Constraint System**: Uniqueness, Total Role, Set Constraints, Cardinality, Frequency, and Custom Constraints
- **Visual Graph Modeling**: Nodes represent Objects, Edges represent Predicators (relationships)
- **SQL Schema Generation**: Export models to PostgreSQL, MySQL, SQLite, and SQL Server
- **Real-time Validation**: Detect illegal populations and constraint violations
- **Extensible Architecture**: Add custom constraint functions and validation rules
- **Client-Side Only**: All processing happens in the browser

---

## 📐 Mathematical Framework

### Core Sets

| Set | Symbol | Description | Example |
|-----|--------|-------------|---------|
| **Predicators** | P | Roles in relationships | "Person.works_at.Company" |
| **Objects** | O | Entity and Value types | Person, String, Date |
| **Entities** | E | Independent objects | Customer, Order, Product |
| **Fact Types** | F | Relationships | "Person works_at Company" |
| **Power Types** | G | Collections of entities | Set<Employee> |
| **Sequence Types** | S | Ordered collections | Array<Task> |
| **Label Types** | L | Value types with constraints | Email, Age (1-120) |

### Core Functions

**Base: P → O**  
Maps each predicator (role) to its object type.

**Pop: O → 𝒫(Ω)**  
Population function mapping objects to their instances in the universe Ω.

### Supported Structures

✅ **Objectification**: Fact types can act as entities  
✅ **Unary Fact Types**: Boolean-like properties (`Person is_premium`)  
✅ **Specialization/Generalization**: Subtyping via union/subset logic  
✅ **N-ary Relationships**: Support for ternary and higher-order fact types

---

## 🔒 Constraint Engine

### 1. Uniqueness Constraints
- **Single-column**: `UNIQUE (email)`
- **Composite**: `UNIQUE (first_name, last_name, birth_date)`
- **Primary Identifiers**: Maps to `PRIMARY KEY`

### 2. Total Role Constraints (Mandatory Participation)
- Every instance must participate in the role
- SQL equivalent: `NOT NULL`
- Example: Every Order must have a Customer

### 3. Set Constraints
- **Subset**: Pop(σ₁) ⊆ Pop(σ₂)
- **Equality**: Pop(σ₁) = Pop(σ₂)
- **Exclusion**: Pop(σ₁) ∩ Pop(σ₂) = ∅

### 4. Cardinality Constraints
- **at_least(g, n)**: Minimum participation count
- **limit(g, m)**: Maximum participation count
- Example: Employee works_on [1..5] Projects

### 5. Frequency Constraints
- **frequency(σ, n, m)**: Fact type has between n and m instances
- Global constraints on relationship populations

### 6. Enumeration Constraints
- Restrict label types to specific domains
- SQL equivalent: `CHECK (status IN ('active', 'inactive', 'suspended'))`

### 7. Custom Constraints (Extensible)
```typescript
// Example: no_empty(e) - Entity must have at least one instance
const constraint = createNoEmptyConstraint(entityId);
graphStore.addCustomConstraint(constraint);
```

---

## 🏗️ Architecture

### Type System ([types.d.ts](src/types.d.ts))
```
Ω (Omega)              Universe of discourse
  ├─ P (Predicators)   Roles in fact types
  ├─ O (Objects)       Base object types
  │   ├─ E (Entities)     Independent objects
  │   ├─ F (Fact Types)   Relationships
  │   ├─ G (Power Types)  Collections
  │   ├─ S (Sequences)    Ordered collections
  │   └─ L (Label Types)  Value types with constraints
  └─ Constraints       Validation rules
```

### Core Modules

#### 1. **Type System** ([src/types.d.ts](src/types.d.ts))
Global TypeScript interfaces for all mathematical structures.

#### 2. **Constants** ([src/lib/constants.ts](src/lib/constants.ts))
Enums for object kinds, constraint types, SQL dialects, and validation messages.

#### 3. **Validation Engine** ([src/lib/validation.ts](src/lib/validation.ts))
```typescript
ConstraintValidator.validate(schema, population) → ValidationResult
```
Checks all constraint types and returns violations with severity levels.

#### 4. **SQL Generator** ([src/lib/sql-generator.ts](src/lib/sql-generator.ts))
```typescript
const generator = new SQLGenerator(SQLDialect.PostgreSQL);
const sqlSchema = generator.generateSchema(informationSchema);
const ddl = generator.generateDDL(sqlSchema);
```

**Mapping Rules:**
- Entities → Tables
- Uniqueness → PRIMARY KEY / UNIQUE
- Total Role → NOT NULL
- Specialization → Foreign Keys
- Unary Facts → Boolean Columns
- Enumerations → CHECK Constraints

#### 5. **Graph Store** ([src/lib/stores/graph-store.ts](src/lib/stores/graph-store.ts))
Svelte writable store with derived stores for validation and metrics.

```typescript
import { graphStore, validationStore, isValidStore } from '$lib/stores/graph-store';

// Add entity
graphStore.addEntity(entity, { x: 100, y: 200 });

// Add fact type
graphStore.addFactType(factType, predicators);

// Validate
$validationStore.violations // Array of constraint violations
$isValidStore               // Boolean: schema is valid
```

---

## 🚀 Usage Examples

### Example 1: Person-Company Employment Model

```typescript
import { graphStore } from '$lib/stores/graph-store';
import { DataType } from '$lib/constants';

// 1. Create Entity: Person
const person: Entity = {
  id: crypto.randomUUID(),
  name: 'Person',
  kind: 'Entity',
  identifiers: [{
    id: crypto.randomUUID(),
    name: 'PK_Person',
    predicatorIds: [],
    isPrimary: true
  }]
};
graphStore.addEntity(person, { x: 100, y: 100 });

// 2. Create Label Type: CompanyName
const companyName: LabelType = {
  id: crypto.randomUUID(),
  name: 'CompanyName',
  kind: 'Label',
  dataType: 'String'
};
graphStore.addLabelType(companyName, { x: 400, y: 100 });

// 3. Create Fact Type: Person works_at Company
const factType: FactType = {
  id: crypto.randomUUID(),
  name: 'works_at',
  predicators: [],
  isUnary: false,
  isObjectified: false,
  arity: 2
};

const pred1: Predicator = {
  id: crypto.randomUUID(),
  name: 'employee',
  factTypeId: factType.id,
  position: 0,
  objectId: person.id,
  isOptional: false
};

const pred2: Predicator = {
  id: crypto.randomUUID(),
  name: 'employer',
  factTypeId: factType.id,
  position: 1,
  objectId: companyName.id,
  isOptional: false
};

factType.predicators = [pred1.id, pred2.id];
graphStore.addFactType(factType, [pred1, pred2]);

// 4. Add Uniqueness Constraint
graphStore.addUniqueConstraint({
  id: crypto.randomUUID(),
  name: 'UC_PersonCompany',
  predicatorIds: [pred1.id],
  isPrimary: false
});

// 5. Generate SQL
import { exportToSQL } from '$lib/sql-generator';
import { SQLDialect } from '$lib/constants';

const currentSchema = getCurrentSchema();
const sql = exportToSQL(currentSchema, SQLDialect.PostgreSQL);
console.log(sql);
```

---

## 📦 Project Structure

```
src/
├── types.d.ts                    # Global type definitions
├── lib/
│   ├── constants.ts              # Enums and constants
│   ├── validation.ts             # Constraint validation engine
│   ├── sql-generator.ts          # Schema to SQL translator
│   └── stores/
│       └── graph-store.ts        # Svelte state management
├── routes/
│   ├── +page.svelte              # Main application UI
│   └── +layout.svelte            # Layout wrapper
└── app.html                      # HTML template
```

---

## 🛠️ Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

---

## 🎓 Theoretical Foundation

This implementation is based on formal Information Systems theory:

1. **Universe of Discourse (Ω)**: All possible values in the domain
2. **Base Function**: Type system mapping roles to objects
3. **Population Function**: Instance-level data
4. **Constraint Theory**: Mathematical validation of legal populations

### Key Principles

- **Type Safety**: TypeScript ensures compile-time correctness
- **Mathematical Rigor**: All operations preserve formal semantics
- **Extensibility**: Custom constraints via function composition
- **Isomorphism**: Clean mapping to relational algebra

---

## 📄 License

MIT

---

**Built with ❤️ using SvelteKit + TypeScript**
