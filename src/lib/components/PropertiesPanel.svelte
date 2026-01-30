<script lang="ts">
	import { canvasStore } from '$lib/stores/canvas-store';
	import type { CanvasNode, CanvasEdge, LabelDataType } from '$lib/canvas-types';

	let isOpen = $state(false);
	let selectedNode: CanvasNode | null = $state(null);
	let selectedEdge: CanvasEdge | null = $state(null);
	let showExplanation = $state(false);

	const nodeExplanations: Record<string, string> = {
		entity:
			'An Entity Type represents a category of objects in your domain (e.g., Person, Car, Order). Entities have properties and can participate in relationships.',
		factType:
			'A Fact Type represents a relationship or association between entities (e.g., "Person drives Car"). Binary facts connect two entities, while n-ary facts can connect multiple entities.',
		labelType:
			'A Label Type (Value Type) represents simple values that describe entities, such as names, ages, or prices. Each label has a specific data type (string, integer, date, etc.). Note: Boolean labels are equivalent to unary fact types!',
		powerType:
			'A Power Type represents a set of subsets of another entity type (e.g., "Team" is a power type of "Person" where each team is a subset of people). Shown as a double circle.',
		sequenceType:
			'A Sequence Type represents an ordered collection of entities (e.g., "Playlist" as a sequence of "Song"). The order matters, unlike regular sets. Shown as a rectangle around a circle.',
		objectified:
			'An Objectified Fact Type treats a relationship as an entity itself, allowing it to participate in other relationships (e.g., treating "Marriage" between two people as an entity that has a date). Shown as a circle around a fact type.'
	};

	const edgeExplanations: Record<string, string> = {
		predicator:
			'A Predicator (relationship line) connects entities through a fact type, representing how objects relate to each other (e.g., "Person owns Car").',
		generalization:
			'Generalization arrow points FROM a specialized subtype TO its general supertype (e.g., Car → Vehicle, Truck → Vehicle). Multiple subtypes can point to one supertype. Shown with a dotted arrow. Direction: Subtype → Supertype.',
		specialization:
			'Specialization arrow points FROM a general supertype TO its specialized subtype (e.g., Vehicle → Car, Vehicle → Truck). One supertype can point to multiple subtypes. Shown with a solid arrow. Direction: Supertype → Subtype.'
	};

	$effect(() => {
		if ($canvasStore.selectedNodes.size === 1) {
			const nodeId = Array.from($canvasStore.selectedNodes)[0];
			selectedNode = $canvasStore.nodes.get(nodeId) || null;
			selectedEdge = null;
			isOpen = true;
		} else if ($canvasStore.selectedEdges.size === 1) {
			const edgeId = Array.from($canvasStore.selectedEdges)[0];
			selectedEdge = $canvasStore.edges.get(edgeId) || null;
			selectedNode = null;
			isOpen = true;
		} else {
			selectedNode = null;
			selectedEdge = null;
			isOpen = false;
		}
	});

	function updateNodeLabel(e: Event) {
		if (selectedNode) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateNode(selectedNode.id, { label: target.value });
		}
	}

	function updateNodeColor(e: Event) {
		if (selectedNode) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateNode(selectedNode.id, { color: target.value });
		}
	}

	function updateLabelDataType(e: Event) {
		if (selectedNode && selectedNode.type === 'labelType') {
			const target = e.target as HTMLSelectElement;
			canvasStore.updateNode(selectedNode.id, { dataType: target.value as LabelDataType });
		}
	}

	function updateNodeArity(e: Event) {
		if (selectedNode && selectedNode.type === 'factType') {
			const node = selectedNode; // Create local const to satisfy TypeScript
			const target = e.target as HTMLInputElement;
			const newArity = parseInt(target.value);
			const oldSquares = node.squares || [];

			// Preserve existing square IDs where possible
			const squareSize = 40;
			const spacing = 0;
			const squares = Array.from({ length: newArity }, (_, i) => ({
				id: oldSquares[i]?.id || crypto.randomUUID(), // Preserve old IDs
				position: {
					x: node.position.x + i * (squareSize + spacing),
					y: node.position.y
				}
			}));

			// Update connected edges if we removed squares
			if (newArity < oldSquares.length) {
				const removedSquareIds = new Set(oldSquares.slice(newArity).map((s) => s.id));
				canvasStore.updateEdgesAfterArityChange(
					node.id,
					removedSquareIds,
					squares[squares.length - 1].id
				);
			}

			canvasStore.updateNode(node.id, { arity: newArity, squares });
		}
	}

	function updateEdgeLabel(e: Event) {
		if (selectedEdge) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateEdge(selectedEdge.id, { label: target.value });
		}
	}

	function updateEdgeColor(e: Event) {
		if (selectedEdge) {
			const target = e.target as HTMLInputElement;
			canvasStore.updateEdge(selectedEdge.id, { color: target.value });
		}
	}

	function closePanel() {
		isOpen = false;
		canvasStore.clearSelection();
	}

	function deleteSelected() {
		canvasStore.deleteSelected();
		isOpen = false;
	}
