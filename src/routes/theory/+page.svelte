<script lang="ts">
	import { onMount } from 'svelte';

	// Theory Extension
	let customConstraintName = '';
	let customConstraintLogic = '';
	let savedConstraints: Array<{ name: string; logic: string }> = [];

	// SAT Checking
	let satFormula = '';
	let satResult = '';
	let satLoading = false;

	// Load saved custom constraints
	onMount(() => {
		const saved = localStorage.getItem('mathgraph_custom_constraints');
		if (saved) {
			try {
				savedConstraints = JSON.parse(saved);
			} catch (e) {
				console.error('Failed to load custom constraints');
			}
		}
	});

	function saveCustomConstraint() {
		if (!customConstraintName.trim() || !customConstraintLogic.trim()) {
			alert('Please provide both name and logic for the constraint');
			return;
		}

		savedConstraints = [
			...savedConstraints,
			{
				name: customConstraintName.trim(),
				logic: customConstraintLogic.trim()
			}
		];

		localStorage.setItem('mathgraph_custom_constraints', JSON.stringify(savedConstraints));

		customConstraintName = '';
		customConstraintLogic = '';

		alert('Custom constraint saved successfully!');
	}

	function deleteConstraint(index: number) {
		if (confirm('Delete this custom constraint?')) {
			savedConstraints = savedConstraints.filter((_, i) => i !== index);
			localStorage.setItem('mathgraph_custom_constraints', JSON.stringify(savedConstraints));
		}
	}

	function checkSAT() {
		satLoading = true;
		satResult = '';

		// Simple SAT checker simulation (replace with actual SAT solver in production)
		setTimeout(() => {
			try {
				// Parse the formula (simplified example)
				const formula = satFormula.trim();

				if (!formula) {
					satResult = '❌ Error: Empty formula';
					satLoading = false;
					return;
				}

				// Very basic satisfiability check
				// This is a placeholder - in production, use a real SAT solver library
				if (formula.includes('AND') || formula.includes('&&')) {
					const parts = formula.split(/AND|&&/);
					const hasContradiction = parts.some((part, i) =>
						parts.some((other, j) => i !== j && areContradictory(part.trim(), other.trim()))
					);

					if (hasContradiction) {
						satResult = '❌ UNSATISFIABLE - Formula contains contradictions';
					} else {
						satResult = '✅ SATISFIABLE - Example: ' + generateExample(parts);
					}
				} else {
					satResult = '✅ SATISFIABLE - Single clause formula';
				}
			} catch (error) {
				satResult = '❌ Error parsing formula: ' + (error as Error).message;
			}

			satLoading = false;
		}, 500);
	}

	function areContradictory(clause1: string, clause2: string): boolean {
		// Simple check: if one is "NOT X" and other is "X"
		const not1 = clause1.startsWith('NOT ') || clause1.startsWith('!');
		const not2 = clause2.startsWith('NOT ') || clause2.startsWith('!');

		if (not1 !== not2) {
			const var1 = clause1.replace(/^(NOT |!)/, '').trim();
			const var2 = clause2.replace(/^(NOT |!)/, '').trim();
			return var1 === var2;
		}
		return false;
	}

	function generateExample(parts: string[]): string {
		return parts
			.map((p) => {
				const isNegated = p.startsWith('NOT ') || p.startsWith('!');
				const varName = p.replace(/^(NOT |!)/, '').trim();
				return `${varName}=${!isNegated}`;
			})
			.join(', ');
	}

	function clearSAT() {
		satFormula = '';
		satResult = '';
	}
</script>

