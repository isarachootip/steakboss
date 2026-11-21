# Steakboss E-Commerce Platform

ระบบ E-Commerce เต็มรูปแบบสำหรับ **บริษัท สเต็กบอสส์ต้นตำรับ จำกัด (จ.อ่างทอง)** พัฒนาจากต้นแบบ `steakboss-store.html`

## โมดูลหลักที่ครบพร้อมใช้งาน
1. **`product_backend` (`/admin/products`, `/admin/settings`)**:
   - จัดการสินค้า (CRUD), สต็อกราย SKU พร้อมประวัติ `StockMovement`, และระบบ **Bundle Engine** (`เซ็ตรวมฮิต 4 ซอง` คำนวณและตัดสต็อกสินค้าลูกแบบ Atomic Transaction)
   - เก็บราคาทุน COGS (จำกัดสิทธิ์เฉพาะ `OWNER`), จัดการคูปอง (`BOSS50`) และเรทค่าส่งรถเย็น
2. **Website Storefront**:
   - **Landing Page (`/`)**: Hero, Spotlight สินค้าใหม่, เมนูทั้งหมดพร้อมสลับดูจาน/ดูซอง, วิธีปรุง, ตารางค่าส่งรถเย็น
   - **PDP (`/products/[slug]`)**: แกลเลอรีรูป, SEO Metadata + JSON-LD, ส่วนประกอบเซ็ต, Cross-sell
   - **Checkout (`/checkout`)**: คำนวณค่าส่งรถเย็นตามรหัสไปรษณีย์ / รับเองที่โรงงานอ่างทอง / คูปอง / PromptPay & COD
   - **Payment (`/orders/[orderNo]/pay`)**: Dynamic PromptPay EMVCo QR ตามยอดจริง, อัปโหลดสลิปพร้อมตรวจสลิปซ้ำ (`slipHash`/`slipTransRef`) และ Slip Verification Adapter (Sandbox / SlipOK / EasySlip)
   - **Tracking (`/track`)**: ติดตามสถานะ 5 ขั้นตอนด้วยเลขคำสั่งซื้อ + เบอร์โทร 4 ตัวท้าย
   - **Customer Account (`/account`)**: ดูประวัติคำสั่งซื้อและกดสั่งซ้ำ (Reorder)
3. **OMS & Cold-Chain Delivery (`/admin/orders`, `/admin/orders/[orderNo]/print`, `/admin/customers`)**:
   - อนุมัติ/ปฏิเสธสลิป, อัปเดตสถานะและเลขพัสดุ, นำเข้าเลขพัสดุ CSV ทีละหลายใบ, พิมพ์ใบปะหน้าพัสดุรถเย็น -18°C, ล้างออเดอร์ค้างโอนเกิน 24 ชม. คืนสต็อกอัตโนมัติ
4. **LINE Chat & Unified BossBot Inbox (`/admin/inbox`, `/api/webhooks/line`)**:
   - บอสบอทเชื่อมฐานข้อมูลจริง (เมนู, ค่าส่ง, เช็กพัสดุ) ทั้งบนหน้าเว็บและ LINE OA พร้อมสลับโหมด **Human Handoff** ให้แอดมินตอบจาก Unified Inbox และ Push ข้อความกลับไปยัง LINE OA อัตโนมัติ
5. **Reports & Reconciliation (`/admin/reports`)**:
   - ยอดขายแยกตามช่วงเวลา & ช่องทาง (Web vs LINE), กำไรขั้นต้น COGS (`OWNER`), กระทบยอด PromptPay vs COD, อัตราซื้อซ้ำ, แจ้งเตือนสต็อกต่ำ และ Export CSV (UTF-8 BOM เปิดภาษาไทยใน Excel ได้ทันที)

## Quick Start (Local Development)

```bash
npm install
npm run assets:extract
npm run db:setup
npm test
npm run dev
```

เปิดใช้งานได้ที่:
- หน้าร้าน: `http://localhost:3000`
- หลังบ้าน: `http://localhost:3000/admin` (ล็อกอินที่ `/admin-login`)

### บัญชีทดสอบ RBAC (Seed)
- **OWNER**: `owner@steakboss.local` / `boss1234` (เห็นต้นทุน/กำไร + แก้ตั้งค่าร้าน)
- **ADMIN**: `admin@steakboss.local` / `admin1234` (จัดการออเดอร์, สลิป, แชท, สินค้า)
- **PACKER**: `packer@steakboss.local` / `pack1234` (แพ็คของ, พิมพ์ใบปะหน้า, กรอกเลขพัสดุ)

## การสลับไปเชื่อมต่อ Production APIs (`.env`)
- **PostgreSQL**: เปิด `docker compose up -d`, เปลี่ยน `provider = "postgresql"` ใน `prisma/schema.prisma`, ตั้ง `DATABASE_URL` แล้วรัน `npm run db:setup`
- **LINE OA**: ใส่ `LINE_CHANNEL_SECRET`, `LINE_CHANNEL_ACCESS_TOKEN`, `LINE_STAFF_GROUP_ID` และตั้ง Webhook URL เป็น `https://<domain>/api/webhooks/line`
- **ตรวจสลิปอัตโนมัติ (SlipOK / EasySlip)**: ใส่ `SLIP_VERIFY_API_URL` และ `SLIP_VERIFY_API_KEY`
- **BossBot AI (Gemini)**: ใส่ `GEMINI_API_KEY`
