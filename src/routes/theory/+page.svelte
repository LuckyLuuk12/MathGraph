<script lang="ts">
	import { onMount } from 'svelte';
	import {
		parseFormula,
		validateFormula,
		formatFormula,
		type CustomSet,
		type CustomConstraint,
		type ParsedFormula,
		type Point,
		type UsageRule
	} from '$lib/theory-parser';
	import CustomShapeEditor from '$lib/components/CustomShapeEditor.svelte';

	// Theory Extension
	let customConstraintName = '';
	let customConstraintFormula = '';
	let customConstraintDescription = '';
	let savedConstraints: CustomConstraint[] = [];

	// Custom Sets
	let customSetName = '';
	let customSetSymbol = '';
	let customSetShape: 'circle' | 'square' | 'diamond' | 'rectangle' | 'custom' = 'circle';
	let customSetUsageRule: UsageRule = 'standalone';
	let customSetDescription = '';
	let customShapePoints: Point[] = [];
	let savedSets: CustomSet[] = [];

	// Formula validation
	let formulaPreview = '';
	let formulaErrors: string[] = [];
	let parsedFormula: ParsedFormula | null = null;

	// Load saved custom constraints and sets
	onMount(() => {
		const savedConstraintsData = localStorage.getItem('mathgraph_custom_constraints');
		if (savedConstraintsData) {
			try {
				savedConstraints = JSON.parse(savedConstraintsData);
			} catch (e) {
				console.error('Failed to load custom constraints');
			}
		}

		const savedSetsData = localStorage.getItem('mathgraph_custom_sets');
		if (savedSetsData) {
			try {
				savedSets = JSON.parse(savedSetsData);
			} catch (e) {
				console.error('Failed to load custom sets');
			}
		}
	});

	// Update formula preview and validation
	$: {
		if (customConstraintFormula) {
			const validation = validateFormula(customConstraintFormula);
			formulaErrors = validation.errors;
			formulaPreview = formatFormula(customConstraintFormula);
			parsedFormula = parseFormula(customConstraintFormula);
		} else {
			formulaErrors = [];
			formulaPreview = '';
			parsedFormula = null;
		}
	}

	function saveCustomConstraint() {
		if (!customConstraintName.trim() || !customConstraintFormula.trim()) {
			alert('Please provide both name and formula for the constraint');
			return;
		}

		// Validate formula
		const validation = validateFormula(customConstraintFormula);
		if (!validation.valid) {
			alert('Formula has errors:\n' + validation.errors.join('\n'));
			return;
		}

		const parsed = parseFormula(customConstraintFormula);

		savedConstraints = [
			...savedConstraints,
			{
				name: customConstraintName.trim(),
				formula: customConstraintFormula.trim(),
				description: customConstraintDescription.trim() || undefined,
				parsed
			}
		];

		localStorage.setItem('mathgraph_custom_constraints', JSON.stringify(savedConstraints));

		customConstraintName = '';
		customConstraintFormula = '';
		customConstraintDescription = '';

		alert('Custom constraint saved successfully!');
	}

	function saveCustomSet() {
		if (!customSetName.trim() || !customSetSymbol.trim()) {
			alert('Please provide both name and symbol for the set');
			return;
		}

		const newSet: CustomSet = {
			name: customSetName.trim(),
			symbol: customSetSymbol.trim(),
			shape: customSetShape,
			usageRule: customSetUsageRule,
			description: customSetDescription.trim() || undefined
		};

		// Include custom shape points if custom shape is selected
		if (customSetShape === 'custom' && customShapePoints.length > 0) {
			newSet.customShape = customShapePoints;
		}

		savedSets = [...savedSets, newSet];

		localStorage.setItem('mathgraph_custom_sets', JSON.stringify(savedSets));

		customSetName = '';
		customSetSymbol = '';
		customSetShape = 'circle';
		customSetUsageRule = 'standalone';
		customSetDescription = '';
		customShapePoints = [];

		alert('Custom set saved successfully!');
	}

	function deleteConstraint(index: number) {
		if (confirm('Delete this custom constraint?')) {
			savedConstraints = savedConstraints.filter((_, i) => i !== index);
			localStorage.setItem('mathgraph_custom_constraints', JSON.stringify(savedConstraints));
		}
	}

	function deleteSet(index: number) {
		if (confirm('Delete this custom set?')) {
			savedSets = savedSets.filter((_, i) => i !== index);
			localStorage.setItem('mathgraph_custom_sets', JSON.stringify(savedSets));
		}
	}
