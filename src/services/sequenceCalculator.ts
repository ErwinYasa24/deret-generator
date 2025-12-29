import type {
  SequenceNode,
  PatternType,
  DifferenceLevel,
  OperationType,
  SingleOperation,
} from '@/types'
import { DIFFERENCE_COLORS } from '@/types'

interface DetectionResult {
  type: OperationType
  values: number[]
  label?: string // untuk label khusus seperti "n²"
  operations?: SingleOperation[] // untuk pola campuran
}

// Deteksi jenis operasi dan hitung nilai-nilainya
function detectOperation(values: number[], checkPower: boolean = true): DetectionResult {
  if (values.length < 2) {
    return { type: 'add', values: [] }
  }

  // Cek pola pangkat terlebih dahulu (hanya untuk level pertama)
  if (checkPower) {
    const powerResult = detectPowerPattern(values)
    if (powerResult) {
      return powerResult
    }
  }

  // Hitung semua kemungkinan
  const diffs: number[] = []
  const ratios: number[] = []

  for (let i = 1; i < values.length; i++) {
    diffs.push(values[i] - values[i - 1])
    if (values[i - 1] !== 0) {
      ratios.push(values[i] / values[i - 1])
    }
  }

  // Cek pola perkalian (rasio >= 1 dan integer atau konsisten)
  if (ratios.length >= 1) {
    const allRatiosValid = ratios.every(r => Number.isInteger(r) && r >= 1)
    const ratiosConsistent = ratios.every(r => r === ratios[0])
    const ratiosFormPattern = checkIfFormPattern(ratios)

    // Jika semua rasio = 1, itu bukan pola perkalian yang bermakna, gunakan selisih
    const allOnes = ratios.every(r => r === 1)

    if (allRatiosValid && !allOnes && (ratiosConsistent || ratiosFormPattern)) {
      return { type: 'multiply', values: ratios }
    }
  }

  // Cek pola pembagian (rasio < 1, atau rasio adalah pecahan sederhana)
  if (ratios.length >= 1) {
    // Cek pembagian dengan melihat rasio terbalik (nilai sebelum / nilai sesudah)
    const inverseRatios: number[] = []
    for (let i = 1; i < values.length; i++) {
      if (values[i] !== 0) {
        inverseRatios.push(values[i - 1] / values[i])
      }
    }

    const allInverseValid = inverseRatios.every(r => Number.isInteger(r) && r > 1)
    const inverseConsistent = inverseRatios.every(r => r === inverseRatios[0])
    const inverseFormPattern = checkIfFormPattern(inverseRatios)

    if (allInverseValid && (inverseConsistent || inverseFormPattern)) {
      return { type: 'divide', values: inverseRatios }
    }
  }

  // Cek pola campuran (mixed) - kombinasi tambah dan kali
  const mixedResult = detectMixedPattern(values)
  if (mixedResult) {
    return mixedResult
  }

  // Default: selisih (penjumlahan/pengurangan)
  return { type: 'add', values: diffs }
}

// Deteksi pola campuran (kombinasi +/- dan ×/÷)
function detectMixedPattern(values: number[]): DetectionResult | null {
  if (values.length < 3) return null

  const operations: SingleOperation[] = []
  const opValues: number[] = []

  for (let i = 1; i < values.length; i++) {
    const prev = values[i - 1]
    const curr = values[i]

    if (prev === 0) {
      // Jika nilai sebelumnya 0, hanya bisa tambah
      operations.push('add')
      opValues.push(curr - prev)
      continue
    }

    const diff = curr - prev
    const ratio = curr / prev
    const invRatio = prev / curr

    // Prioritaskan operasi yang menghasilkan bilangan bulat kecil
    // Cek perkalian dulu jika rasio adalah integer >= 2
    if (Number.isInteger(ratio) && ratio >= 2) {
      operations.push('multiply')
      opValues.push(ratio)
    }
    // Cek pembagian jika rasio terbalik adalah integer >= 2
    else if (curr !== 0 && Number.isInteger(invRatio) && invRatio >= 2) {
      operations.push('divide')
      opValues.push(invRatio)
    }
    // Default: penjumlahan/pengurangan
    else {
      operations.push('add')
      opValues.push(diff)
    }
  }

  // Cek apakah ada campuran operasi yang berbeda
  const uniqueOps = new Set(operations)
  if (uniqueOps.size > 1) {
    // Validasi: pola campuran harus membentuk pola yang bermakna
    if (isMixedPatternValid(operations, opValues)) {
      return {
        type: 'mixed',
        values: opValues,
        operations,
      }
    }
  }

  return null
}

