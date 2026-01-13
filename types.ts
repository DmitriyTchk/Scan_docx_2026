export interface Column {
  id: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'boolean';
}

export interface Cell {
  [columnId: string]: string | number | boolean | null;
}

export interface TableData {
  id: string;
  name: string;
  createdAt: number;
  lastModified: number;
  columns: Column[];
  rows: Cell[];
  workflowPlan?: WorkflowPlan; // Persist the pipeline
}

export type Language = 'en' | 'ru';

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  LISTENING = 'LISTENING',
  ERROR = 'ERROR',
  SUCCESS = 'SUCCESS',
}

export interface VoiceUpdateResult {
  rowUpdates: {
    rowIndex: number; // 0-based index or -1 for "new row"
    updates: { [columnId: string]: string | number };
  }[];
  action: 'update' | 'append' | 'delete' | 'unknown';
  feedback: string;
}

export interface LogEntry {
  id: string;
  time: string;
  message: string;
  type: 'info' | 'success' | 'error';
}

// --- Workflow / Pipeline Types ---

export interface WorkflowStep {
  id: string;
  instruction: string; // What the TTS should say (e.g., "Anode 983, Blooms 1")
  targetRowIndex: number;
  targetColumnId: string;
  expectedType: 'number' | 'text';
}

export interface WorkflowPlan {
  steps: WorkflowStep[];
  description: string; // Summary of the strategy (e.g. "Input side first, then Output")
}