</script>

<div class="theory-page">
	<div class="header">
		<a href="/" class="back-link">← Home</a>
		<h1>📐 Theory & Logic</h1>
	</div>

	<div class="main-container">
		<!-- Left Sidebar: Theory Documentation -->
		<aside class="left-sidebar">
			<section class="sidebar-section">
				<h2>Information Systems Theory</h2>
				<p class="sidebar-description">
					Mathematical foundation based on university-level IS theory.
				</p>

				<div class="theory-content">
					<h3>Core Sets</h3>
					<ul>
						<li><strong>P</strong> - Set of all predicators (roles)</li>
						<li><strong>O</strong> - Set of all objects (entities, labels, power types)</li>
						<li><strong>E ⊆ O</strong> - Set of entity types</li>
						<li><strong>F</strong> - Set of fact types</li>
						<li><strong>L ⊆ O</strong> - Set of label types</li>
						<li><strong>G ⊆ E</strong> - Set of power types</li>
						<li><strong>S ⊆ E</strong> - Set of sequence types</li>
					</ul>

					<h3>Key Functions</h3>
					<ul>
						<li><strong>Base: P → O</strong> - Maps predicators to their object types</li>
						<li><strong>Pop: O → 𝒫(Ω)</strong> - Population function (instances)</li>
						<li><strong>Fact: F → 𝒫(P)</strong> - Maps fact types to their predicators</li>
					</ul>

					<h3>Constraints</h3>
					<ul>
						<li><strong>Uniqueness:</strong> Ensures unique combinations (PRIMARY KEY)</li>
						<li><strong>Mandatory:</strong> Total role participation (NOT NULL)</li>
						<li><strong>Frequency:</strong> Min/max occurrence limits</li>
						<li><strong>Subset/Equality:</strong> Role relationships</li>
						<li><strong>Exclusion:</strong> Mutually exclusive facts</li>
						<li><strong>Custom:</strong> User-defined validation logic</li>
					</ul>

					<h3>Common Predicates</h3>
					<p class="predicate-note">Use these in your formulas:</p>
					<ul>
						<li><strong>participates(e, p)</strong> - Entity e plays role p</li>
						<li><strong>connects(p, o)</strong> - Role p connects to object o</li>
						<li><strong>hasRole(x)</strong> - Object x has at least one role</li>
						<li><strong>related(x, y)</strong> - Objects x and y are related</li>
						<li><strong>arity(f)</strong> - Returns the arity of fact type f</li>
						<li><strong>size(s)</strong> - Returns the cardinality of set s</li>
						<li><strong>equals(x, y)</strong> - x and y are equal</li>
						<li><strong>subset(x, y)</strong> - x is a subset of y</li>
					</ul>
					<p class="predicate-note">You can also define custom predicates in your formulas.</p>
				</div>
			</section>
		</aside>

		<!-- Middle Content: Forms -->
		<div class="middle-content">
			<!-- Custom Sets Section -->
			<section class="card">
				<h2>🔷 Define Custom Sets</h2>
				<p class="description">
					Define new types of sets for your information system model. Each set can have a custom
					shape and usage rules.
				</p>

				<div class="form-row">
					<div class="form-group">
						<label for="set-name">Set Name</label>
						<input
							id="set-name"
							type="text"
							bind:value={customSetName}
							placeholder="e.g., Category, Department"
						/>
					</div>

					<div class="form-group">
						<label for="set-symbol">Symbol</label>
						<input
							id="set-symbol"
							type="text"
							bind:value={customSetSymbol}
							placeholder="e.g., C, D, Cat"
							maxlength="10"
						/>
					</div>
				</div>

				<div class="shape-container">
					<div class="form-group">
						<label for="set-shape">Shape</label>
						<select id="set-shape" bind:value={customSetShape}>
							<option value="circle">Circle</option>
							<option value="square">Square</option>
							<option value="rectangle">Rectangle</option>
							<option value="diamond">Diamond</option>
							<option value="custom">Custom (draw your own)</option>
						</select>
					</div>

					{#if customSetShape === 'custom'}
						<div class="custom-shape-wrapper">
							<CustomShapeEditor bind:shape={customShapePoints} />
						</div>
					{/if}
				</div>

				<div class="form-group">
					<label for="set-usage">Usage Rule</label>
					<select id="set-usage" bind:value={customSetUsageRule}>
						<option value="standalone">Standalone (like Entity/Fact Type)</option>
						<option value="wraps-single-object">Wraps Single Object (like Objectification)</option>
						<option value="wraps-single-entity">Wraps Single Entity (like Power Type)</option>
						<option value="wraps-multiple-objects">Wraps Multiple Objects</option>
						<option value="wraps-multiple-entities">Wraps Multiple Entities</option>
						<option value="on-edge">On Edge (like Constraints)</option>
					</select>
				</div>

				<div class="form-group">
					<label for="set-description">Description (optional)</label>
					<textarea
						id="set-description"
						bind:value={customSetDescription}
						placeholder="Describe what this set represents..."
						rows="2"
					></textarea>
				</div>

				<button class="primary-btn" on:click={saveCustomSet}>
					<i class="fas fa-save"></i> Save Custom Set
				</button>
			</section>

			<!-- Custom Constraints Section -->
			<section class="card">
				<h2>⚡ Define Custom Constraints</h2>
				<p class="description">
					Define logical constraints using mathematical notation. Use quantifiers, logical
					operators, and set theory syntax.
				</p>

				<div class="syntax-help">
					<h4>Syntax Guide:</h4>
					<div class="syntax-grid">
						<div class="syntax-item">
							<code>∀</code> or <code>FORALL</code> - Universal quantifier
						</div>
						<div class="syntax-item">
							<code>∃</code> or <code>EXISTS</code> - Existential quantifier
						</div>
						<div class="syntax-item">
							<code>∧</code> or <code>&&</code> or <code>/\</code> - AND
						</div>
						<div class="syntax-item">
							<code>∨</code> or <code>||</code> or <code>\/</code> - OR
						</div>
						<div class="syntax-item">
							<code>¬</code> or <code>!</code> or <code>NOT</code> - Negation
						</div>
						<div class="syntax-item">
							<code>→</code> or <code>=></code> - Implies
						</div>
						<div class="syntax-item">
							<code>forall_&#123;x in S&#125;[...]</code> - Bounded quantifier
						</div>
						<div class="syntax-item">
							<code>;</code> - Statement separator
						</div>
					</div>
					<p class="syntax-example">
						Example: <code
							>forall_&#123;x in E&#125;[EXISTS_&#123;y in P&#125;[connected(x, y)]]</code
						>
					</p>
				</div>

				<div class="form-group">
					<label for="constraint-name">Constraint Name</label>
					<input
						id="constraint-name"
						type="text"
						bind:value={customConstraintName}
						placeholder="e.g., MandatoryParticipation, UniqueRole"
					/>
				</div>

				<div class="form-group">
					<label for="constraint-formula">Mathematical Formula</label>
					<textarea
						id="constraint-formula"
						bind:value={customConstraintFormula}
						placeholder="forall_&#123;x in E&#125;[EXISTS_&#123;y in P&#125;[role(x, y)]];&#10;// Every entity must have at least one role"
						rows="6"
						class:error={formulaErrors.length > 0}
					></textarea>
					{#if formulaErrors.length > 0}
						<div class="validation-errors">
							{#each formulaErrors as error}
								<div class="error-message">
									<i class="fas fa-exclamation-triangle"></i>
									{error}
								</div>
							{/each}
						</div>
					{/if}
					{#if formulaPreview && formulaErrors.length === 0}
						<div class="formula-preview">
							<strong>Preview:</strong>
							<div class="preview-text">{formulaPreview}</div>
						</div>
					{/if}
					{#if parsedFormula && formulaErrors.length === 0}
						<div class="parsed-info">
							<span>Variables: {Array.from(parsedFormula.variables).join(', ') || 'none'}</span>
							<span>Sets: {Array.from(parsedFormula.sets).join(', ') || 'none'}</span>
						</div>
					{/if}
				</div>

				<div class="form-group">
					<label for="constraint-description">Description (optional)</label>
					<textarea
						id="constraint-description"
						bind:value={customConstraintDescription}
						placeholder="Explain what this constraint enforces..."
						rows="2"
					></textarea>
				</div>

				<button
					class="primary-btn"
					on:click={saveCustomConstraint}
					disabled={formulaErrors.length > 0 || !customConstraintName || !customConstraintFormula}
				>
					<i class="fas fa-save"></i> Save Custom Constraint
				</button>
			</section>
		</div>

		<!-- Right Sidebar: Saved Items -->
		<aside class="right-sidebar">
			<section class="sidebar-section">
				<h2>Custom Sets</h2>
				{#if savedSets.length > 0}
					<div class="saved-list">
						{#each savedSets as set, index}
							<div class="saved-item">
								<div class="saved-item-header">
									<div class="item-title">
										<span class="shape-badge shape-{set.shape}">{set.symbol}</span>
										<strong>{set.name}</strong>
									</div>
									<button
										class="delete-btn-small"
										on:click={() => deleteSet(index)}
										title="Delete set"
									>
										<i class="fas fa-times"></i>
									</button>
								</div>
								{#if set.description}
									<p class="saved-item-desc">{set.description}</p>
								{/if}
								{#if set.usageRule}
									<div class="saved-item-rule">
										<i class="fas fa-info-circle"></i>
										{set.usageRule}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{:else}
					<p class="empty-state">No custom sets defined yet.</p>
				{/if}
			</section>

			<section class="sidebar-section">
				<h2>Custom Constraints</h2>
				{#if savedConstraints.length > 0}
					<div class="saved-list">
						{#each savedConstraints as constraint, index}
							<div class="saved-item">
								<div class="saved-item-header">
									<strong>{constraint.name}</strong>
									<button
										class="delete-btn-small"
										on:click={() => deleteConstraint(index)}
										title="Delete constraint"
									>
										<i class="fas fa-times"></i>
									</button>
								</div>
								{#if constraint.description}
									<p class="saved-item-desc">{constraint.description}</p>
								{/if}
								<div class="saved-formula">{formatFormula(constraint.formula)}</div>
							</div>
						{/each}
					</div>
				{:else}
					<p class="empty-state">No custom constraints defined yet.</p>
				{/if}
			</section>
		</aside>
	</div>
</div>

<style>
	.theory-page {
		min-height: 100vh;
		max-height: 100vh;
		background: var(--bg-primary);
		display: flex;
		flex-direction: column;
		overflow: hidden;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 2rem;
		padding: 1.5rem 2rem;
		background: var(--bg-secondary);
		border-bottom: 1px solid var(--border-color);
		flex-shrink: 0;
	}

	.back-link {
		color: var(--accent-primary);
		text-decoration: none;
		font-weight: 500;
		transition: color 0.2s;
	}

	.back-link:hover {
		color: var(--accent-hover);
	}

	.header h1 {
		margin: 0;
	}

	.main-container {
		flex: 1;
		display: grid;
		grid-template-columns: 280px 1fr 320px;
		overflow: hidden;
	}

	.left-sidebar,
	.right-sidebar {
		background: var(--bg-secondary);
		border-right: 1px solid var(--border-color);
		overflow-y: auto;
		padding: 1.5rem;
	}

	.right-sidebar {
		border-right: none;
		border-left: 1px solid var(--border-color);
	}

	.middle-content {
		overflow-y: auto;
		padding: 2rem;
	}

	.sidebar-section {
		margin-bottom: 2rem;
	}

	.sidebar-section h2 {
		margin: 0 0 1rem 0;
		font-size: 1.1rem;
		color: var(--text-primary);
	}

	.sidebar-description {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
		line-height: 1.5;
	}

	.theory-content h3 {
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--accent-primary);
		font-size: 0.95rem;
	}

	.theory-content ul {
		padding-left: 1.5rem;
		margin: 0 0 1rem 0;
	}

	.theory-content li {
		margin-bottom: 0.5rem;
		line-height: 1.6;
		color: var(--text-secondary);
		font-size: 0.875rem;
	}

	.theory-content strong {
		color: var(--text-primary);
	}

	.predicate-note {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		font-style: italic;
		margin: 0.5rem 0;
		line-height: 1.5;
	}

	.saved-list {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.saved-item {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 0.75rem;
		font-size: 0.8125rem;
	}

	.saved-item-header {
		display: flex;
		justify-content: space-between;
		align-items: flex-start;
		margin-bottom: 0.5rem;
		gap: 0.5rem;
	}

	.saved-item-header strong {
		color: var(--accent-primary);
		font-size: 0.875rem;
		flex: 1;
	}

	.saved-item-desc {
		margin: 0 0 0.5rem 0;
		color: var(--text-secondary);
		font-size: 0.75rem;
		line-height: 1.4;
	}

	.saved-item-rule {
		font-size: 0.75rem;
		color: var(--text-secondary);
		padding: 0.4rem;
		background: var(--bg-secondary);
		border-radius: 4px;
		display: flex;
		align-items: center;
		gap: 0.4rem;
	}

	.saved-formula {
		font-family: 'Cambria Math', 'Times New Roman', serif;
		font-size: 0.9rem;
		padding: 0.5rem;
		background: var(--bg-secondary);
		border-radius: 4px;
		color: var(--text-primary);
		line-height: 1.4;
		word-break: break-word;
	}

	.empty-state {
		color: var(--text-secondary);
		font-size: 0.8125rem;
		font-style: italic;
		margin: 0;
	}

	.delete-btn-small {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.125rem 0.25rem;
		border-radius: 3px;
		font-size: 0.75rem;
		transition: all 0.2s;
		flex-shrink: 0;
	}

	.delete-btn-small:hover {
		background: #dc2626;
		color: white;
	}

	.card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 1.5rem;
		margin-bottom: 2rem;
	}

	.card h2 {
		margin-top: 0;
		margin-bottom: 1rem;
		color: var(--text-primary);
	}

	.description {
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
		line-height: 1.6;
	}

	.form-group {
		margin-bottom: 1.5rem;
	}

	.form-group label {
		display: block;
		margin-bottom: 0.5rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.form-group input,
	.form-group textarea {
		width: 100%;
		padding: 0.75rem;
		font-size: 1rem;
		font-family: 'Consolas', 'Monaco', monospace;
		border: 2px solid var(--border-color);
		border-radius: 6px;
		background: var(--bg-primary);
		color: var(--text-primary);
		transition: border-color 0.2s;
	}

	.form-group input:focus,
	.form-group textarea:focus {
		outline: none;
		border-color: var(--accent-primary);
	}

	.form-group textarea {
		resize: vertical;
		min-height: 100px;
	}

	.button-group {
		display: flex;
		gap: 1rem;
		margin-bottom: 1rem;
	}

	.primary-btn {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
		background: var(--accent-primary);
		color: white;
		display: inline-flex;
		align-items: center;
		gap: 0.5rem;
	}

	.primary-btn:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.delete-btn {
		background: transparent;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		border-radius: 4px;
		transition: all 0.2s;
	}

	.delete-btn:hover {
		background: #dc2626;
		color: white;
	}

	.shape-badge {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 32px;
		height: 32px;
		border: 2px solid var(--accent-primary);
		font-weight: bold;
		font-size: 0.75rem;
		background: var(--bg-secondary);
	}

	.shape-badge.shape-circle {
		border-radius: 50%;
	}

	.shape-badge.shape-square {
		border-radius: 4px;
	}

	.shape-badge.shape-rectangle {
		width: 48px;
		border-radius: 4px;
	}

	.shape-badge.shape-diamond {
		transform: rotate(45deg);
		border-radius: 4px;
	}

	.shape-badge.shape-custom {
		border-radius: 4px;
		position: relative;
	}

	.formula-display {
		font-family: 'Cambria Math', 'Times New Roman', serif;
		font-size: 1.1rem;
		padding: 1rem;
		background: var(--bg-secondary);
		border-radius: 4px;
		margin-bottom: 0.5rem;
		line-height: 1.6;
		color: var(--text-primary);
	}

	.formula-details {
		margin-top: 0.5rem;
	}

	.constraint-code {
		background: var(--bg-secondary);
		padding: 0.75rem;
		border-radius: 4px;
		overflow-x: auto;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--text-primary);
		margin: 0.5rem 0 0 0;
	}

	.syntax-help {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 1rem;
		margin-bottom: 1.5rem;
	}

	.syntax-help h4 {
		margin: 0 0 0.75rem 0;
		color: var(--text-primary);
		font-size: 0.9rem;
	}

	.syntax-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.syntax-item {
		font-size: 0.8125rem;
		color: var(--text-secondary);
		line-height: 1.4;
	}

	.syntax-item code {
		background: var(--bg-secondary);
		padding: 0.125rem 0.375rem;
		border-radius: 3px;
		font-family: 'Consolas', 'Monaco', monospace;
		color: var(--accent-primary);
	}

	.syntax-example {
		margin: 0.75rem 0 0 0;
		padding-top: 0.75rem;
		border-top: 1px solid var(--border-color);
		font-size: 0.8125rem;
		color: var(--text-secondary);
	}

	.syntax-example code {
		display: block;
		margin-top: 0.5rem;
		background: var(--bg-secondary);
		padding: 0.5rem;
		border-radius: 4px;
		font-family: 'Consolas', 'Monaco', monospace;
		color: var(--text-primary);
		overflow-x: auto;
	}

	.form-row {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.shape-container {
		display: flex;
		gap: 1.5rem;
		align-items: flex-start;
		margin-bottom: 1.5rem;
	}

	.shape-container .form-group {
		margin-bottom: 0;
		flex-shrink: 0;
	}

	.custom-shape-wrapper {
		flex-shrink: 0;
	}

	.validation-errors {
		margin-top: 0.5rem;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.error-message {
		color: #dc2626;
		font-size: 0.8125rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}

	.formula-preview {
		margin-top: 0.75rem;
		padding: 0.75rem;
		background: #10b981;
		background: color-mix(in srgb, #10b981 15%, var(--bg-secondary));
		border: 1px solid #10b981;
		border-radius: 4px;
	}

	.formula-preview strong {
		font-size: 0.8125rem;
		color: var(--text-primary);
		display: block;
		margin-bottom: 0.5rem;
	}

	.preview-text {
		font-family: 'Cambria Math', 'Times New Roman', serif;
		font-size: 1.1rem;
		color: var(--text-primary);
		line-height: 1.6;
	}

	.parsed-info {
		margin-top: 0.5rem;
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	textarea.error {
		border-color: #dc2626;
	}

	@media (max-width: 1024px) {
		.main-container {
			grid-template-columns: 1fr;
			grid-template-rows: auto 1fr auto;
		}

		.left-sidebar,
		.right-sidebar {
			border-right: none;
			border-left: none;
			border-bottom: 1px solid var(--border-color);
			max-height: 300px;
		}

		.middle-content {
			order: 1;
		}

		.left-sidebar {
			order: 2;
		}

		.right-sidebar {
			order: 3;
			border-bottom: none;
			border-top: 1px solid var(--border-color);
		}
	}

	@media (max-width: 768px) {
		.card {
			padding: 1rem;
		}

		.form-row {
			grid-template-columns: 1fr;
		}
	}
</style>
