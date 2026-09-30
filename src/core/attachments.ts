import type { EffortAttachment } from "./model";
export const ATTACHMENT_MAX = 2 * 1024 * 1024;
export async function prepareAttachment(
  file: File,
): Promise<{ attachment: EffortAttachment; resized: boolean }> {
  if (
    !["application/pdf", "image/png", "image/jpeg", "image/webp"].includes(
      file.type,
    ) ||
    !file.size
  )
    throw new Error("PDF·PNG·JPEG·WebP 파일을 선택해주세요.");
  if (
    file.size >
    (file.type === "application/pdf" ? ATTACHMENT_MAX : 12 * 1024 * 1024)
  )
    throw new Error("PDF는 2MB, 사진은 12MB 이하로 선택해주세요.");
  let blob: Blob = file,
    name = file.name,
    resized = false;
  if (file.size > ATTACHMENT_MAX) {
    const bitmap = await createImageBitmap(file);
    try {
      const scale = Math.min(1, 1800 / Math.max(bitmap.width, bitmap.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(bitmap.width * scale));
      canvas.height = Math.max(1, Math.round(bitmap.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("사진을 처리하지 못했습니다.");
      ctx.fillStyle = "#fff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
      for (const quality of [0.9, 0.75, 0.6]) {
        blob = await new Promise<Blob>((resolve, reject) =>
          canvas.toBlob(
            (b) =>
              b ? resolve(b) : reject(new Error("사진 변환에 실패했습니다.")),
            "image/jpeg",
            quality,
          ),
        );
        if (blob.size <= ATTACHMENT_MAX) break;
      }
      if (blob.size > ATTACHMENT_MAX)
        throw new Error("사진 크기를 더 줄인 뒤 첨부해주세요.");
      name = file.name.replace(/\.[^.]+$/, "") + ".jpg";
      resized = true;
    } finally {
      bitmap.close();
    }
  }
  const data = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
  return {
    attachment: {
      id: crypto.randomUUID(),
      name: name.slice(0, 180),
      mime: blob.type as EffortAttachment["mime"],
      size: blob.size,
      data,
    },
    resized,
  };
}