</script>

{#if isOpen && (selectedNode || selectedEdge)}
	<div class="properties-panel">
		<div class="panel-header">
			<h3>Properties</h3>
			<button class="close-btn" onclick={closePanel} title="Close (Esc)">
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M12 4L4 12M4 4l8 8"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
					/>
				</svg>
			</button>
		</div>

		{#if selectedNode}
			<div class="property-group">
				<div class="header-with-toggle">
					<h4>Node: {selectedNode.type}</h4>
					<button
						class="explanation-toggle"
						onclick={() => (showExplanation = !showExplanation)}
						title="{showExplanation ? 'Hide' : 'Show'} explanation"
					>
						<i class="fas fa-question-circle"></i>
					</button>
				</div>

				{#if showExplanation}
					<div class="explanation">
						<p>
							{nodeExplanations[selectedNode.type] ||
								'A structural element in your information model.'}
						</p>
					</div>
				{/if}

				<div class="property">
					<label for="node-label">Label</label>
					<input id="node-label" type="text" value={selectedNode.label} oninput={updateNodeLabel} />
				</div>

				<div class="property">
					<label for="node-color">Color</label>
					<input
						id="node-color"
						type="color"
						value={selectedNode.color}
						oninput={updateNodeColor}
					/>
				</div>

				{#if selectedNode.type === 'labelType'}
					<div class="property">
						<label for="label-data-type">Data Type</label>
						<select
							id="label-data-type"
							value={selectedNode.dataType || 'string'}
							onchange={updateLabelDataType}
						>
							<option value="string">String (VARCHAR)</option>
							<option value="integer">Integer (INT)</option>
							<option value="float">Float</option>
							<option value="double">Double</option>
							<option value="decimal">Decimal (NUMERIC)</option>
							<option value="boolean">Boolean (equivalent to unary fact)</option>
							<option value="date">Date</option>
							<option value="timestamp">Timestamp</option>
							<option value="char">Char</option>
							<option value="text">Text (unlimited)</option>
						</select>
					</div>
				{/if}

				{#if selectedNode.type === 'factType'}
					<div class="property">
						<label for="node-arity">Arity (n-ary)</label>
						<input
							id="node-arity"
							type="number"
							min="1"
							max="10"
							value={selectedNode.arity || 2}
							oninput={updateNodeArity}
						/>
					</div>
				{/if}

				<div class="property">
					<h4>Position</h4>
					<div class="coords">
						<span>X: {Math.round(selectedNode.position.x)}</span>
						<span>Y: {Math.round(selectedNode.position.y)}</span>
					</div>
				</div>
			</div>
		{:else if selectedEdge}
			<div class="property-group">
				<div class="header-with-toggle">
					<h4>Edge: {selectedEdge.type}</h4>
					<button
						class="explanation-toggle"
						onclick={() => (showExplanation = !showExplanation)}
						title="{showExplanation ? 'Hide' : 'Show'} explanation"
					>
						<i class="fas fa-question-circle"></i>
					</button>
				</div>

				{#if showExplanation}
					<div class="explanation">
						<p>
							{edgeExplanations[selectedEdge.type] ||
								'A connection between elements in your model.'}
						</p>
					</div>
				{/if}

				<div class="property">
					<label for="edge-label">Label</label>
					<input
						id="edge-label"
						type="text"
						value={selectedEdge.label}
						oninput={updateEdgeLabel}
						placeholder="Predicate name"
					/>
				</div>

				<div class="property">
					<label for="edge-color">Color</label>
					<input
						id="edge-color"
						type="color"
						value={selectedEdge.color}
						oninput={updateEdgeColor}
					/>
				</div>

				<div class="property">
					<h4>Connection</h4>
					<div class="connection-editor">
						<div class="connection-row">
							<label for="edge-source">Source:</label>
							<select
								id="edge-source"
								value={selectedEdge.sourceNodeId}
								onchange={(e) => {
									if (!selectedEdge) return;
									const newSource = (e.target as HTMLSelectElement).value;
									const sourceNode = $canvasStore.nodes.get(newSource);
									const squareId = sourceNode?.squares?.[0]?.id;
									canvasStore.reconnectEdge(selectedEdge.id, 'source', newSource, squareId);
								}}
							>
								{#each Array.from($canvasStore.nodes.values()) as node}
									<option value={node.id}>{node.label}</option>
								{/each}
							</select>
						</div>

						{#if $canvasStore.nodes.get(selectedEdge.sourceNodeId)?.squares}
							<div class="connection-row">
								<label for="edge-source-square">Square:</label>
								<select
									id="edge-source-square"
									value={selectedEdge.sourceSquareId || ''}
									onchange={(e) => {
										if (!selectedEdge) return;
										const squareId = (e.target as HTMLSelectElement).value;
										canvasStore.reconnectEdge(
											selectedEdge.id,
											'source',
											selectedEdge.sourceNodeId,
											squareId
										);
									}}
								>
									{#each $canvasStore.nodes.get(selectedEdge.sourceNodeId)?.squares || [] as square, idx}
										<option value={square.id}>Square {idx + 1}</option>
									{/each}
								</select>
							</div>
						{/if}

						<div class="connection-row">
							<label for="edge-target">Target:</label>
							<select
								id="edge-target"
								value={selectedEdge.targetNodeId}
								onchange={(e) => {
									if (!selectedEdge) return;
									const newTarget = (e.target as HTMLSelectElement).value;
									const targetNode = $canvasStore.nodes.get(newTarget);
									const squareId = targetNode?.squares?.[0]?.id;
									canvasStore.reconnectEdge(selectedEdge.id, 'target', newTarget, squareId);
								}}
							>
								{#each Array.from($canvasStore.nodes.values()) as node}
									<option value={node.id}>{node.label}</option>
								{/each}
							</select>
						</div>

						{#if $canvasStore.nodes.get(selectedEdge.targetNodeId)?.squares}
							<div class="connection-row">
								<label for="edge-target-square">Square:</label>
								<select
									id="edge-target-square"
									value={selectedEdge.targetSquareId || ''}
									onchange={(e) => {
										if (!selectedEdge) return;
										const squareId = (e.target as HTMLSelectElement).value;
										canvasStore.reconnectEdge(
											selectedEdge.id,
											'target',
											selectedEdge.targetNodeId,
											squareId
										);
									}}
								>
									{#each $canvasStore.nodes.get(selectedEdge.targetNodeId)?.squares || [] as square, idx}
										<option value={square.id}>Square {idx + 1}</option>
									{/each}
								</select>
							</div>
						{/if}
					</div>
				</div>
			</div>
		{/if}

		<div class="panel-actions">
			<button class="delete-btn" onclick={deleteSelected}>
				<svg width="16" height="16" viewBox="0 0 16 16" fill="none">
					<path
						d="M3 4h10M6 4V3a1 1 0 011-1h2a1 1 0 011 1v1m2 0v9a2 2 0 01-2 2H6a2 2 0 01-2-2V4h8z"
						stroke="currentColor"
						stroke-width="1.5"
						stroke-linecap="round"
					/>
				</svg>
				Delete
			</button>
		</div>
	</div>
{/if}

<style>
	.properties-panel {
		position: absolute;
		top: 0;
		right: 0;
		width: 320px;
		height: 100%;
		background: var(--bg-secondary);
		border-left: 1px solid var(--border-color);
		box-shadow: -2px 0 8px rgba(0, 0, 0, 0.1);
		padding: 1rem 1.5rem 1.5rem;
		overflow-y: auto;
		z-index: 10;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.close-btn {
		background: none;
		border: none;
		color: var(--text-secondary);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s;
	}

	.close-btn:hover {
		background: var(--bg-primary);
		color: var(--text-primary);
	}

	h3 {
		margin: 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--text-primary);
	}

	.panel-actions {
		margin-top: auto;
		padding-top: 1rem;
		border-top: 1px solid var(--border-color);
	}

	.delete-btn {
		width: 100%;
		padding: 0.625rem 1rem;
		background: #dc2626;
		color: white;
		border: none;
		border-radius: 0.375rem;
		cursor: pointer;
		font-size: 0.875rem;
		font-weight: 500;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		transition: background 0.2s;
	}

	.delete-btn:hover {
		background: #b91c1c;
	}

	h4 {
		margin: 0 0 1rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--text-secondary);
	}

	.property-group {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.property {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	label {
		font-size: 0.75rem;
		font-weight: 600;
		color: var(--text-secondary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
	}

	input[type='text'],
	input[type='number'] {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 0.25rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.875rem;
		transition: border-color 0.2s;
	}

	input[type='text']:focus,
	input[type='number']:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	input[type='color'] {
		height: 2.5rem;
		border: 1px solid var(--border-color);
		border-radius: 0.25rem;
		cursor: pointer;
		background: var(--bg-primary);
	}

	.coords {
		display: flex;
		gap: 1rem;
		font-size: 0.75rem;
		color: var(--text-secondary);
	}

	.connection-editor {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.connection-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.connection-row label {
		font-size: 0.75rem;
		font-weight: 500;
		color: var(--text-secondary);
	}

	.connection-row select {
		padding: 0.5rem;
		border: 1px solid var(--border);
		border-radius: 4px;
		background: var(--bg-secondary);
		color: var(--text);
		font-size: 0.875rem;
	}

	.connection-row select:focus {
		outline: none;
		border-color: var(--accent);
	}

	select {
		padding: 0.5rem;
		border: 1px solid var(--border-color);
		border-radius: 0.25rem;
		background: var(--bg-primary);
		color: var(--text-primary);
		font-size: 0.875rem;
		cursor: pointer;
		transition: border-color 0.2s;
	}

	select:focus {
		outline: none;
		border-color: var(--primary-color);
	}

	.header-with-toggle {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 0.5rem;
	}

	.explanation-toggle {
		background: none;
		border: none;
		color: var(--accent-primary);
		cursor: pointer;
		padding: 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		border-radius: 0.25rem;
		transition: all 0.2s;
		font-size: 1rem;
	}

	.explanation-toggle:hover {
		background: var(--bg-primary);
		color: var(--accent-primary);
		transform: scale(1.1);
	}

	.explanation {
		background: var(--bg-primary);
		border-left: 3px solid var(--accent-primary);
		padding: 0.75rem;
		border-radius: 0.25rem;
		margin-bottom: 1rem;
	}

	.explanation p {
		margin: 0;
		font-size: 0.8125rem;
		line-height: 1.5;
		color: var(--text-secondary);
	}
</style>
