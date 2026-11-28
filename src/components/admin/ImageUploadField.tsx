"use client";

import { useId, useState } from "react";
import { Upload, Loader2 } from "lucide-react";
import {
  formatFileSize,
  resizeImageFileForUpload,
} from "@/lib/client-image-resize";

interface ImageUploadFieldProps {
  label: string;
  value: string;
  onChange: (nextUrl: string) => void;
  placeholder?: string;
  compact?: boolean;
  preset?: "product" | "banner";
}

export function ImageUploadField({
  label,
  value,
  onChange,
  placeholder = "/images/products/... หรืออัปโหลดไฟล์รูป",
  compact = false,
  preset = "product",
}: ImageUploadFieldProps) {
  const inputId = useId();
  const [phase, setPhase] = useState<"idle" | "resizing" | "uploading">("idle");
  const [info, setInfo] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const rawFile = e.target.files?.[0];
    e.target.value = "";
    if (!rawFile) return;

    setErr(null);
    setInfo(null);
    setPhase("resizing");

    try {
      let uploadFile = rawFile;
      try {
        const resized = await resizeImageFileForUpload(rawFile, { preset });
        uploadFile = resized.file;
      } catch {
        // Fall back to server-side sharp optimizer if browser canvas cannot decode
      }

      setPhase("uploading");
      const fd = new FormData();
      fd.append("file", uploadFile);
      fd.append("preset", preset);

      const res = await fetch("/api/admin/uploads", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json()) as {
        url?: string;
        bytes?: number;
        error?: string;
      };
      if (!res.ok || !data.url) {
        setErr(data.error || "อัปโหลดรูปไม่สำเร็จ");
        return;
      }
      onChange(data.url);
      if (typeof data.bytes === "number") {
        setInfo(
          rawFile.size > data.bytes
            ? `บันทึกแล้ว ${formatFileSize(data.bytes)} (ย่อจาก ${formatFileSize(rawFile.size)})`
            : `บันทึกแล้ว ${formatFileSize(data.bytes)}`
        );
      }
    } catch {
      setErr("เชื่อมต่อเซิร์ฟเวอร์อัปโหลดไม่สำเร็จ");
    } finally {
      setPhase("idle");
    }
  }

  const busy = phase !== "idle";

  return (
    <div className="space-y-1.5">
      <span className="block text-xs font-semibold text-sb-mute">{label}</span>
      <div className="flex flex-wrap items-center gap-2">
        {value && (
          <img
            src={value}
            alt={label}
            className={`${
              compact ? "w-10 h-10" : "w-14 h-14"
            } rounded-xl object-cover border border-sb-line shrink-0 bg-black`}
          />
        )}
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="sb-input flex-1 min-w-[180px] text-sm"
        />
        <input
          id={inputId}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          onChange={handleFileChange}
          className="hidden"
        />
        <label
          htmlFor={inputId}
          className={`sb-btn-dark cursor-pointer text-xs shrink-0 ${
            busy ? "opacity-60 pointer-events-none" : ""
          }`}
        >
          {phase === "resizing" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังย่อรูป...
            </>
          ) : phase === "uploading" ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> กำลังอัปโหลด...
            </>
          ) : (
            <>
              <Upload className="w-3.5 h-3.5" /> อัปโหลดรูป
            </>
          )}
        </label>
      </div>
      {info && <p className="text-[11px] text-sb-ok">{info}</p>}
      {err && <p className="text-xs text-sb-orange">{err}</p>}
    </div>
  );
}
