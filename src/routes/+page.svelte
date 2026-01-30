<script lang="ts">
	import { goto } from '$app/navigation';
</script>

<div class="landing">
	<div class="hero">
		<h1>🔷 MathGraph</h1>
		<p class="tagline">Visual Information Systems Modeler</p>
		<p class="description">
			Build mathematically rigorous database schemas using formal Information Systems theory. Create
			entities, fact types, constraints, and export to SQL.
		</p>

		<button class="cta" on:click={() => goto('/projects')}> Get Started </button>
	</div>

	<div class="features">
		<div class="feature">
			<div class="icon">📊</div>
			<h3>Visual Modeling</h3>
			<p>Drag-and-drop canvas for creating entity-relationship diagrams</p>
		</div>

		<div class="feature">
			<div class="icon">🔒</div>
			<h3>Constraint System</h3>
			<p>Uniqueness, mandatory, frequency, and custom constraints</p>
		</div>

		<div class="feature">
			<div class="icon">🗄️</div>
			<h3>SQL Export</h3>
			<p>Generate production-ready schemas for PostgreSQL, MySQL, and more</p>
		</div>

		<div class="feature">
			<div class="icon">🧮</div>
			<h3>Formal Theory</h3>
			<p>Based on university-level Information Systems mathematics</p>
		</div>
	</div>

	<div class="quick-links">
		<a href="/projects" class="link-button">View Projects</a>
		<a href="/modeler" class="link-button secondary">Try Modeler</a>
		<a href="/theory" class="link-button secondary">Theory & Logic</a>
	</div>
</div>

<style>
	.landing {
		min-height: 100vh;
		background: linear-gradient(135deg, var(--bg-primary) 0%, var(--bg-secondary) 100%);
		padding: 2rem;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
	}

	.hero {
		text-align: center;
		max-width: 700px;
		margin-bottom: 4rem;
	}

	.hero h1 {
		font-size: 4rem;
		margin-bottom: 1rem;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		-webkit-background-clip: text;
		-webkit-text-fill-color: transparent;
		background-clip: text;
	}

	.tagline {
		font-size: 1.5rem;
		color: var(--text-secondary);
		margin-bottom: 1.5rem;
	}

	.description {
		font-size: 1.1rem;
		line-height: 1.6;
		color: var(--text-primary);
		margin-bottom: 2.5rem;
	}

	.cta {
		padding: 1rem 3rem;
		font-size: 1.25rem;
		font-weight: 600;
		background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
		color: white;
		border: none;
		border-radius: 8px;
		cursor: pointer;
		transition:
			transform 0.2s,
			box-shadow 0.2s;
		box-shadow: 0 4px 12px rgba(102, 126, 234, 0.4);
	}

	.cta:hover {
		transform: translateY(-2px);
		box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
	}

	.cta:active {
		transform: translateY(0);
	}

	.features {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
		gap: 2rem;
		max-width: 1200px;
		width: 100%;
		margin-bottom: 3rem;
	}

	.feature {
		background: var(--bg-secondary);
		padding: 2rem;
		border-radius: 12px;
		text-align: center;
		border: 1px solid var(--border-color);
		transition:
			transform 0.2s,
			box-shadow 0.2s;
	}

	.feature:hover {
		transform: translateY(-4px);
		box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
	}

	.icon {
		font-size: 3rem;
		margin-bottom: 1rem;
	}

	.feature h3 {
		margin-bottom: 0.5rem;
		color: var(--text-primary);
	}

	.feature p {
		color: var(--text-secondary);
		font-size: 0.95rem;
		line-height: 1.5;
	}

	.quick-links {
		display: flex;
		gap: 1rem;
		flex-wrap: wrap;
		justify-content: center;
	}

	.link-button {
		padding: 0.75rem 2rem;
		font-size: 1rem;
		font-weight: 500;
		background: var(--accent-primary);
		color: white;
		text-decoration: none;
		border-radius: 6px;
		transition: all 0.2s;
		border: 2px solid var(--accent-primary);
	}

	.link-button:hover {
		background: var(--accent-hover);
		border-color: var(--accent-hover);
	}

	.link-button.secondary {
		background: transparent;
		color: var(--accent-primary);
	}

	.link-button.secondary:hover {
		background: var(--accent-primary);
		color: white;
	}

	@media (max-width: 768px) {
		.hero h1 {
			font-size: 2.5rem;
		}

		.tagline {
			font-size: 1.2rem;
		}

		.features {
			grid-template-columns: 1fr;
		}
	}
</style>
