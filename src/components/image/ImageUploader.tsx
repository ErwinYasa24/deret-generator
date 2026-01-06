import { useState, useCallback, useRef, useEffect, type DragEvent } from 'react'
import { Button, Input } from '@/components/ui'
import { useSequenceContext } from '@/contexts/SequenceContext'
import { extractSequenceFromImage } from '@/services/gemini'

const STORAGE_KEY = 'gemini_api_key'
const ENV_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || ''

export function ImageUploader() {
  const { state, dispatch } = useSequenceContext()
  const [isDragging, setIsDragging] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [apiKey, setApiKey] = useState(() => ENV_API_KEY || localStorage.getItem(STORAGE_KEY) || '')
  const [preview, setPreview] = useState<string | null>(null)
  const [extractedNumbers, setExtractedNumbers] = useState<number[] | null>(null)
  const [editInput, setEditInput] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const hasEnvKey = Boolean(ENV_API_KEY)

  const saveApiKey = () => {
    if (!hasEnvKey) {
      localStorage.setItem(STORAGE_KEY, apiKey)
    }
  }

  const processImage = useCallback(
    async (file: File) => {
      if (!apiKey) {
        setError('Masukkan API Key Gemini terlebih dahulu')
        return
      }

      setIsLoading(true)
      setError(null)

      try {
        const base64 = await fileToBase64(file)
        setPreview(base64)

        const numbers = await extractSequenceFromImage(base64, apiKey)

        if (numbers.length === 0) {
          throw new Error('Tidak ada angka yang ditemukan dalam gambar')
        }

        // Tampilkan hasil untuk diedit sebelum diterapkan
        setExtractedNumbers(numbers)
        setEditInput(numbers.join(', '))
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Gagal memproses gambar')
      } finally {
        setIsLoading(false)
      }
    },
    [apiKey, dispatch, state.nodes]
  )

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
  }

  const handleDrop = (e: DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    const file = e.dataTransfer.files[0]
    if (file && file.type.startsWith('image/')) {
      processImage(file)
    }
  }

  const handlePaste = useCallback(
    (e: ClipboardEvent) => {
      const items = e.clipboardData?.items
      if (!items) return
      for (const item of items) {
        if (item.type.startsWith('image/')) {
          e.preventDefault()
          const file = item.getAsFile()
          if (file) {
            processImage(file)
            break
          }
        }
      }
    },
    [processImage]
  )

  // Global paste listener - bisa paste tanpa klik dulu
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Jangan proses jika sedang focus di input/textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }
      handlePaste(e)
    }

    document.addEventListener('paste', handleGlobalPaste as unknown as EventListener)
    return () => {
      document.removeEventListener('paste', handleGlobalPaste as unknown as EventListener)
    }
  }, [handlePaste])

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      processImage(file)
    }
  }

  const applyExtractedNumbers = () => {
    // Parse dari editInput
    const numbers = editInput
      .split(/[,\s]+/)
      .map((s) => parseFloat(s.trim()))
      .filter((n) => !isNaN(n))

    if (numbers.length === 0) {
      setError('Tidak ada angka valid')
      return
    }

    const newNodes = numbers.map((value, idx) => ({
      id: Math.random().toString(36).substring(2, 9),
      value,
      isAnswer: false,
      position: state.nodes.length + idx,
    }))

    dispatch({ type: 'SET_NODES', payload: [...state.nodes, ...newNodes] })
    setExtractedNumbers(null)
    setEditInput('')
  }

  const cancelExtraction = () => {
    setExtractedNumbers(null)
    setEditInput('')
    setPreview(null)
  }

  return (
    <div className="space-y-4">
      {!hasEnvKey && (
        <div className="flex gap-2">
          <div className="flex-1">
            <Input
              type="password"
              placeholder="Gemini API Key"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              onBlur={saveApiKey}
            />
          </div>
          <Button variant="secondary" onClick={saveApiKey}>
            Simpan
          </Button>
        </div>
      )}

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`
          relative cursor-pointer
          border-2 border-dashed rounded-lg p-6
          flex flex-col items-center justify-center gap-2
          transition-colors min-h-[150px]
          ${isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400'}
          ${isLoading ? 'pointer-events-none opacity-50' : ''}
        `}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-2">
            <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-gray-500">Menganalisis gambar...</span>
          </div>
        ) : preview ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={preview}
              alt="Preview"
              className="max-h-32 rounded-lg"
            />
            <span className="text-sm text-gray-500">
              Klik atau paste untuk gambar baru
            </span>
          </div>
        ) : (
          <>
            <svg
              className="w-10 h-10 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
              />
            </svg>
            <span className="text-sm text-gray-500 text-center">
              Drag & drop gambar, klik untuk upload,
              <br />
              atau <strong>Ctrl+V</strong> untuk paste
            </span>
          </>
        )}
      </div>

      {/* Editor hasil ekstraksi */}
      {extractedNumbers && (
        <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium text-blue-800">
              Hasil Ekstraksi AI ({extractedNumbers.length} angka)
            </span>
            <span className="text-xs text-blue-600">Edit jika perlu koreksi</span>
          </div>
          <input
            type="text"
            value={editInput}
            onChange={(e) => setEditInput(e.target.value)}
            className="w-full px-3 py-2 border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Contoh: 2, 3, 4, 6, 12, 18, 48"
          />
          <div className="flex gap-2">
            <Button onClick={applyExtractedNumbers} className="flex-1">
              Terapkan
            </Button>
            <Button variant="ghost" onClick={cancelExtraction}>
              Batal
            </Button>
          </div>
        </div>
      )}

      {/* Tampilan angka setelah diterapkan */}
      {state.nodes.length > 0 && !extractedNumbers && (
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
                <span className="w-12 text-center text-lg">
                  {node.value}
                </span>
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

      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
          <p className="text-sm text-red-600">{error}</p>
        </div>
      )}
    </div>
  )
}

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
}
