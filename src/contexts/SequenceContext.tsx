import {
  createContext,
  useContext,
  useReducer,
  type ReactNode,
  type Dispatch,
} from 'react'
import type {
  SequenceState,
  SequenceAction,
  SequenceNode,
  SingleOperation,
} from '@/types'

const initialState: SequenceState = {
  nodes: [],
  pattern: 'single',
  differences: [],
  notes: '',
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9)
}

function sequenceReducer(
  state: SequenceState,
  action: SequenceAction
): SequenceState {
  switch (action.type) {
    case 'SET_NODES':
      return { ...state, nodes: action.payload }

    case 'ADD_NODE': {
      const newNode: SequenceNode = {
        id: generateId(),
        value: action.payload,
        isAnswer: false,
        position: state.nodes.length,
      }
      return { ...state, nodes: [...state.nodes, newNode] }
    }

    case 'REMOVE_NODE':
      return {
        ...state,
        nodes: state.nodes
          .filter((n) => n.id !== action.payload)
          .map((n, i) => ({ ...n, position: i })),
      }

    case 'UPDATE_NODE':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload.id ? { ...n, value: action.payload.value } : n
        ),
      }

    case 'TOGGLE_ANSWER':
      return {
        ...state,
        nodes: state.nodes.map((n) =>
          n.id === action.payload ? { ...n, isAnswer: !n.isAnswer } : n
        ),
      }

    case 'SET_PATTERN':
      return { ...state, pattern: action.payload }

    case 'SET_DIFFERENCES':
      return { ...state, differences: action.payload }

    case 'UPDATE_DIFFERENCE':
      return {
        ...state,
        differences: state.differences.map((level, levelIdx) =>
          levelIdx === action.payload.levelIdx
            ? {
                ...level,
                values: level.values.map((val, diffIdx) =>
                  diffIdx === action.payload.diffIdx ? action.payload.value : val
                ),
              }
            : level
        ),
      }

    case 'UPDATE_DIFFERENCE_OPERATION':
      return {
        ...state,
        differences: state.differences.map((level, levelIdx) =>
          levelIdx === action.payload.levelIdx
            ? {
                ...level,
                operationType: action.payload.operationType,
                label: action.payload.label,
              }
            : level
        ),
      }

    case 'UPDATE_SINGLE_OPERATION': {
      const { levelIdx, diffIdx, operation, value, displayLabel } = action.payload
      return {
        ...state,
        differences: state.differences.map((level, lIdx) => {
          if (lIdx !== levelIdx) return level

          const newValues = [...level.values]
          newValues[diffIdx] = value

          // Inisialisasi operations dari existing atau buat baru berdasarkan operationType
          let newOperations: SingleOperation[]
          if (level.operations && level.operations.length === level.values.length) {
            newOperations = [...level.operations]
          } else {
            // Buat operations array berdasarkan operationType saat ini
            const defaultOp: SingleOperation = level.operationType === 'multiply' ? 'multiply' :
                             level.operationType === 'divide' ? 'divide' :
                             level.operationType === 'power' ? 'power' : 'add'
            newOperations = level.values.map(() => defaultOp)
          }
          newOperations[diffIdx] = operation

          // Update displayLabels
          let newDisplayLabels: (string | undefined)[] = level.displayLabels ? [...level.displayLabels] : []
          // Pastikan array cukup panjang
          while (newDisplayLabels.length < level.values.length) {
            newDisplayLabels.push(undefined)
          }
          newDisplayLabels[diffIdx] = displayLabel

          // Jika ada campuran operasi, set ke mixed
          const uniqueOps = new Set(newOperations)
          // Map subtract ke add untuk operationType (karena keduanya adalah selisih)
          const baseOp = operation === 'subtract' ? 'add' : operation
          const newOperationType = uniqueOps.size > 1 ? 'mixed' : baseOp === 'power' ? 'power' : baseOp

          return {
            ...level,
            values: newValues,
            operations: newOperations,
            operationType: newOperationType,
            displayLabels: newDisplayLabels,
          }
        }),
      }
    }

    case 'REMOVE_DIFFERENCE': {
      const { levelIdx, diffIdx } = action.payload
      return {
        ...state,
        differences: state.differences.map((level, lIdx) => {
          if (lIdx !== levelIdx) return level

          const newValues = level.values.filter((_, idx) => idx !== diffIdx)
          const newOperations = level.operations?.filter((_, idx) => idx !== diffIdx)

          return {
            ...level,
            values: newValues,
            operations: newOperations,
          }
        }),
      }
    }

    case 'SET_NOTES':
      return { ...state, notes: action.payload }

    case 'RESET':
      return initialState

    default:
      return state
  }
}

interface SequenceContextValue {
  state: SequenceState
  dispatch: Dispatch<SequenceAction>
}

const SequenceContext = createContext<SequenceContextValue | null>(null)

export function SequenceProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(sequenceReducer, initialState)

  return (
    <SequenceContext.Provider value={{ state, dispatch }}>
      {children}
    </SequenceContext.Provider>
  )
}

export function useSequenceContext(): SequenceContextValue {
  const context = useContext(SequenceContext)
  if (!context) {
    throw new Error('useSequenceContext must be used within SequenceProvider')
  }
  return context
}
