import { NextResponse } from "next/server";
import { readUploadedImage } from "@/services/upload.service";

export async function GET(
  _req: Request,
  context: { params: Promise<{ filename: string }> }
) {
  const { filename } = await context.params;
  const found = await readUploadedImage(filename);
  if (!found) {
    return NextResponse.json({ error: "ไม่พบไฟล์รูปภาพ" }, { status: 404 });
  }

  return new NextResponse(new Uint8Array(found.buffer), {
    status: 200,
    headers: {
      "Content-Type": found.contentType,
      "Cache-Control": "public, max-age=31536000, immutable",
    },
  });
}
