<script lang="ts">
	/**
	 * MathGraph Schema Builder Example
	 *
	 * Demonstrates core functionality: creating entities, fact types, constraints,
	 * and generating SQL schemas.
	 */

	import {
		graphStore,
		validationStore,
		isValidStore,
		getCurrentSchema
	} from '$lib/stores/graph-store';
	import { exportToSQL } from '$lib/sql-generator';
	import { SQLDialect, DataType } from '$lib/constants';

	let generatedSQL = '';
	let schemaName = 'Example Schema';

	/**
	 * Create a simple example schema: Person -> Company relationship
	 */
	function createExampleSchema() {
		// Reset store
		graphStore.reset();

		// Update schema name
		graphStore.updateSchemaMetadata(schemaName, '1.0.0');

		// 1. Create Person Entity
		const personEntity: Entity = {
			id: crypto.randomUUID(),
			name: 'Person',
			kind: 'Entity',
			identifiers: [
				{
					id: crypto.randomUUID(),
					name: 'PK_Person',
					predicatorIds: [], // Will be populated after creating fact types
					isPrimary: true
				}
			]
		};
		graphStore.addEntity(personEntity, { x: 100, y: 200 });

		// 2. Create Company Entity
		const companyEntity: Entity = {
			id: crypto.randomUUID(),
			name: 'Company',
			kind: 'Entity',
			identifiers: [
				{
					id: crypto.randomUUID(),
					name: 'PK_Company',
					predicatorIds: [],
					isPrimary: true
				}
			]
		};
		graphStore.addEntity(companyEntity, { x: 500, y: 200 });

		// 3. Create Label Type: Email
		const emailLabel: LabelType = {
			id: crypto.randomUUID(),
			name: 'Email',
			kind: 'Label',
			dataType: 'String',
			pattern: '^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\\.[a-zA-Z]{2,}$'
		};
		graphStore.addLabelType(emailLabel, { x: 100, y: 400 });

		// 4. Create Fact Type: Person has Email (unary-like, stored as attribute)
		const emailFactType: FactType = {
			id: crypto.randomUUID(),
			name: 'has_email',
			predicators: [],
			isUnary: false,
			isObjectified: false,
			arity: 2
		};

		const emailPred1: Predicator = {
			id: crypto.randomUUID(),
			name: 'person',
			factTypeId: emailFactType.id,
			position: 0,
			objectId: personEntity.id,
			isOptional: false
		};

		const emailPred2: Predicator = {
			id: crypto.randomUUID(),
			name: 'email_address',
			factTypeId: emailFactType.id,
			position: 1,
			objectId: emailLabel.id,
			isOptional: false
		};

		emailFactType.predicators = [emailPred1.id, emailPred2.id];
		graphStore.addFactType(emailFactType, [emailPred1, emailPred2]);

		// 5. Create Fact Type: Person works_at Company
		const worksAtFactType: FactType = {
			id: crypto.randomUUID(),
			name: 'works_at',
			predicators: [],
			isUnary: false,
			isObjectified: false,
			arity: 2
		};

		const worksPred1: Predicator = {
			id: crypto.randomUUID(),
			name: 'employee',
			factTypeId: worksAtFactType.id,
			position: 0,
			objectId: personEntity.id,
			isOptional: true // Person may not work at a company
		};

		const worksPred2: Predicator = {
			id: crypto.randomUUID(),
			name: 'employer',
			factTypeId: worksAtFactType.id,
			position: 1,
			objectId: companyEntity.id,
			isOptional: false
		};

		worksAtFactType.predicators = [worksPred1.id, worksPred2.id];
		graphStore.addFactType(worksAtFactType, [worksPred1, worksPred2]);

		// 6. Add Uniqueness Constraint: Each person has unique email
		graphStore.addUniqueConstraint({
			id: crypto.randomUUID(),
			name: 'UC_PersonEmail',
			predicatorIds: [emailPred1.id],
			isPrimary: false,
			isPreferred: true
		});

		// 7. Add Total Role Constraint: Every person must have an email
		graphStore.addTotalRoleConstraint({
			id: crypto.randomUUID(),
			name: 'TRC_PersonEmail',
			predicatorId: emailPred1.id,
			objectId: personEntity.id
		});
	}

	/**
	 * Generate SQL from current schema
	 */
	function generateSQL(dialect: SQLDialect) {
		const schema = getCurrentSchema();
		generatedSQL = exportToSQL(schema, dialect);
	}

	// Auto-create example on mount
	import { onMount } from 'svelte';
	onMount(() => {
		createExampleSchema();
		generateSQL(SQLDialect.PostgreSQL);
	});
</script>

