import { useCallback } from 'react'
import { Button } from '@/components/ui'

interface ExportButtonProps {
  svgSelector: string
  filename?: string
}

export function ExportButton({
  svgSelector,
  filename = 'deret-pembahasan',
}: ExportButtonProps) {
  const handleExport = useCallback(() => {
    const svg = document.querySelector(svgSelector) as SVGSVGElement | null
    if (!svg) return

    // Get actual dimensions from SVG attributes
    const svgWidth = parseInt(svg.getAttribute('width') || '400')
    const svgHeight = parseInt(svg.getAttribute('height') || '300')

    // Clone SVG to avoid modifying the original
    const clonedSvg = svg.cloneNode(true) as SVGSVGElement

    // Ensure xmlns is set
    clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg')

    // Set explicit dimensions
    clonedSvg.setAttribute('width', String(svgWidth))
    clonedSvg.setAttribute('height', String(svgHeight))

    const svgData = new XMLSerializer().serializeToString(clonedSvg)
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' })
    const url = URL.createObjectURL(svgBlob)

    const img = new Image()
    img.onload = () => {
      const canvas = document.createElement('canvas')
      const scale = 2 // For higher resolution
      canvas.width = svgWidth * scale
      canvas.height = svgHeight * scale

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.fillStyle = 'white'
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      ctx.scale(scale, scale)
      ctx.drawImage(img, 0, 0)

      const pngUrl = canvas.toDataURL('image/png')
      const link = document.createElement('a')
      link.download = `${filename}.png`
      link.href = pngUrl
      link.click()

      URL.revokeObjectURL(url)
    }

    img.src = url
  }, [svgSelector, filename])

  return (
    <Button onClick={handleExport} variant="secondary">
      <svg
        className="w-4 h-4 mr-2"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4"
        />
      </svg>
      Export PNG
    </Button>
  )
}
