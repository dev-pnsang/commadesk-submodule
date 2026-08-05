# vision-platform

Repo demo **CommaDesk Module Apps (CPMOD)** — tính năng mẫu **Camera Notes**: ghi chú nhanh gắn `camera_id` / mức ưu tiên, import vào dashboard qua file `.cpmod.zip`.

| | |
|---|---|
| `tech_name` | `camera-notes` |
| UI sau import | `/dashboard/ext/camera-notes` |
| API | `/api/v1/m/camera-notes/note` |

## Cấu trúc

```text
package/                 ← nội dung gói CPMOD (đóng ZIP cái này)
  module.json
  models/note.json
  permissions.json
  menus.json
  frontend/index.html
scripts/
  gen-keypair.mjs        ← tạo khóa ký Ed25519
  pack.mjs               ← đóng + ký → .cpmod.zip
```

## Build (đóng gói)

### 1) Tạo keypair (một lần)

```bash
cd /home/ubuntu/project/control-plane/requirements/vision-platform
node scripts/gen-keypair.mjs --out-dir ./keys
```

Ghi lại dòng `public_key_hex=...` (hoặc file `keys/public.raw.hex`).

### 2) Root đăng ký Publisher trên CommaDesk

1. Đăng nhập **Root** → Sidebar → **Kết nối** → **Module Apps** (`/dashboard/module-apps`)
2. Thêm Publisher: tên ví dụ `Vision Platform Demo` + dán `public_key_hex`
3. Copy `publisher_id` (dạng `pub-…`)

### 3) Pack + ký

```bash
node scripts/pack.mjs \
  --publisher-id pub-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --private-key ./keys/private.pem \
  --out ./dist/camera-notes.cpmod.zip
```

Kết quả: `dist/camera-notes.cpmod.zip`.

## Import vào hệ thống

1. Tài khoản org có quyền `action_module_install` (hoặc Root)
2. `/dashboard/module-apps` → **Import ZIP** → chọn `dist/camera-notes.cpmod.zip`
3. Mở **Camera Notes** trên sidebar (nhóm Module Apps) hoặc `/dashboard/ext/camera-notes`
4. Thêm ghi chú: tiêu đề, `camera_id`, mức ưu tiên, nội dung

## Gỡ cài

Module Apps → **Gỡ** trên dòng `camera-notes` (có thể drop bảng `m_camera-notes_note`).

## Tài liệu nền tảng

- VI: `control-plane/docs/cpmod/HUONG-DAN-BAT-DAU.md`
- EN: `control-plane/docs/cpmod/GETTING-STARTED.md`
- Contract: `control-plane/docs/cpmod/README.md`

**Không commit** thư mục `keys/` hoặc file `private.pem`.
