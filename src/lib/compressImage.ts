// 업로드 전 브라우저에서 이미지를 리사이즈 + 압축합니다.
// Supabase Storage 캐시된 이그레스(트래픽) 절감이 목적입니다.
// 별도 npm 설치 없이 브라우저 기본 Canvas API만 사용합니다.
export async function compressImage(file: File, maxDimension = 1000, quality = 0.8): Promise<File> {
  if (!file.type.startsWith('image/')) return file

  try {
    const bitmap = await createImageBitmap(file)
    let { width, height } = bitmap

    if (width > maxDimension || height > maxDimension) {
      if (width > height) {
        height = Math.round((height * maxDimension) / width)
        width = maxDimension
      } else {
        width = Math.round((width * maxDimension) / height)
        height = maxDimension
      }
    }

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) return file
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob: Blob | null = await new Promise((resolve) =>
      canvas.toBlob((b) => resolve(b), 'image/jpeg', quality)
    )
    if (!blob) return file

    // 압축 후 용량이 오히려 더 크면(이미 작은 이미지 등) 원본을 그대로 씁니다.
    if (blob.size >= file.size) return file

    const newName = file.name.replace(/\.[^.]+$/, '') + '.jpg'
    return new File([blob], newName, { type: 'image/jpeg' })
  } catch {
    // 압축 실패 시 원본 업로드로 안전하게 폴백
    return file
  }
}
