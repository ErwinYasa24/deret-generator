export type PatternType =
  | 'single'
  | 'tier-2'
  | 'tier-3'
  | 'alternate-2'
  | 'alternate-3'

export type Operator = '+' | '-' | '*' | '/'

export interface SequenceNode {
  id: string
  value: number
  isAnswer: boolean
  position: number
}

export type OperationType = 'add' | 'multiply' | 'divide' | 'power' | 'mixed'

export type SingleOperation = 'add' | 'subtract' | 'multiply' | 'divide' | 'power'

export interface DifferenceLevel {
  values: number[]
  color: string
  operationType: OperationType
  label?: string // untuk label khusus seperti "n²" atau "n³"
  operations?: SingleOperation[] // untuk pola campuran, operasi per langkah
  displayLabels?: (string | undefined)[] // label tampilan custom per langkah (misal "2²", "3²")
}

export interface SequenceState {
  nodes: SequenceNode[]
  pattern: PatternType
  differences: DifferenceLevel[]
  notes: string
}

export type SequenceAction =
  | { type: 'SET_NODES'; payload: SequenceNode[] }
  | { type: 'ADD_NODE'; payload: number }
  | { type: 'REMOVE_NODE'; payload: string }
  | { type: 'UPDATE_NODE'; payload: { id: string; value: number } }
  | { type: 'TOGGLE_ANSWER'; payload: string }
  | { type: 'SET_PATTERN'; payload: PatternType }
  | { type: 'SET_DIFFERENCES'; payload: DifferenceLevel[] }
  | { type: 'UPDATE_DIFFERENCE'; payload: { levelIdx: number; diffIdx: number; value: number } }
  | { type: 'UPDATE_DIFFERENCE_OPERATION'; payload: { levelIdx: number; operationType: OperationType; label?: string } }
  | { type: 'UPDATE_SINGLE_OPERATION'; payload: { levelIdx: number; diffIdx: number; operation: SingleOperation; value: number; displayLabel?: string } }
  | { type: 'REMOVE_DIFFERENCE'; payload: { levelIdx: number; diffIdx: number } }
  | { type: 'SET_NOTES'; payload: string }
  | { type: 'RESET' }

export const PATTERN_LABELS: Record<PatternType, string> = {
  single: 'Pola Tunggal',
  'tier-2': 'Bertingkat 2 Level',
  'tier-3': 'Bertingkat 3 Level',
  'alternate-2': '2 Array Berselang',
  'alternate-3': '3 Array Berselang',
}

export const OPERATOR_LABELS: Record<Operator, string> = {
  '+': 'Penjumlahan',
  '-': 'Pengurangan',
  '*': 'Perkalian',
  '/': 'Pembagian',
}

export const DIFFERENCE_COLORS = [
  '#ef4444', // red
  '#f97316', // orange
  '#eab308', // yellow
  '#22c55e', // green
  '#06b6d4', // cyan
  '#8b5cf6', // violet
]
