import { NextResponse } from "next/server";
import { MANAGER_ROLES, requireRole } from "@/lib/auth/rbac";
import { resolveUploadPreset } from "@/services/image-optimizer.service";
import { saveUploadedImage } from "@/services/upload.service";

export async function POST(req: Request) {
  const guard = await requireRole(MANAGER_ROLES);
  if (!guard.ok) return guard.response;

  try {
    const formData = await req.formData();
    const entry = formData.get("file");
    if (!(entry instanceof File)) {
      return NextResponse.json(
        { error: "กรุณาเลือกไฟล์รูปภาพที่ต้องการอัปโหลด" },
        { status: 400 }
      );
    }

    const preset = resolveUploadPreset(formData.get("preset"));
    const arrayBuffer = await entry.arrayBuffer();
    const saved = await saveUploadedImage({
      buffer: Buffer.from(arrayBuffer),
      mimeType: entry.type,
      preset,
    });

    return NextResponse.json(
      {
        url: saved.url,
        filename: saved.filename,
        bytes: saved.bytes,
        originalBytes: saved.originalBytes,
        width: saved.width,
        height: saved.height,
      },
      { status: 201 }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "อัปโหลดรูปไม่สำเร็จ";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
