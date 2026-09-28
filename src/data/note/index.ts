import notes from 'virtual:notes';
import type { EngineeringNote, PortfolioProject } from './types';

export type { Note, EngineeringNote, PortfolioProject, PortfolioPhase, StandaloneNote } from './types';
export const NOTES = notes;
export const ENGINEERING_TOPICS = NOTES.filter((note): note is EngineeringNote => note.kind === 'engineering');
export const PORTFOLIO_PROJECTS = NOTES.filter((note): note is PortfolioProject => note.kind === 'portfolio');
