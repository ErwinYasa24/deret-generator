import { useEffect, useRef, useState, useCallback } from 'react'
import { useSequenceContext } from '@/contexts/SequenceContext'
import { calculateDifferences } from '@/services/sequenceCalculator'

const NODE_RADIUS = 24
const NODE_SPACING = 80
const LEVEL_HEIGHT = 60
const PADDING = 40
const DIFFERENCE_BASE_OFFSET = 8
const TIER_LABEL_OFFSET = -6
const LABEL_X_OFFSET = 1
const ALT_LABEL_Y_OFFSET = -6
const ALT_FIRST_LARIK_EXTRA_Y = 6

export function SequenceGraph() {
  const { state, dispatch } = useSequenceContext()
  const svgRef = useRef<SVGSVGElement>(null)

  // State untuk posisi label yang sudah di-drag
  const [labelOffsets, setLabelOffsets] = useState<Record<string, { dx: number; dy: number }>>({})
  // State untuk drag aktif
  const [dragging, setDragging] = useState<{ levelIdx: number; diffIdx: number } | null>(null)
  const [dragStart, setDragStart] = useState<{ x: number; y: number } | null>(null)

  useEffect(() => {
    if (state.nodes.length >= 2) {
      const differences = calculateDifferences(state.nodes, state.pattern)
      dispatch({ type: 'SET_DIFFERENCES', payload: differences })
    } else {
      dispatch({ type: 'SET_DIFFERENCES', payload: [] })
    }
  }, [state.nodes, state.pattern, dispatch])

  // Reset label offsets ketika pattern atau nodes berubah
  useEffect(() => {
    setLabelOffsets({})
  }, [state.pattern, state.nodes.length])

  // Konversi angka ke superscript unicode
  const toSuperscript = (num: number): string => {
    const superscripts: Record<string, string> = {
      '0': '⁰', '1': '¹', '2': '²', '3': '³', '4': '⁴',
      '5': '⁵', '6': '⁶', '7': '⁷', '8': '⁸', '9': '⁹',
      '-': '⁻', '.': '·'
    }
    return String(num).split('').map(c => superscripts[c] || c).join('')
  }

  const formatDiff = (
    diff: number,
    operationType: 'add' | 'multiply' | 'divide' | 'power' | 'mixed',
    label?: string,
    operation?: 'add' | 'subtract' | 'multiply' | 'divide' | 'power',
    displayLabel?: string
  ) => {
    // Jika ada label khusus (seperti n², n³), gunakan itu
    if (label) {
      return label
    }

    // Untuk pola campuran, gunakan operasi per langkah
    const op = operation || operationType

    // Tentukan nilai yang akan ditampilkan
    const valueDisplay = displayLabel || String(diff)

    switch (op) {
      case 'multiply':
        return `×${valueDisplay}`
      case 'divide':
        return `:${valueDisplay}`
      case 'power':
        // Jika sudah ada displayLabel dengan superscript, gunakan langsung
        if (displayLabel) {
          return displayLabel
        }
        return `x${toSuperscript(diff)}`
      case 'subtract':
        return `−${valueDisplay}`
      default:
        // Untuk add, cek apakah positif atau negatif
        if (displayLabel) {
          return diff >= 0 ? `+${valueDisplay}` : valueDisplay
        }
        return diff > 0 ? `+${diff}` : `${diff}`
    }
  }

  // Handler untuk mulai drag
  const handleMouseDown = useCallback((e: React.MouseEvent, levelIdx: number, diffIdx: number) => {
    e.preventDefault()
    const svg = svgRef.current
    if (!svg) return

    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

    setDragging({ levelIdx, diffIdx })
    setDragStart({ x: svgP.x, y: svgP.y })
  }, [])

  // Handler untuk drag
  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging || !dragStart) return

    const svg = svgRef.current
    if (!svg) return

    const pt = svg.createSVGPoint()
    pt.x = e.clientX
    pt.y = e.clientY
    const svgP = pt.matrixTransform(svg.getScreenCTM()?.inverse())

    const key = `${dragging.levelIdx}-${dragging.diffIdx}`
    const currentOffset = labelOffsets[key] || { dx: 0, dy: 0 }

    setLabelOffsets(prev => ({
      ...prev,
      [key]: {
        dx: currentOffset.dx + (svgP.x - dragStart.x),
        dy: currentOffset.dy + (svgP.y - dragStart.y)
      }
    }))

    setDragStart({ x: svgP.x, y: svgP.y })
  }, [dragging, dragStart, labelOffsets])

  // Handler untuk stop drag
  const handleMouseUp = useCallback(() => {
    setDragging(null)
    setDragStart(null)
  }, [])

  // Handler untuk reset posisi label
  const handleResetPositions = useCallback(() => {
    setLabelOffsets({})
  }, [])

  // Get offset untuk label tertentu
  const getOffset = (levelIdx: number, diffIdx: number) => {
    const key = `${levelIdx}-${diffIdx}`
    return labelOffsets[key] || { dx: 0, dy: 0 }
  }

  if (state.nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-64 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
        <p className="text-gray-500">
          Masukkan angka untuk melihat visualisasi
        </p>
      </div>
    )
  }

  const width = Math.max(
    state.nodes.length * NODE_SPACING + PADDING * 2,
    400
  )
  // Untuk alternate pattern, tinggi berdasarkan jumlah larik dengan spacing 22px
  const isAlternatePattern = state.pattern.startsWith('alternate')
  const height = isAlternatePattern
    ? PADDING * 2 + NODE_RADIUS * 2 + 30 + state.differences.length * 22 + 18
    : PADDING * 2 + NODE_RADIUS * 2 + state.differences.length * LEVEL_HEIGHT + 40

  const nodeY = PADDING + NODE_RADIUS

  const hasOffsets = Object.keys(labelOffsets).length > 0

  return (
    <div className="space-y-2">
      {/* Hint dan tombol reset */}
      <div className="flex items-center justify-between text-xs text-gray-500">
        <span>💡 Geser label beda untuk merapikan posisi</span>
        {hasOffsets && (
          <button
            onClick={handleResetPositions}
            className="px-2 py-1 text-xs bg-gray-100 hover:bg-gray-200 rounded transition-colors"
          >
            Reset Posisi
          </button>
        )}
      </div>

      <div className="overflow-x-auto bg-white rounded-lg border border-gray-200">
        <svg
          ref={svgRef}
          id="sequence-graph"
          width={width}
          height={height}
          className="min-w-full"
          style={{
            minHeight: height,
            cursor: dragging ? 'grabbing' : 'default',
            fontFamily: 'Calibri, Arial, sans-serif',
          }}
          xmlns="http://www.w3.org/2000/svg"
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          {/* Main sequence nodes */}
          {state.nodes.map((node, idx) => {
            const x = PADDING + idx * NODE_SPACING + NODE_SPACING / 2
            return (
              <g key={node.id}>
                {/* Node circle */}
                <circle
                  cx={x}
                  cy={nodeY}
                  r={NODE_RADIUS}
                  fill={node.isAnswer ? '#22c55e' : '#3b82f6'}
                  stroke={node.isAnswer ? '#16a34a' : '#2563eb'}
                  strokeWidth={3}
                />
                {/* Node value */}
                <text
                  x={x}
                  y={nodeY + 1}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill="white"
                  fontSize={14}
                  fontWeight="bold"
                >
                  {node.value}
                </text>
              </g>
            )
          })}

          {/* Difference levels */}
          {state.differences.map((level, levelIdx) => {
            // Untuk alternate pattern, semua larik di level yang sama
            // Untuk tiered pattern, level bertingkat
            const isAlternate = state.pattern.startsWith('alternate')
            const differenceBaseY = nodeY + NODE_RADIUS + 20 + DIFFERENCE_BASE_OFFSET
            const levelY = isAlternate
              ? differenceBaseY // Semua larik di posisi yang sama
              : differenceBaseY + levelIdx * LEVEL_HEIGHT

            if (isAlternate) {
              // For alternate patterns, show differences differently
              const arrayCount = state.pattern === 'alternate-2' ? 2 : 3
              // Jarak vertikal antar larik - lebih kecil agar lebih rapat
              const larikSpacing = 11
              // Posisi Y untuk larik ini
              const larikY = differenceBaseY + levelIdx * larikSpacing

              return (
                <g key={levelIdx}>
                  {level.values.map((diff, diffIdx) => {
                    // Calculate positions based on array pattern
                    const startIdx = levelIdx + diffIdx * arrayCount
                    const endIdx = startIdx + arrayCount

                    if (endIdx >= state.nodes.length) return null

                    const x1 =
                      PADDING + startIdx * NODE_SPACING + NODE_SPACING / 2
                    const x2 = PADDING + endIdx * NODE_SPACING + NODE_SPACING / 2
                    const midX = (x1 + x2) / 2

                    // Kedalaman kurva - disesuaikan dengan posisi label
                    const curveDepth = larikY + 18

                    // Get offset from drag
                    const offset = getOffset(levelIdx, diffIdx)
                    const labelX = midX + offset.dx + LABEL_X_OFFSET
                    const extraY = levelIdx === 0 ? ALT_FIRST_LARIK_EXTRA_Y : 0
                    const labelY = larikY + offset.dy + ALT_LABEL_Y_OFFSET + extraY

                    return (
                      <g key={diffIdx}>
                        {/* Curved line */}
                        <path
                          d={`M ${x1} ${nodeY + NODE_RADIUS} Q ${midX} ${curveDepth} ${x2} ${nodeY + NODE_RADIUS}`}
                          fill="none"
                          stroke={level.color}
                          strokeWidth={2}
                          strokeDasharray="4"
                        />
                        {/* Difference value - draggable */}
                        <g
                          style={{ cursor: 'grab' }}
                          onMouseDown={(e) => handleMouseDown(e, levelIdx, diffIdx)}
                        >
                          <rect
                            x={labelX - 16}
                            y={labelY}
                            width={32}
                            height={18}
                            rx={4}
                            fill={level.color}
                          />
                          <text
                            x={labelX}
                            y={labelY + 9}
                            textAnchor="middle"
                            dominantBaseline="middle"
                            fill="white"
                            fontSize={11}
                            fontWeight="bold"
                            style={{ pointerEvents: 'none' }}
                          >
                            {formatDiff(diff, level.operationType, level.label, level.operations?.[diffIdx], level.displayLabels?.[diffIdx])}
                          </text>
                        </g>
                      </g>
                    )
                  })}
                </g>
              )
            }

            // For tiered patterns
            return (
              <g key={levelIdx}>
                {level.values.map((diff, diffIdx) => {
                  const x1 =
                    PADDING + diffIdx * NODE_SPACING + NODE_SPACING / 2
                  const x2 =
                    PADDING + (diffIdx + 1) * NODE_SPACING + NODE_SPACING / 2
                  const midX = (x1 + x2) / 2

                  // Get offset from drag
                  const offset = getOffset(levelIdx, diffIdx)
                  const labelX = midX + offset.dx + LABEL_X_OFFSET
                  const labelY = levelY + TIER_LABEL_OFFSET + offset.dy
                  const curveDepth = levelY

                  return (
                    <g key={diffIdx}>
                      {/* Curved line */}
                      <path
                        d={`M ${x1} ${nodeY + NODE_RADIUS} Q ${midX} ${curveDepth} ${x2} ${nodeY + NODE_RADIUS}`}
                        fill="none"
                        stroke={level.color}
                        strokeWidth={2}
                        strokeDasharray="4"
                      />
                      {/* Difference value - draggable */}
                      <g
                        style={{ cursor: 'grab' }}
                        onMouseDown={(e) => handleMouseDown(e, levelIdx, diffIdx)}
                      >
                        <rect
                          x={labelX - 16}
                          y={labelY}
                          width={32}
                          height={20}
                          rx={4}
                          fill={level.color}
                        />
                        <text
                          x={labelX}
                          y={labelY + 10}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="white"
                          fontSize={11}
                          fontWeight="bold"
                          style={{ pointerEvents: 'none' }}
                        >
                          {formatDiff(diff, level.operationType, level.label, level.operations?.[diffIdx], level.displayLabels?.[diffIdx])}
                        </text>
                      </g>
                    </g>
                  )
                })}
              </g>
            )
          })}
        </svg>
      </div>
    </div>
  )
}
