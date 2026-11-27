"use client";

import { isoToLocalInput, localInputToIso } from "@/lib/datetime-input";

export function ScheduleFields({
  startsAt,
  endsAt,
  onChange,
}: {
  startsAt: string | null;
  endsAt: string | null;
  onChange: (next: { startsAt: string | null; endsAt: string | null }) => void;
}) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-sb-line">
      <label className="block text-sm">
        <span className="text-xs font-semibold text-sb-mute">
          วันเวลาเริ่มแสดง (ไม่บังคับ)
        </span>
        <input
          type="datetime-local"
          value={isoToLocalInput(startsAt)}
          onChange={(e) =>
            onChange({ startsAt: localInputToIso(e.target.value), endsAt })
          }
          className="sb-input mt-1 text-sm"
        />
      </label>
      <label className="block text-sm">
        <span className="text-xs font-semibold text-sb-mute">
          วันเวลาสิ้นสุด (ไม่บังคับ)
        </span>
        <input
          type="datetime-local"
          value={isoToLocalInput(endsAt)}
          onChange={(e) =>
            onChange({ startsAt, endsAt: localInputToIso(e.target.value) })
          }
          className="sb-input mt-1 text-sm"
        />
      </label>
    </div>
  );
}
