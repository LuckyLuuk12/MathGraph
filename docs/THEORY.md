# MathGraph: Theory of Information Systems Reference

## 1. Core Mathematical Framework

The theory describes information structures using sets of objects and the functions that relate them.

### Sets

- **O (Objects)**: The universal set of all elements in the model, including entities and fact types
- **E (Entities)**: Basic building blocks or "things". $E \subseteq O$
- **F (Fact Types)**: Relationships between objects. A fact type is a set of predicators. $F \subseteq O$
- **P (Predicators)**: The specific "roles" played by objects within a fact type
- **G (Power Types)**: Complex entities whose instances are sets of their member entity's instances
- **S (Sequence Types)**: Entities whose instances are ordered lists (tuples) of their member entity's instances
- **L (Label Types)**: Types used for identification (e.g., IDs, Names), often constrained to specific domains
- **Ω (Universe of Discourse)**: The set of all possible values or "everything"

### Primary Functions

- **Base**: $P \to O$ - Maps a predicator to its associated object. For example, $\text{Base}(\text{developed}) = \text{Developers}$
- **Pop**: $O \to \mathcal{P}(\Omega)$ - The population function. It maps an object to its current instances (a subset of the universe)
- **Elt**: $G \cup S \to O$ - The element function. It identifies the member object type that forms the sets or sequences within a Power or Sequence type
- **Π(x)**: The type-relatedness function. Objects are related if they share the same root supertype

---

## 2. Object & Fact Logic

### Fact Types (F)

- **Unary**: A fact type with exactly one predicator (e.g., "isCoop")
- **Binary**: A fact type with two predicators (e.g., "Development")
- **Objectification**: A fact type treated as an entity, allowing it to participate in other fact types. Graphically, this is a circle around the fact squares

### Power & Sequence Types

- **Power Types (G)**: Used to model groups. They have an implicit binary fact type $\in_{sub}$ to relate members to the group
- **Sequence Types (S)**: Used for ordered data (e.g., a "Franchise" as a sequence of games)

---

## 3. Constraint Logic

Constraints define "illegal populations" to maintain data integrity.

### Uniqueness Constraint (u)

- **Single Fact**: A combination of roles must be unique within that fact's population
- **Joinable Facts**: A uniqueness constraint spanning multiple fact types that share an entity

### Total Role Constraint (Mandatory)

Every instance of an object must play at least one role in the specified predicator(s).

### Set Constraints

- **Subset** ($\subseteq$): Population of roles A must be a subset of roles B
- **Equality** ($=$): Populations of roles A and B must be identical
- **Exclusion** (X): Populations of roles A and B must be mutually exclusive

### Other Constraints

- **Occurrence Frequency**: $\text{frequency}(\sigma, n, m)$ where an instance must appear between $n$ and $m$ times
- **Enumeration**: Restricts a label type (L) to a specific, predefined domain of values

---

## 4. Subtyping Logic

- **Generalization (Gen)**: Combines multiple entity types into one "supertype" using a union operator
  - $\text{Pop}(\text{Supertype}) = \bigcup \text{Pop}(\text{Subtypes})$
- **Specialization (Spec)**: Creates a "subtype" that is a subset of a "supertype" based on a defining rule or fact
  - $\text{Pop}(\text{Subtype}) \subseteq \text{Pop}(\text{Supertype})$

---

## 5. Visual Representation Standards

### Node Types

- **Entities (E)**: Circles
- **Fact Types (F)**: Adjacent squares (one per role/predicator)
- **Power Types (G)**: A circle around an entity's circle (double circle)
- **Sequence Types (S)**: A large rectangle enclosing the member entity
- **Label Types (L)**: Diamonds
- **Objectification**: A circle around a fact type

### Edge Types

- **Predicators**: Solid lines connecting entities to fact types
- **Specialization**: Solid arrow from subtype to supertype
- **Generalization**: Dotted arrows from subtypes to supertype

### Constraint Visualizations

- **Uniqueness**: Double-headed arrows over roles or a dotted line to a circle with "u"
- **Total Role (Mandatory)**: A thick dot where the role line meets the entity
- **Exclusion**: A circle with an "X"
- **Subset/Equality**: Arrows between constraint circles

---

## 6. Theory Extensions ("New Theory")

Users may enable these settings to change core validation logic:

- **no_empty(e)**: For Power/Sequence types, ensures no instance is an empty set
- **more_than_empty(e)**: Ensures the population of an entity is never empty ($\geq 1$ instance)
- **at_least(g, n)**: Cardinality constraint; sets must contain at least $n$ members
- **limit(g, m)**: Cardinality constraint; sets must contain at most $m$ members

---

## 7. Implementation & SQL Mapping Notes

### Type Relatedness

The system must prevent constraints between unrelated types (e.g., comparing a number to a string).

### SQL Translation

- **Entities/Facts** → Tables
- **Uniqueness/Total Role** → `PRIMARY KEY`, `UNIQUE`, and `NOT NULL`
- **Enumeration** → `CHECK` or `ENUM`
- **Specialization** → Foreign keys or shared primary keys
- **Label Types** → Column types (`VARCHAR`, `INT`, `DATE`, etc.)
- **Binary Fact Types** → Foreign key columns or junction tables
- **N-ary Fact Types** → Junction tables with multiple foreign keys

### Validation

As constraints increase, population validation becomes harder; a robust engine is required to check for "invalid populations".

---

## Example SQL Mappings

### Entity with Labels

```sql
-- Entity: Person
-- Labels: Name (string), Age (int), Email (string)
CREATE TABLE Person (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  age INT,
  email VARCHAR(255) UNIQUE
);
```

### Binary Fact Type (Many-to-Many)

```sql
-- Entities: Person, Company
-- Fact Type: Person works-for Company
CREATE TABLE Person_WorksFor_Company (
  person_id INT REFERENCES Person(id),
  company_id INT REFERENCES Company(id),
  PRIMARY KEY (person_id, company_id)
);
```

### Specialization/Generalization

```sql
-- Supertype: Vehicle
CREATE TABLE Vehicle (
  id SERIAL PRIMARY KEY,
  make VARCHAR(100),
  model VARCHAR(100)
);

-- Subtype: Car (specialized Vehicle)
CREATE TABLE Car (
  id SERIAL PRIMARY KEY,
  vehicle_id INT REFERENCES Vehicle(id) UNIQUE NOT NULL,
  num_doors INT
);
```