# Mathematical Syntax Guide for MathGraph Theory Extension

MathGraph supports a custom mathematical syntax for defining logical constraints and theory extensions. This syntax is designed to be user-friendly while maintaining mathematical rigor.

## Basic Operators

### Logical Operators
All operators support multiple aliases for convenience:

| Operator | Aliases | Symbol | Description |
|----------|---------|--------|-------------|
| AND | `AND`, `&&`, `&`, `/\` | `∧` | Logical conjunction |
| OR | `OR`, `\|\|`, `\|`, `\/` | `∨` | Logical disjunction |
| NOT | `NOT`, `!`, `¬`, `~` | `¬` | Logical negation |
| IMPLIES | `IMPLIES`, `=>` | `→` | Logical implication |
| IFF | `IFF`, `<=>` | `↔` | Logical equivalence (if and only if) |

### Quantifiers

| Quantifier | Aliases | Symbol | Description |
|------------|---------|--------|-------------|
| FORALL | `FORALL` | `∀` | Universal quantification (for all) |
| EXISTS | `EXISTS` | `∃` | Existential quantification (there exists) |

## Bounded Quantifiers

Quantifiers can be bounded to specific sets using the following syntax:

```
forall_{variable in Set}[condition]
```

Example:
```
forall_{x in E}[hasRole(x)]
```

This reads as: "For all x in the set of entities E, x has a role"

## Formula Structure

### Basic Formula
A simple formula with logical operators:
```
A AND B OR NOT C
```

### Multiple Formulas
Separate multiple formulas with semicolons:
```
forall_{x in E}[hasRole(x)];
forall_{y in P}[connected(y)]
```

### Comments
Use `//` or `#` for single-line comments:
```
forall_{x in E}[hasRole(x)];  // Every entity must have a role
# This is also a comment
```

## Standard Sets in Information Systems Theory

The following sets are predefined:

- **O** - Set of all objects (entities, labels, power types)
- **E** - Set of entity types (E ⊆ O)
- **P** - Set of all predicators (roles)
- **F** - Set of fact types
- **L** - Set of label types (L ⊆ O)
- **G** - Set of power types (G ⊆ E)
- **S** - Set of sequence types (S ⊆ E)

## Examples

### Mandatory Role Participation
```
forall_{e in E}[EXISTS_{p in P}[participates(e, p)]]
```
Every entity must participate in at least one role.

### Unique Identification
```
forall_{x in E}[forall_{y in E}[
  (x != y) IMPLIES NOT equals(identifier(x), identifier(y))
]]
```
Every entity must have a unique identifier.

### Role Connectivity
```
forall_{p in P}[EXISTS_{o in O}[connects(p, o)]]
```
Every predicator must connect to at least one object.

### Subset Constraint
```
forall_{g in G}[g SUBSET E]
```
All power types are subsets of entity types.

### Fact Type Arity
```
forall_{f in F}[
  arity(f) >= 2  // Binary or higher
]
```
All fact types must have arity of at least 2.

## Custom Sets

You can define custom sets with specific shapes and usage rules:

### Define a Custom Set
```
Name: Category
Symbol: C
Shape: Rectangle
Usage Rule: Only for grouping multiple entities
```

### Use Custom Set in Constraints
```
forall_{c in C}[
  size(c) >= 2  // Categories must contain at least 2 entities
]
```

## Parser Features

The parser provides:

1. **Syntax Validation** - Checks for balanced brackets, valid operators, and proper quantifier syntax
2. **Format Conversion** - Converts text operators to mathematical symbols (e.g., `AND` → `∧`)
3. **Variable/Set Detection** - Automatically identifies variables and sets used in formulas
4. **Error Reporting** - Provides specific error messages for syntax issues

## Best Practices

1. **Use Bounded Quantifiers** - Always specify the set for quantified variables:
   ```
   ✓ forall_{x in E}[condition(x)]
   ✗ forall x[condition(x)]
   ```

2. **Add Comments** - Document complex formulas:
   ```
   forall_{x in E}[hasRole(x)];  // Mandatory participation
   ```

3. **Use Meaningful Variable Names** - Single letters for standard sets, descriptive names for others:
   ```
   ✓ forall_{entity in E}[valid(entity)]
   ✓ forall_{e in E}[valid(e)]
   ```

4. **Separate Complex Formulas** - Use semicolons to break up logical statements:
   ```
   forall_{x in E}[hasRole(x)];
   forall_{y in P}[connected(y)]
   ```

5. **Use Parentheses for Clarity** - Make operator precedence explicit:
   ```
   (A AND B) OR (C AND D)
   ```

## Error Messages

Common errors and their meanings:

- `Unclosed bracket [` - Missing closing `]`
- `Unclosed brace {` - Missing closing `}`
- `Invalid quantifier binding syntax` - Incorrect format in `_{...}` binding
- `Unmatched closing bracket` - `]` without matching `[`

## Integration with Modeler

When you define custom constraints:

1. They are saved locally and persist across sessions
2. They can be viewed in a formatted mathematical notation
3. Variable and set usage is tracked automatically
4. Custom sets can be assigned shapes for visual modeling

When you define custom sets:

1. They get a visual representation (circle, square, rectangle, diamond)
2. Usage rules enforce modeling constraints
3. They can be used in constraint formulas
4. They integrate seamlessly with the visual modeler