<div class="container">
	<header>
		<h1>🔷 MathGraph</h1>
		<p>Visual Information Modeling with Formal Constraint Validation</p>
		<div class="action-buttons">
			<a href="/modeler" class="primary-btn">
				<span class="icon">✏️</span>
				Open Visual Modeler
			</a>
		</div>
	</header>

	<section class="schema-info">
		<h2>Schema Overview</h2>
		<div class="stats">
			<div class="stat">
				<span class="label">Entities:</span>
				<span class="value">{$graphStore.schema.entities.size}</span>
			</div>
			<div class="stat">
				<span class="label">Fact Types:</span>
				<span class="value">{$graphStore.schema.factTypes.size}</span>
			</div>
			<div class="stat">
				<span class="label">Constraints:</span>
				<span class="value">
					{$graphStore.schema.uniqueConstraints.size +
						$graphStore.schema.totalRoleConstraints.size +
						$graphStore.schema.setConstraints.size}
				</span>
			</div>
			<div class="stat">
				<span class="label">Valid:</span>
				<span class="value {$isValidStore ? 'valid' : 'invalid'}">
					{$isValidStore ? '✓' : '✗'}
				</span>
			</div>
		</div>
	</section>

	<section class="validation">
		<h2>Validation Results</h2>
		{#if $validationStore.violations.length === 0}
			<div class="success">✓ No constraint violations detected</div>
		{:else}
			<div class="violations">
				{#each $validationStore.violations as violation}
					<div class="violation {violation.severity.toLowerCase()}">
						<strong>[{violation.severity}]</strong>
						{violation.message}
					</div>
				{/each}
			</div>
		{/if}
	</section>

	<section class="sql-generation">
		<h2>SQL Schema Generation</h2>

		<div class="controls">
			<button on:click={() => generateSQL(SQLDialect.PostgreSQL)}> Generate PostgreSQL </button>
			<button on:click={() => generateSQL(SQLDialect.MySQL)}> Generate MySQL </button>
			<button on:click={() => generateSQL(SQLDialect.SQLite)}> Generate SQLite </button>
			<button on:click={createExampleSchema}> Reset Example </button>
		</div>

		{#if generatedSQL}
			<div class="sql-output">
				<h3>Generated DDL:</h3>
				<pre><code>{generatedSQL}</code></pre>
			</div>
		{/if}
	</section>

	<section class="documentation">
		<h2>Mathematical Framework</h2>
		<div class="theory">
			<h3>Core Sets:</h3>
			<ul>
				<li><strong>P (Predicators):</strong> {$graphStore.schema.predicators.size} roles</li>
				<li><strong>O (Objects):</strong> {$graphStore.schema.objects.size} object types</li>
				<li><strong>E (Entities):</strong> {$graphStore.schema.entities.size} entity types</li>
				<li><strong>F (Fact Types):</strong> {$graphStore.schema.factTypes.size} relationships</li>
				<li><strong>L (Label Types):</strong> {$graphStore.schema.labelTypes.size} value types</li>
			</ul>

			<h3>Constraint Types:</h3>
			<ul>
				<li>Uniqueness: {$graphStore.schema.uniqueConstraints.size}</li>
				<li>Total Role: {$graphStore.schema.totalRoleConstraints.size}</li>
				<li>Set Constraints: {$graphStore.schema.setConstraints.size}</li>
				<li>Cardinality: {$graphStore.schema.cardinalityConstraints.size}</li>
				<li>Custom: {$graphStore.schema.customConstraints.size}</li>
			</ul>
		</div>
	</section>
</div>

<style>
	.container {
		max-width: 1200px;
		margin: 0 auto;
		padding: 2rem;
		font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
	}

	header {
		text-align: center;
		margin-bottom: 3rem;
	}

	h1 {
		font-size: 3rem;
		margin-bottom: 0.5rem;
		color: var(--primary-color);
	}

	h2 {
		color: var(--text-primary);
		border-bottom: 2px solid var(--primary-color);
		padding-bottom: 0.5rem;
		margin-bottom: 1.5rem;
	}

	.action-buttons {
		margin-top: 2rem;
		display: flex;
		justify-content: center;
		gap: 1rem;
	}

	.primary-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
		padding: 1rem 2rem;
		background: var(--primary-color);
		color: white;
		border-radius: 0.5rem;
		font-weight: 600;
		font-size: 1.125rem;
		text-decoration: none;
		transition: all 0.2s;
		box-shadow: var(--shadow);
	}

	.primary-btn:hover {
		background: var(--primary-hover);
		transform: translateY(-2px);
		box-shadow: var(--shadow-lg);
		text-decoration: none;
	}

	.icon {
		font-size: 1.25rem;
	}

	section {
		margin-bottom: 3rem;
		padding: 1.5rem;
		background: var(--bg-secondary);
		border-radius: 0.5rem;
		border: 1px solid var(--border-color);
	}

	.stats {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 1rem;
	}

	.stat {
		background: var(--bg-primary);
		padding: 1rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border-color);
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.stat .label {
		font-weight: 600;
		color: var(--text-secondary);
	}

	.stat .value {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--text-primary);
	}

	.stat .value.valid {
		color: var(--success-color);
	}

	.stat .value.invalid {
		color: var(--error-color);
	}

	.success {
		padding: 1rem;
		background: var(--success-light);
		color: var(--success-color);
		border-radius: 0.375rem;
		border: 1px solid var(--success-color);
	}

	.violations {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.violation {
		padding: 0.75rem;
		border-radius: 0.375rem;
		border: 1px solid;
	}

	.violation.error {
		background: var(--error-light);
		color: var(--error-color);
		border-color: var(--error-color);
	}

	.violation.warning {
		background: var(--warning-light);
		color: var(--warning-color);
		border-color: var(--warning-color);
	}

	.controls {
		display: flex;
		gap: 1rem;
		margin-bottom: 1.5rem;
		flex-wrap: wrap;
	}

	button {
		padding: 0.75rem 1.5rem;
		background: var(--primary-color);
		color: white;
		border: none;
		border-radius: 0.375rem;
		font-weight: 600;
		cursor: pointer;
		transition: background 0.2s;
	}

	button:hover {
		background: var(--primary-hover);
	}

	.sql-output {
		background: var(--bg-primary);
		padding: 1.5rem;
		border-radius: 0.375rem;
		border: 1px solid var(--border-color);
	}

	pre {
		margin: 0;
		overflow-x: auto;
	}

	code {
		font-family: 'Courier New', monospace;
		font-size: 0.875rem;
		line-height: 1.5;
		color: var(--text-primary);
	}

	.theory ul {
		list-style: none;
		padding: 0;
	}

	.theory li {
		padding: 0.5rem 0;
		border-bottom: 1px solid var(--border-color);
		color: var(--text-secondary);
	}

	.theory li:last-child {
		border-bottom: none;
	}
</style>
