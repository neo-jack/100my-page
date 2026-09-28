import type { TechnologyKey } from '../technologyBalloons';

export type PortfolioPhase = 'idle' | 'focusing' | 'open' | 'returning';

interface NoteContent {
  id: string;
  order: number;
  title: string;
  body: string;
}

export interface EngineeringNote extends NoteContent {
  kind: 'engineering';
}

export interface PortfolioProject extends NoteContent {
  kind: 'portfolio';
  cover: string;
  balloons: TechnologyKey[];
}

export interface StandaloneNote extends NoteContent {
  kind: 'standalone';
}

export type Note = EngineeringNote | PortfolioProject | StandaloneNote;
