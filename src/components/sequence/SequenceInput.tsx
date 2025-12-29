import { useState, type KeyboardEvent } from 'react'
import { Button, Input } from '@/components/ui'
import { useSequenceContext } from '@/contexts/SequenceContext'
import { parseSequenceFromText } from '@/services/sequenceCalculator'

export function SequenceInput() {
  const { state, dispatch } = useSequenceContext()
  const [inputValue, setInputValue] = useState('')
  const [bulkInput, setBulkInput] = useState('')

  const handleAddNumber = () => {
    const value = parseFloat(inputValue)
    if (!isNaN(value)) {
      dispatch({ type: 'ADD_NODE', payload: value })
      setInputValue('')
    }
  }

  const handleKeyPress = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddNumber()
    }
  }

  const handleBulkAdd = () => {
    const numbers = parseSequenceFromText(bulkInput)
    if (numbers.length > 0) {
      const newNodes = numbers.map((value, idx) => ({
        id: Math.random().toString(36).substring(2, 9),
        value,
        isAnswer: false,
        position: state.nodes.length + idx,
      }))
      dispatch({ type: 'SET_NODES', payload: [...state.nodes, ...newNodes] })
      setBulkInput('')
    }
  }

  const handleNodeUpdate = (id: string, value: string) => {
    const numValue = parseFloat(value)
    if (!isNaN(numValue)) {
      dispatch({ type: 'UPDATE_NODE', payload: { id, value: numValue } })
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        <div className="flex-1">
          <Input
            placeholder="Masukkan angka..."
            type="number"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyPress}
          />
        </div>
        <Button onClick={handleAddNumber}>Tambah</Button>
      </div>

      <div className="space-y-2">
        <textarea
          placeholder="Atau tempel deret angka di sini (contoh: 2, 4, 6, 8, 10)"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500"
          rows={2}
          value={bulkInput}
          onChange={(e) => setBulkInput(e.target.value)}
        />
        <Button variant="secondary" onClick={handleBulkAdd} className="w-full">
          Tambah Semua
        </Button>
      </div>

      {state.nodes.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-gray-700">
              Deret ({state.nodes.length} angka)
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => dispatch({ type: 'RESET' })}
            >
              Reset
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {state.nodes.map((node) => (
              <div
                key={node.id}
                className={`
                  relative group flex items-center gap-1
                  px-3 py-2 rounded-lg border-2 transition-colors cursor-pointer
                  ${
                    node.isAnswer
                      ? 'bg-green-50 border-green-500'
                      : 'bg-white border-gray-300 hover:border-green-300'
                  }
                `}
                onClick={() =>
                  dispatch({ type: 'TOGGLE_ANSWER', payload: node.id })
                }
                title="Klik untuk tandai sebagai jawaban"
              >
                <input
                  type="number"
                  value={node.value}
                  onChange={(e) => handleNodeUpdate(node.id, e.target.value)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-16 bg-transparent text-center font-mono text-lg focus:outline-none"
                />
                <button
                  onClick={(e) => {
                    e.stopPropagation()
                    dispatch({ type: 'REMOVE_NODE', payload: node.id })
                  }}
                  className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">
            Klik angka untuk menandai sebagai jawaban (hijau)
          </p>
        </div>
      )}
    </div>
  )
}
