"use client";

import { ImageUploadField } from "./ImageUploadField";

export interface ProductMediaState {
  platedImgUrl: string;
  packImgUrl: string;
  wideImgUrl: string;
  description: string;
  isNew: boolean;
}

export function ProductMediaFields({
  value,
  onChange,
}: {
  value: ProductMediaState;
  onChange: (patch: Partial<ProductMediaState>) => void;
}) {
  return (
    <div className="space-y-3 pt-3 border-t border-sb-line">
      <p className="font-display font-bold text-sm">รูปภาพสินค้า & รายละเอียด</p>

      <ImageUploadField
        label="รูปจานพร้อมเสิร์ฟ (รูปหลักสินค้า) *"
        value={value.platedImgUrl}
        onChange={(url) => onChange({ platedImgUrl: url })}
        compact
      />

      <ImageUploadField
        label="รูปซองสินค้าแช่แข็ง *"
        value={value.packImgUrl}
        onChange={(url) => onChange({ packImgUrl: url })}
        compact
      />

      <ImageUploadField
        label="รูปแนวกว้าง Spotlight (ไม่บังคับ — ใช้เมื่อเป็นสินค้าใหม่แนะนำ)"
        value={value.wideImgUrl}
        onChange={(url) => onChange({ wideImgUrl: url })}
        placeholder="เว้นว่างได้ หรืออัปโหลดรูปแนวนอน"
        compact
      />

      <label className="block text-xs font-semibold space-y-1">
        <span>รายละเอียดสินค้าเพิ่มเติม (Description)</span>
        <textarea
          rows={2}
          value={value.description}
          onChange={(e) => onChange({ description: e.target.value })}
          placeholder="อธิบายจุดเด่น รสชาติ วิธีรับประทาน หรือข้อมูลสินค้า..."
          className="sb-input text-sm font-normal"
        />
      </label>

      <label className="inline-flex items-center gap-2 text-xs font-semibold cursor-pointer">
        <input
          type="checkbox"
          checked={value.isNew}
          onChange={(e) => onChange({ isNew: e.target.checked })}
          className="w-4 h-4 accent-sb-pink"
        />
        <span>ติดป้าย &ldquo;สินค้าใหม่แนะนำ&rdquo; บนหน้าแรก</span>
      </label>
    </div>
  );
}