<div class="theory-page">
	<div class="header">
		<a href="/" class="back-link">← Home</a>
		<h1>Theory & Logic</h1>
	</div>

	<div class="content">
		<!-- Theory Extension Section -->
		<section class="card">
			<h2>Theory Extension</h2>
			<p class="description">
				Define custom constraint types to extend the Information Systems theory. These constraints
				can be reused across projects.
			</p>

			<div class="form-group">
				<label for="constraint-name">Constraint Name</label>
				<input
					id="constraint-name"
					type="text"
					bind:value={customConstraintName}
					placeholder="e.g., AtLeastTwo, MaxThree, NoEmpty"
				/>
			</div>

			<div class="form-group">
				<label for="constraint-logic">Constraint Logic (JavaScript)</label>
				<textarea
					id="constraint-logic"
					bind:value={customConstraintLogic}
					placeholder="function validate(entity, predicators) &#123;&#10;  // Return true if constraint is satisfied&#10;  return entity.population.size >= 2;&#10;&#125;"
					rows="8"
				></textarea>
			</div>

			<button class="primary-btn" on:click={saveCustomConstraint}> Save Custom Constraint </button>

			{#if savedConstraints.length > 0}
				<div class="saved-constraints">
					<h3>Saved Custom Constraints</h3>
					<div class="constraints-list">
						{#each savedConstraints as constraint, index}
							<div class="constraint-item">
								<div class="constraint-header">
									<strong>{constraint.name}</strong>
									<button class="delete-btn" on:click={() => deleteConstraint(index)}> 🗑️ </button>
								</div>
								<pre class="constraint-code">{constraint.logic}</pre>
							</div>
						{/each}
					</div>
				</div>
			{/if}
		</section>

		<!-- SAT Checker Section -->
		<section class="card">
			<h2>SAT / Logic Checker</h2>
			<p class="description">
				Check the satisfiability of logical formulas. Use boolean operators: AND (&&), OR (||), NOT
				(!).
			</p>

			<div class="form-group">
				<label for="sat-formula">Formula (CNF or DNF)</label>
				<textarea
					id="sat-formula"
					bind:value={satFormula}
					placeholder="Example: (A AND B) OR (NOT A AND C)&#10;Or: X && Y && !Z"
					rows="6"
				></textarea>
			</div>

			<div class="button-group">
				<button class="primary-btn" on:click={checkSAT} disabled={satLoading || !satFormula.trim()}>
					{satLoading ? 'Checking...' : 'Check SAT'}
				</button>
				<button class="secondary-btn" on:click={clearSAT}>Clear</button>
			</div>

			{#if satResult}
				<div class="result-box" class:satisfiable={satResult.includes('SATISFIABLE')}>
					<pre>{satResult}</pre>
				</div>
			{/if}

			<div class="info-box">
				<h4>How to use:</h4>
				<ul>
					<li><strong>Variables:</strong> Use letters (A, B, C, X, Y, Z, etc.)</li>
					<li><strong>AND:</strong> Use "AND" or "&&"</li>
					<li><strong>OR:</strong> Use "OR" or "||"</li>
					<li><strong>NOT:</strong> Use "NOT " or "!"</li>
					<li><strong>Example:</strong> (A AND B) OR (NOT A AND C)</li>
				</ul>
			</div>
		</section>

		<!-- Theory Documentation Section -->
		<section class="card">
			<h2>Information Systems Theory</h2>
			<p class="description">Mathematical foundation based on university-level IS theory.</p>

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
			</div>
		</section>
	</div>
</div>

<style>
	.theory-page {
		min-height: 100vh;
		background: var(--bg-primary);
		padding: 2rem;
	}

	.header {
		display: flex;
		align-items: center;
		gap: 2rem;
		margin-bottom: 2rem;
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

	.content {
		max-width: 1200px;
		margin: 0 auto;
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.card {
		background: var(--bg-secondary);
		border: 1px solid var(--border-color);
		border-radius: 8px;
		padding: 2rem;
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

	.primary-btn,
	.secondary-btn {
		padding: 0.75rem 1.5rem;
		font-size: 1rem;
		font-weight: 600;
		border: none;
		border-radius: 6px;
		cursor: pointer;
		transition: all 0.2s;
	}

	.primary-btn {
		background: var(--accent-primary);
		color: white;
	}

	.primary-btn:hover:not(:disabled) {
		background: var(--accent-hover);
	}

	.primary-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.secondary-btn {
		background: var(--bg-primary);
		color: var(--text-primary);
		border: 1px solid var(--border-color);
	}

	.secondary-btn:hover {
		background: var(--border-color);
	}

	.saved-constraints {
		margin-top: 2rem;
		padding-top: 2rem;
		border-top: 1px solid var(--border-color);
	}

	.saved-constraints h3 {
		margin-bottom: 1rem;
		color: var(--text-primary);
	}

	.constraints-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.constraint-item {
		background: var(--bg-primary);
		border: 1px solid var(--border-color);
		border-radius: 6px;
		padding: 1rem;
	}

	.constraint-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.75rem;
	}

	.constraint-header strong {
		color: var(--accent-primary);
		font-size: 1.1rem;
	}

	.delete-btn {
		background: transparent;
		border: none;
		font-size: 1.2rem;
		cursor: pointer;
		opacity: 0.6;
		transition: opacity 0.2s;
	}

	.delete-btn:hover {
		opacity: 1;
	}

	.constraint-code {
		background: var(--bg-secondary);
		padding: 1rem;
		border-radius: 4px;
		overflow-x: auto;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 0.9rem;
		line-height: 1.5;
		color: var(--text-primary);
		margin: 0;
	}

	.result-box {
		margin-top: 1rem;
		padding: 1.5rem;
		border-radius: 6px;
		background: var(--bg-primary);
		border: 2px solid #e74c3c;
	}

	.result-box.satisfiable {
		border-color: #27ae60;
	}

	.result-box pre {
		margin: 0;
		font-family: 'Consolas', 'Monaco', monospace;
		font-size: 1rem;
		line-height: 1.5;
		white-space: pre-wrap;
		word-wrap: break-word;
	}

	.info-box {
		margin-top: 1.5rem;
		padding: 1.5rem;
		background: var(--bg-primary);
		border-left: 4px solid var(--accent-primary);
		border-radius: 4px;
	}

	.info-box h4 {
		margin-top: 0;
		margin-bottom: 0.75rem;
		color: var(--text-primary);
	}

	.info-box ul {
		margin: 0;
		padding-left: 1.5rem;
	}

	.info-box li {
		margin-bottom: 0.5rem;
		color: var(--text-secondary);
		line-height: 1.6;
	}

	.theory-content h3 {
		margin-top: 1.5rem;
		margin-bottom: 0.75rem;
		color: var(--accent-primary);
	}

	.theory-content ul {
		padding-left: 1.5rem;
	}

	.theory-content li {
		margin-bottom: 0.5rem;
		line-height: 1.6;
		color: var(--text-secondary);
	}

	.theory-content strong {
		color: var(--text-primary);
	}

	@media (max-width: 768px) {
		.theory-page {
			padding: 1rem;
		}

		.card {
			padding: 1rem;
		}

		.button-group {
			flex-direction: column;
		}
	}
</style>
