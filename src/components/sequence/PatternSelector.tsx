import { Select } from '@/components/ui'
import { useSequenceContext } from '@/contexts/SequenceContext'
import { PATTERN_LABELS, DIFFERENCE_COLORS, type PatternType, type SingleOperation } from '@/types'

const STEP_OPERATIONS: { value: SingleOperation; label: string }[] = [
  { value: 'add', label: '+' },
  { value: 'subtract', label: '−' },
  { value: 'multiply', label: '×' },
  { value: 'divide', label: ':' },
  { value: 'power', label: '^' },
]

// Konversi angka ke superscript unicode
function toSuperscript(num: number | string): string {
  const superscripts: Record<string, string> = {
    '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
    '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
    '-': '⁻', '.': '·'
  }
  return String(num).split('').map(c => superscripts[c] || c).join('')
}

// Parse input dan generate displayLabel untuk pangkat
function parseValueInput(input: string): { value: number; displayLabel?: string } {
  const trimmed = input.trim()

  // Jika ada notasi pangkat (a^b), buat displayLabel
  if (trimmed.includes('^')) {
    const parts = trimmed.split('^')
    if (parts.length === 2) {
      const base = parts[0].trim()
      const exp = parseFloat(parts[1])
      if (!isNaN(exp)) {
        // Buat label tampilan seperti "2²" atau "x²"
        const displayLabel = `${base}${toSuperscript(exp)}`
        return { value: exp, displayLabel }
      }
    }
  }

  return { value: parseFloat(trimmed) || 0 }
}

export function PatternSelector() {
  const { state, dispatch } = useSequenceContext()

  const patternOptions = Object.entries(PATTERN_LABELS).map(([value, label]) => ({
    value,
    label,
  }))

  const handleSingleOperationChange = (
    levelIdx: number,
    diffIdx: number,
    operation: SingleOperation,
    currentValue: number
  ) => {
    dispatch({
      type: 'UPDATE_SINGLE_OPERATION',
      payload: { levelIdx, diffIdx, operation, value: currentValue },
    })
  }

  const handleValueChange = (
    levelIdx: number,
    diffIdx: number,
    value: number,
    currentOperation: SingleOperation,
    displayLabel?: string
  ) => {
    dispatch({
      type: 'UPDATE_SINGLE_OPERATION',
      payload: { levelIdx, diffIdx, operation: currentOperation, value, displayLabel },
    })
  }

  const handleRemoveDifference = (levelIdx: number, diffIdx: number) => {
    dispatch({
      type: 'REMOVE_DIFFERENCE',
      payload: { levelIdx, diffIdx },
    })
  }

  const getOperationForStep = (
    level: typeof state.differences[0],
    diffIdx: number
  ): SingleOperation => {
    // Jika ada array operations dan ada nilai untuk index ini, gunakan itu
    if (level.operations && level.operations.length > diffIdx && level.operations[diffIdx]) {
      return level.operations[diffIdx]
    }
    // Fallback berdasarkan operationType
    if (level.operationType === 'multiply') return 'multiply'
    if (level.operationType === 'divide') return 'divide'
    if (level.operationType === 'power') return 'power'
    if (level.operationType === 'mixed') return 'add' // default untuk mixed tanpa operations
    return 'add'
  }

  return (
    <div className="space-y-4">
      <Select
        label="Jenis Pola"
        options={patternOptions}
        value={state.pattern}
        onChange={(e) =>
          dispatch({ type: 'SET_PATTERN', payload: e.target.value as PatternType })
        }
      />

      {/* Per-step Operation Edit */}
      {state.differences.length > 0 && (
        <div className="pt-4 border-t border-gray-200 space-y-4">
          {state.differences.map((level, levelIdx) => (
            <div key={levelIdx}>
              <h4
                className="text-sm font-medium mb-2"
                style={{ color: DIFFERENCE_COLORS[levelIdx % DIFFERENCE_COLORS.length] }}
              >
                {state.pattern.startsWith('alternate')
                  ? `Beda Larik ${levelIdx + 1}`
                  : `Beda Level ${levelIdx + 1}`}
              </h4>
              <div className="flex flex-wrap gap-2">
                {level.values.map((value, diffIdx) => {
                  const operation = getOperationForStep(level, diffIdx)
                  return (
                    <div
                      key={diffIdx}
                      className="flex items-center gap-1 px-2 py-1.5 bg-white border border-gray-200 rounded-lg"
                    >
                      <select
                        value={operation}
                        onChange={(e) =>
                          handleSingleOperationChange(
                            levelIdx,
                            diffIdx,
                            e.target.value as SingleOperation,
                            value
                          )
                        }
                        className="w-10 text-center text-sm border-none bg-transparent focus:outline-none cursor-pointer"
                      >
                        {STEP_OPERATIONS.map((op) => (
                          <option key={op.value} value={op.value}>
                            {op.label}
                          </option>
                        ))}
                      </select>
                      <input
                        type="text"
                        defaultValue={level.displayLabels?.[diffIdx] || value}
                        onBlur={(e) => {
                          const parsed = parseValueInput(e.target.value)
                          handleValueChange(
                            levelIdx,
                            diffIdx,
                            parsed.value,
                            operation,
                            parsed.displayLabel
                          )
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.currentTarget.blur()
                          }
                        }}
                        placeholder="2^2"
                        className="w-14 text-center text-sm border-none bg-transparent focus:outline-none"
                        title="Ketik 2^2 untuk tampilan 2²"
                      />
                    </div>
                  )
                })}
                {level.values.length > 0 && (
                  <button
                    onClick={() => handleRemoveDifference(levelIdx, level.values.length - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
                    title="Hapus langkah terakhir"
                  >
                    ×
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