// Validasi apakah pola campuran membentuk pola yang bermakna
function isMixedPatternValid(
  operations: SingleOperation[],
  values: number[]
): boolean {
  if (operations.length < 2) return false

  // Validasi pola campuran

  // Cek pola berulang dengan berbagai panjang periode (2, 3, 4)
  for (let period = 2; period <= Math.min(4, Math.floor(operations.length / 2)); period++) {
    if (isRepeatingPattern(operations, values, period)) {
      return true
    }
  }

  // Cek apakah nilai-nilai membentuk pola aritmatika (misal +1, +2, +3, +4)
  // dengan operasi yang sama
  const firstOp = operations[0]
  if (operations.every(op => op === firstOp)) {
    // Semua operasi sama, cek apakah nilai membentuk pola
    if (checkIfFormPattern(values)) {
      return true
    }
  }

  // Cek apakah kombinasi (operasi, nilai) membentuk pola aritmatika
  // Misal: (+5, ×2, +5, ×2) atau nilai yang berbeda tapi teratur
  // Jika operasi berselang-seling dengan pola yang jelas, terima
  if (operations.length >= 4) {
    // Cek pola berselang 2: op1, op2, op1, op2...
    const op1 = operations[0]
    const op2 = operations[1]
    const isAlternating = operations.every((op, i) => op === (i % 2 === 0 ? op1 : op2))
    if (isAlternating && op1 !== op2) {
      // Cek apakah nilai untuk masing-masing operasi konsisten atau berpola
      const vals1 = values.filter((_, i) => i % 2 === 0)
      const vals2 = values.filter((_, i) => i % 2 === 1)
      if (checkIfFormPattern(vals1) && checkIfFormPattern(vals2)) {
        return true
      }
    }
  }

  // Jika tidak ada pola yang bermakna, tolak mixed pattern
  // Sistem akan fallback ke pola 'add' standar, user bisa edit manual
  return false
}

// Cek apakah operasi dan nilai membentuk pola berulang dengan periode tertentu
function isRepeatingPattern(
  operations: SingleOperation[],
  values: number[],
  period: number
): boolean {
  if (operations.length < period * 2) return false

  // Ambil pola dasar
  const baseOps = operations.slice(0, period)
  const baseVals = values.slice(0, period)

  // Cek apakah pola berulang
  for (let i = period; i < operations.length; i++) {
    const expectedOp = baseOps[i % period]
    const expectedVal = baseVals[i % period]

    if (operations[i] !== expectedOp || values[i] !== expectedVal) {
      return false
    }
  }

  return true
}

// Cek apakah array membentuk pola (aritmatika atau konstan)
function checkIfFormPattern(arr: number[]): boolean {
  if (arr.length < 2) return true

  // Cek konstan
  if (arr.every(v => v === arr[0])) return true

  // Cek aritmatika (selisih konstan)
  const diffs: number[] = []
  for (let i = 1; i < arr.length; i++) {
    diffs.push(arr[i] - arr[i - 1])
  }
  if (diffs.every(d => d === diffs[0])) return true

  return false
}

