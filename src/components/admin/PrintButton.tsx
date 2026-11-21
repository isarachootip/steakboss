"use client";

export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="no-print sb-btn text-sm"
    >
      พิมพ์ใบปะหน้า / บันทึกเป็น PDF
    </button>
  );
}
