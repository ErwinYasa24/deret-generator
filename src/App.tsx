import { useState } from 'react'
import { SequenceProvider } from '@/contexts/SequenceContext'
import { Card } from '@/components/ui'
import { SequenceInput, PatternSelector, SequenceGraph } from '@/components/sequence'
import { ImageUploader } from '@/components/image'
import { ExportButton } from '@/components/export'

type InputMode = 'manual' | 'image'

function AppContent() {
  const [inputMode, setInputMode] = useState<InputMode>('manual')

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 py-8 px-4">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-bold text-gray-900">
            Pembahasan Deret Generator
          </h1>
          <p className="text-gray-600 mt-2">
            Visualisasi dan analisis pola deret angka
          </p>
        </div>

        {/* Input Mode Tabs */}
        <div className="flex justify-center">
          <div className="inline-flex bg-white rounded-lg p-1 shadow-sm border border-gray-200">
            <button
              onClick={() => setInputMode('manual')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${inputMode === 'manual'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              Input Manual
            </button>
            <button
              onClick={() => setInputMode('image')}
              className={`
                px-4 py-2 rounded-md text-sm font-medium transition-colors
                ${inputMode === 'image'
                  ? 'bg-blue-600 text-white'
                  : 'text-gray-600 hover:text-gray-900'}
              `}
            >
              Upload Gambar
            </button>
          </div>
        </div>

        {/* Input Section */}
        <Card title={inputMode === 'manual' ? 'Input Deret' : 'Upload Gambar'}>
          {inputMode === 'manual' ? <SequenceInput /> : <ImageUploader />}
        </Card>

        {/* Pattern Selector */}
        <Card title="Pengaturan Pola">
          <PatternSelector />
        </Card>

        {/* Visualization */}
        <Card
          title="Visualisasi"
          actions={<ExportButton svgSelector="#sequence-graph" />}
        >
          <SequenceGraph />
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-gray-500">
          Double-click angka untuk menandai sebagai jawaban
        </div>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <SequenceProvider>
      <AppContent />
    </SequenceProvider>
  )
}
