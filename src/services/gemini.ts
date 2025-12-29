const GEMINI_API_URL =
  'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash-001:generateContent'

interface GeminiResponse {
  candidates?: Array<{
    content: {
      parts: Array<{ text: string }>
    }
  }>
  error?: {
    message: string
  }
}

const EXTRACT_PROMPT = `Kamu adalah mentor TIU (Tes Intelegensi Umum) ahli dalam bidang numerik deret dengan pengalaman 20 tahun.

TUGAS: Ekstrak SEMUA angka dari deret dalam gambar ini, termasuk angka yang ada di dalam kotak/highlight.

INSTRUKSI PENTING:
1. Baca SEMUA angka dari KIRI ke KANAN sesuai urutan posisi dalam deret
2. MASUKKAN SEMUA angka yang terlihat, termasuk:
   - Angka biasa (tanpa kotak)
   - Angka di dalam kotak/highlight/warna (ini adalah angka yang dicari tapi sudah dijawab)
3. ABAIKAN HANYA:
   - Tanda tanya (?) atau kotak kosong tanpa angka
   - Angka kecil di atas/bawah yang menunjukkan operasi (×1, ×2, +3, -2, dll)
   - Anotasi atau coretan yang bukan bagian deret

PERHATIAN KHUSUS:
- Angka yang ditulis tangan bisa mirip: 2 vs 3, 6 vs 0, 1 vs 7
- Pastikan membaca setiap digit dengan benar
- Hitung jumlah angka dengan teliti

OUTPUT FORMAT:
Berikan HANYA array angka dalam format JSON: [angka1, angka2, angka3, ...]
Jangan berikan penjelasan apapun.

CONTOH:
- Gambar: 2, 4, [6], 8, 10 → Output: [2, 4, 6, 8, 10]
- Gambar: 1, 4, 9, ?, 25 → Output: [1, 4, 9, 25]
- Gambar: 3, 6, [12], 24, 48 → Output: [3, 6, 12, 24, 48]`

const ANALYZE_PROMPT = `Kamu adalah mentor TIU (Tes Intelegensi Umum) ahli dalam bidang numerik deret dengan pengalaman 20 tahun. Kamu sangat mahir menganalisis berbagai jenis pola deret angka.

TUGAS: Analisis gambar soal deret ini secara komprehensif.

KEAHLIANMU:
1. Pola Aritmatika (selisih tetap): 2, 4, 6, 8 → selisih +2
2. Pola Geometri (rasio tetap): 2, 6, 18, 54 → rasio ×3
3. Pola Bertingkat: selisih membentuk pola tersendiri
4. Pola Fibonacci: setiap angka = jumlah 2 angka sebelumnya
5. Pola Kuadrat/Pangkat: 1, 4, 9, 16 → n²
6. Pola Berselang: dua/tiga pola berbeda yang berselang-seling
7. Pola Prima: 2, 3, 5, 7, 11
8. Pola Kombinasi: gabungan beberapa pola

INSTRUKSI ANALISIS:
1. Ekstrak semua angka yang terlihat
2. Identifikasi jenis pola yang digunakan
3. Hitung selisih atau rasio antar angka
4. Tentukan jawaban jika ada tanda tanya (?)
5. Berikan penjelasan singkat dan jelas

OUTPUT FORMAT (JSON):
{
  "angka": [array angka yang terlihat],
  "pola": "nama/jenis pola",
  "selisih": [array selisih antar angka],
  "jawaban": angka jawaban jika ada tanda tanya,
  "penjelasan": "penjelasan singkat pola dan cara menyelesaikan"
}`

export async function extractSequenceFromImage(
  imageBase64: string,
  apiKey: string
): Promise<number[]> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: EXTRACT_PROMPT },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.1,
        maxOutputTokens: 256,
      },
    }),
  })

  const data: GeminiResponse = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Parse the array from the response
  const match = text.match(/\[[\d,\s.\-−]+\]/)
  if (match) {
    try {
      // Handle negative signs (both regular minus and unicode minus)
      const normalized = match[0].replace(/−/g, '-')
      const numbers = JSON.parse(normalized)
      if (Array.isArray(numbers) && numbers.every((n) => typeof n === 'number')) {
        return numbers
      }
    } catch {
      // Fall through to manual parsing
    }
  }

  // Fallback: extract all numbers from text
  const numbers = text.match(/-?\d+(\.\d+)?/g)
  if (numbers) {
    return numbers.map((n) => parseFloat(n))
  }

  throw new Error('Tidak dapat mengekstrak angka dari gambar')
}

export interface SequenceAnalysis {
  angka: number[]
  pola: string
  selisih: number[]
  jawaban: number | null
  penjelasan: string
}

export async function analyzeSequenceFromImage(
  imageBase64: string,
  apiKey: string
): Promise<SequenceAnalysis> {
  const response = await fetch(`${GEMINI_API_URL}?key=${apiKey}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: ANALYZE_PROMPT },
            {
              inline_data: {
                mime_type: 'image/png',
                data: imageBase64.replace(/^data:image\/\w+;base64,/, ''),
              },
            },
          ],
        },
      ],
      generationConfig: {
        temperature: 0.2,
        maxOutputTokens: 1024,
      },
    }),
  })

  const data: GeminiResponse = await response.json()

  if (data.error) {
    throw new Error(data.error.message)
  }

  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || ''

  // Try to parse JSON from response
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (jsonMatch) {
    try {
      const normalized = jsonMatch[0].replace(/−/g, '-')
      const result = JSON.parse(normalized)
      return {
        angka: result.angka || [],
        pola: result.pola || 'Tidak teridentifikasi',
        selisih: result.selisih || [],
        jawaban: result.jawaban ?? null,
        penjelasan: result.penjelasan || '',
      }
    } catch {
      // Fall through
    }
  }

  throw new Error('Tidak dapat menganalisis pola dari gambar')
}
