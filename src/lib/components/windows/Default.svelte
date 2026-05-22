<script lang="ts">
	type Target = 'modeler' | 'theory' | 'dsl' | 'export' | 'guide';

	function navigate(target: Target) {
		console.log('navigate:', target);
	}
</script>

<div class="page">
	<header class="hero">
		<div class="badge">Graph-based Mathematical Modeling System</div>

		<h1>
			<span class="accent">Math</span>Graph
		</h1>

		<p>
			Structural modeling environment for mathematical systems using graph semantics inspired by PSM
			and ORM theory.
		</p>

		<div class="cta">
			<button class="primary" on:click={() => navigate('modeler')}> Open Modeler </button>
			<button on:click={() => navigate('theory')}> View Theory </button>
		</div>
	</header>

	<section class="grid">
		<button class="tile" on:click={() => navigate('modeler')}>
			<h3>Modeler</h3>
			<p>Construct and manipulate structural graphs.</p>
		</button>

		<button class="tile" on:click={() => navigate('theory')}>
			<h3>Theory</h3>
			<p>PSM / ORM structural semantics overview.</p>
		</button>

		<button class="tile" on:click={() => navigate('dsl')}>
			<h3>DSL</h3>
			<p>Declarative graph construction language.</p>
		</button>

		<button class="tile" on:click={() => navigate('export')}>
			<h3>Export</h3>
			<p>Serialize graphs into external formats.</p>
		</button>

		<button class="tile" on:click={() => navigate('guide')}>
			<h3>Guide</h3>
			<p>System usage and conceptual overview.</p>
		</button>
	</section>

	<section class="theory">
		<div class="panel">
			<h2>Theoretical model</h2>
			<p>
				Entities, relations, and constraints are represented as a typed graph structure.
				Transformations operate on graph topology and semantic annotations.
			</p>
		</div>

		<div class="panel highlight">
			<h2>Core idea</h2>
			<p>Mathematical structures are not expressions, but navigable constraint graphs.</p>
		</div>
	</section>
</div>

<style>
	.page {
		padding: 3rem;
		display: flex;
		flex-direction: column;
		gap: 3rem;
	}

	/* HERO */

	.hero {
		max-width: 900px;
	}

	.badge {
		display: inline-block;
		padding: 0.4rem 0.8rem;
		border-radius: 999px;
		font-size: 0.75rem;
		background: var(--primary-light);
		color: var(--primary-color);
		border: 1px solid var(--border-color);
		margin-bottom: 1rem;
	}

	h1 {
		font-size: 3.5rem;
		margin: 0;
		letter-spacing: -0.03em;
	}

	.accent {
		color: var(--primary-color);
	}

	p {
		color: var(--text-secondary);
		max-width: 70ch;
		line-height: 1.5;
		margin-top: 1rem;
	}

	/* CTA */

	.cta {
		display: flex;
		gap: 1rem;
		margin-top: 2rem;
	}

	button {
		padding: 0.7rem 1rem;
		border-radius: 10px;
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
		color: var(--text-primary);
		cursor: pointer;
		transition: 0.15s ease;
	}

	button:hover {
		background: var(--hover-bg);
		transform: translateY(-1px);
	}

	.primary {
		background: var(--primary-color);
		color: white;
		border: 1px solid var(--primary-hover);
	}

	.primary:hover {
		background: var(--primary-hover);
	}

	/* GRID */

	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
		gap: 1rem;
	}

	.tile {
		text-align: left;
		padding: 1.2rem;
		border-radius: 14px;
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
		transition: 0.15s ease;
	}

	.tile:hover {
		border-color: var(--primary-color);
		background: var(--bg-tertiary);
		transform: translateY(-2px);
	}

	h3 {
		margin: 0;
		font-size: 1.1rem;
	}

	.tile p {
		margin-top: 0.5rem;
		font-size: 0.9rem;
	}

	/* THEORY SECTION */

	.theory {
		display: grid;
		grid-template-columns: 2fr 1fr;
		gap: 1rem;
	}

	.panel {
		padding: 1.5rem;
		border-radius: 14px;
		border: 1px solid var(--border-color);
		background: var(--bg-secondary);
	}

	.highlight {
		border-color: var(--primary-color);
		background: var(--primary-light);
		color: var(--text-primary);
	}

	@media (max-width: 800px) {
		.theory {
			grid-template-columns: 1fr;
		}
	}
</style>
