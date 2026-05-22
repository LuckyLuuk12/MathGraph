import type { InformationStructure } from '$lib/theory/information-structure';

export type Tool = 'default' | 'theory' | 'modeler' | 'export' | 'dsl-editor' | undefined;

export interface SpecificTreeRepresentation {
  id: string;
  name: string;
  desc?: string;
  tree: TreeRepresentation;
}

export interface Project {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  // Every project has 1 single information structure, which is the core data model for the theory and modeler tools.
  informationStructure: InformationStructure;
  // Multiple tree representations can exist for the same information structure, so we store a list:
  treeRepresentations: SpecificTreeRepresentation[];
  // We will later add some property for user-defined DSL-like theory extensions, which can be used in the theory and modeler tools.
}