"use client";

import { ArrowDown, ArrowUp, Plus, Trash2 } from "lucide-react";
import type { CookingStep } from "@/schemas/content.schema";
import { ImageUploadField } from "./ImageUploadField";

export function GuideStepsEditor({
  steps,
  tips,
  onStepsChange,
  onTipsChange,
}: {
  steps: CookingStep[];
  tips: string[];
  onStepsChange: (next: CookingStep[]) => void;
  onTipsChange: (next: string[]) => void;
}) {
  function patchStep(idx: number, patch: Partial<CookingStep>) {
    const next = steps.map((s, i) => (i === idx ? { ...s, ...patch } : s));
    onStepsChange(next);
  }

  function moveStep(idx: number, dir: -1 | 1) {
    const target = idx + dir;
    if (target < 0 || target >= steps.length) return;
    const next = [...steps];
    const tmp = next[idx]!;
    next[idx] = next[target]!;
    next[target] = tmp;
    onStepsChange(next);
  }

  function addStep() {
    if (steps.length >= 12) return;
    onStepsChange([
      ...steps,
      { title: "", description: "", imageUrl: "" },
    ]);
  }

  function removeStep(idx: number) {
    if (steps.length <= 1) return;
    onStepsChange(steps.filter((_, i) => i !== idx));
  }

  return (
    <div className="space-y-5">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base">
            ขั้นตอนการทำทีละข้อ ({steps.length} ขั้นตอน)
          </h3>
          <button
            type="button"
            onClick={addStep}
            className="sb-btn-dark text-xs"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มขั้นตอน
          </button>
        </div>

        <div className="space-y-3">
          {steps.map((step, idx) => (
            <div
              key={idx}
              className="rounded-2xl border border-sb-line bg-[#120f0e] p-4 space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="font-display font-extrabold text-sm text-sb-pink2">
                  ขั้นตอนที่ {idx + 1}
                </span>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={idx === 0}
                    onClick={() => moveStep(idx, -1)}
                    className="sb-btn-dark px-2.5 min-h-[32px] text-xs"
                    aria-label="เลื่อนขึ้น"
                  >
                    <ArrowUp className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    disabled={idx === steps.length - 1}
                    onClick={() => moveStep(idx, 1)}
                    className="sb-btn-dark px-2.5 min-h-[32px] text-xs"
                    aria-label="เลื่อนลง"
                  >
                    <ArrowDown className="w-3.5 h-3.5" />
                  </button>
                  {steps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="sb-btn-dark px-2.5 min-h-[32px] text-xs"
                      aria-label="ลบขั้นตอน"
                    >
                      <Trash2 className="w-3.5 h-3.5 text-sb-orange" />
                    </button>
                  )}
                </div>
              </div>

              <input
                required
                placeholder="หัวข้อขั้นตอน เช่น วอร์มหม้อทอด 180°C นาน 3 นาที"
                value={step.title}
                onChange={(e) => patchStep(idx, { title: e.target.value })}
                className="sb-input text-sm font-semibold"
              />
              <textarea
                required
                rows={2}
                placeholder="คำอธิบายละเอียดของขั้นตอนนี้..."
                value={step.description}
                onChange={(e) => patchStep(idx, { description: e.target.value })}
                className="sb-input text-sm"
              />
              <ImageUploadField
                compact
                label="รูปประกอบขั้นตอนนี้ (เว้นว่างได้)"
                value={step.imageUrl}
                onChange={(url) => patchStep(idx, { imageUrl: url })}
                placeholder="เว้นว่างได้ หรือวางลิงก์ / อัปโหลดรูป"
              />
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base">
            เคล็ดลับพิเศษ (Pro Tips)
          </h3>
          <button
            type="button"
            onClick={() =>
              tips.length < 8 && onTipsChange([...tips, ""])
            }
            className="text-xs text-sb-pink2 font-semibold inline-flex items-center gap-1"
          >
            <Plus className="w-3.5 h-3.5" /> เพิ่มเคล็ดลับ
          </button>
        </div>
        {tips.map((tip, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <input
              required
              placeholder="เช่น พักเนื้อ 3 นาทีก่อนหั่น น้ำในเนื้อจะไม่ไหลออก"
              value={tip}
              onChange={(e) =>
                onTipsChange(tips.map((t, i) => (i === idx ? e.target.value : t)))
              }
              className="sb-input text-sm flex-1"
            />
            <button
              type="button"
              onClick={() => onTipsChange(tips.filter((_, i) => i !== idx))}
              className="sb-btn-dark px-3"
              aria-label="ลบเคล็ดลับ"
            >
              <Trash2 className="w-4 h-4 text-sb-orange" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