// Deteksi pola pangkat (n², n³, dll)
function detectPowerPattern(values: number[]): DetectionResult | null {
  if (values.length < 2) return null

  // Cek pola n² (1, 4, 9, 16, 25, ...)
  const squareCheck = values.every((val, idx) => {
    const n = idx + 1
    return val === n * n
  })
  if (squareCheck) {
    return {
      type: 'power',
      values: values.map((_, idx) => idx + 1),
      label: 'n²',
    }
  }

  // Cek pola n³ (1, 8, 27, 64, 125, ...)
  const cubeCheck = values.every((val, idx) => {
    const n = idx + 1
    return val === n * n * n
  })
  if (cubeCheck) {
    return {
      type: 'power',
      values: values.map((_, idx) => idx + 1),
      label: 'n³',
    }
  }

  // Cek pola 2^n (2, 4, 8, 16, 32, ...)
  if (values[0] === 2) {
    const powerOf2Check = values.every((val, idx) => val === Math.pow(2, idx + 1))
    if (powerOf2Check) {
      return {
        type: 'power',
        values: values.map((_, idx) => idx + 1),
        label: '2ⁿ',
      }
    }
  }

  // Cek pola 3^n (3, 9, 27, 81, ...)
  if (values[0] === 3) {
    const powerOf3Check = values.every((val, idx) => val === Math.pow(3, idx + 1))
    if (powerOf3Check) {
      return {
        type: 'power',
        values: values.map((_, idx) => idx + 1),
        label: '3ⁿ',
      }
    }
  }

  return null
}

export function calculateDifferences(
  nodes: SequenceNode[],
  pattern: PatternType
): DifferenceLevel[] {
  if (nodes.length < 2) return []

  const values = nodes.map((n) => n.value)

  switch (pattern) {
    case 'single':
      return calculateSinglePattern(values)
    case 'tier-2':
      return calculateTieredPattern(values, 2)
    case 'tier-3':
      return calculateTieredPattern(values, 3)
    case 'alternate-2':
      return calculateAlternatePattern(values, 2)
    case 'alternate-3':
      return calculateAlternatePattern(values, 3)
    default:
      return []
  }
}

function calculateSinglePattern(values: number[]): DifferenceLevel[] {
  const detection = detectOperation(values)

  return [{
    values: detection.values,
    color: DIFFERENCE_COLORS[0],
    operationType: detection.type,
    label: detection.label,
    operations: detection.operations,
  }]
}

function calculateTieredPattern(
  values: number[],
  levels: number
): DifferenceLevel[] {
  const result: DifferenceLevel[] = []
  let currentLevel = values

  for (let level = 0; level < levels; level++) {
    if (currentLevel.length < 2) break

    // Hanya cek power pattern untuk level pertama
    const detection = detectOperation(currentLevel, level === 0)

    result.push({
      values: detection.values,
      color: DIFFERENCE_COLORS[level % DIFFERENCE_COLORS.length],
      operationType: detection.type,
      label: detection.label,
      operations: detection.operations,
    })

    currentLevel = detection.values
  }

  return result
}

function calculateAlternatePattern(
  values: number[],
  arrayCount: number
): DifferenceLevel[] {
  const arrays: number[][] = Array.from({ length: arrayCount }, () => [])

  values.forEach((val, idx) => {
    arrays[idx % arrayCount].push(val)
  })

  const result: DifferenceLevel[] = []

  arrays.forEach((arr, arrayIdx) => {
    if (arr.length < 2) return

    // Auto-detect untuk setiap sub-array
    const detection = detectOperation(arr)

    result.push({
      values: detection.values,
      color: DIFFERENCE_COLORS[arrayIdx % DIFFERENCE_COLORS.length],
      operationType: detection.type,
      label: detection.label,
      operations: detection.operations,
    })
  })

  return result
}

export function parseSequenceFromText(text: string): number[] {
  const numbers = text.match(/-?\d+(\.\d+)?/g)
  if (!numbers) return []
  return numbers.map((n) => parseFloat(n))
}
