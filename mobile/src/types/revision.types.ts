export interface FormulaItem {
  title: string;
  formula: string;
  description?: string;
}

export interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctOptionIndex: number;
  explanation: string;
}

export interface SlotRevisionResponse {
  id: string;
  slotId: string;
  topic: string;
  summary: string;
  keyConcepts: string[];
  importantFormulas: FormulaItem[];
  quizQuestions: QuizQuestion[];
  weakAreas: string[];
  quickRevisionPoints: string[];
  score?: number;
  isCompleted: boolean;
  completedAt?: string;
  createdAt?: string;
}

export interface CompleteRevisionRequest {
  score: number;
  answers?: number[];
}