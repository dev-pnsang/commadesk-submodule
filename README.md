# CommaDesk Submodule

Repo **CPMOD** (CommaDesk Module Apps) — đóng gói tính năng độc lập thành file `.cpmod.zip`, ký số, rồi import vào dashboard CommaDesk **không cần PR** vào monorepo `backend/` / `frontend/`.

| | |
|---|---|
| Repo | [dev-pnsang/commadesk-submodule](https://github.com/dev-pnsang/commadesk-submodule) |
| Định dạng gói | `.cpmod.zip` (ký Ed25519) |
| UI sau import | `/dashboard/ext/<tech_name>` |
| API runtime | `/api/v1/m/<tech_name>/...` |

---

## Mô hình branch = một chức năng

> **Mỗi branch là một submodule / tính năng riêng biệt.** Không gộp nhiều module khác nhau trên cùng một branch.

| Quy ước | Chi tiết |
|---------|----------|
| Một branch ↔ một `tech_name` | Ví dụ branch `camera-notes` chỉ chứa module Camera Notes |
| `package/` thuộc đúng chức năng đó | `module.json`, models, menus, permissions, frontend của **một** gói |
| Pack từ branch đang checkout | ZIP xuất ra chỉ chứa nội dung branch hiện tại |
| Branch mới khi thêm tính năng | `git checkout -b <tech-name>` → scaffold `package/` → pack → import |

```text
main / camera-notes     →  Camera Notes (demo)
feature/inventory       →  Kho đơn giản (ví dụ)
feature/visitor-log     →  Sổ khách (ví dụ)
```

Workflow gợi ý:

```bash
git clone https://github.com/dev-pnsang/commadesk-submodule.git
cd commadesk-submodule
git checkout <ten-chuc-nang>    # chọn đúng branch tính năng
# sửa package/ → pack → import
```

---

## Demo trên nhánh hiện tại — Camera Notes

Ghi chú nhanh gắn `camera_id` / mức ưu tiên.

| | |
|---|---|
| `tech_name` | `camera-notes` |
| UI | `/dashboard/ext/camera-notes` |
| API | `/api/v1/m/camera-notes/note` |

---

## Yêu cầu

1. **Node.js 18+** (chạy `scripts/gen-keypair.mjs`, `scripts/pack.mjs`)
2. **CommaDesk** đang chạy (dev/staging/prod) — repo này **không** thay thế control-plane
3. Tài khoản **Root** để đăng ký Publisher; tài khoản org có `action_module_install` để import

---

## Cấu trúc repo

```text
package/                 ← nội dung gói CPMOD (đóng ZIP cái này)
  module.json            ← tech_name, version, publisher_id, …
  models/*.json          ← schema CRUD
  permissions.json
  menus.json
  frontend/index.html    ← UI tĩnh (HTML/JS); không cần Next.js
scripts/
  gen-keypair.mjs        ← tạo khóa ký Ed25519
  pack.mjs               ← đóng + ký → .cpmod.zip
dist/                    ← output (gitignore)
keys/                    ← private/public key (gitignore)
```

### Frontend = static

UI chỉ cần HTML/CSS/JS (hoặc Vite / React / Vue **build ra static** rồi copy vào `package/frontend/`).

Platform serve trong iframe — **không** chạy `next start` của module.

---

## Build · ký · import

Làm việc tại **root repo** (thư mục clone của bạn), trên đúng branch chức năng.

### 1) Tạo keypair (một lần / mỗi publisher)

```bash
node scripts/gen-keypair.mjs --out-dir ./keys
cat keys/public.raw.hex
```

Giữ `keys/private.pem` bí mật. **Không commit** `keys/` hay `*.pem`.

### 2) Root đăng ký Publisher trên CommaDesk

1. Đăng nhập **Root** → Sidebar → **Kết nối** → **Module Apps** (`/dashboard/module-apps`)
2. **Publishers (Root)** → tên (ví dụ `CommaDesk Submodule`) + dán `public_key_hex`
3. Copy `publisher_id` dạng `pub-…` (bắt buộc dùng ID thật khi pack)

### 3) Pack + ký

Thay `pub-…` bằng ID vừa copy — **không** để placeholder:

```bash
node scripts/pack.mjs \
  --publisher-id pub-xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx \
  --private-key ./keys/private.pem \
  --out ./dist/camera-notes.cpmod.zip
```

Kết quả: `dist/camera-notes.cpmod.zip` (đổi tên file theo `tech_name` của branch).

### 4) Import

1. `/dashboard/module-apps` → **Import / Nâng cấp ZIP** → chọn file vừa pack
2. Mở sidebar module hoặc `/dashboard/ext/<tech_name>`
3. Gỡ cài: Module Apps → **Gỡ** (có thể drop bảng `m_<tech>_…`)

### 5) Nâng cấp schema (thêm cột / bảng — không cần SQL)

Platform hỗ trợ **upgrade additive**: import lại ZIP cùng `tech_name`, giữ data `m_*`.

1. Sửa `package/models/*.json` — chỉ **thêm** field hoặc thêm file model mới  
2. Tăng `version` trong `package/module.json` (vd. `1.0.0` → `1.1.0`)  
3. Pack + ký lại → **Import ZIP** lần nữa trên Module Apps  

| Việc làm | Kết quả trên CommaDesk |
|----------|-------------------------|
| Thêm model mới | Tạo bảng `m_<tech>_<model>` nếu chưa có |
| Thêm field vào model cũ | Thêm cột (data cũ giữ nguyên) |
| Đổi type field đã có | **Từ chối** — đổi tên model (entity mới) hoặc giữ type cũ |
| Hạ `version` | **Từ chối** |

Không gỡ cài / drop bảng chỉ để thêm cột. Không viết SQL trong gói.

Chi tiết contract: `docs/cpmod/` trong monorepo control-plane.

---

## Checklist lỗi thường gặp

| Lỗi | Nguyên nhân / cách xử lý |
|-----|--------------------------|
| `publisher không tồn tại` | ZIP còn `publisher_id` giả / sai — pack lại với ID thật từ UI |
| Chữ ký không hợp lệ | Public key Publisher ≠ keypair dùng để ký — tạo lại Publisher hoặc dùng đúng `private.pem` |
| Không thấy menu sau import | Gán `menu_m_<tech>` cho role; refresh trang |
| Nâng cấp bị từ chối (đổi type) | Chỉ được thêm field/model — đổi tên model hoặc giữ type cũ |
| Nâng cấp bị từ chối (version) | `version` trong `module.json` thấp hơn bản đã cài |
| Doc `control-plane/docs/...` | Cần monorepo CommaDesk bên cạnh; repo này chỉ chứa source gói CPMOD |

---

## Tài liệu nền tảng (CommaDesk)

Trong monorepo control-plane (nếu có quyền truy cập):

| | |
|---|---|
| VI | `docs/cpmod/HUONG-DAN-BAT-DAU.md` |
| EN | `docs/cpmod/GETTING-STARTED.md` |
| Contract | `docs/cpmod/README.md` |
| Feature GUI | `docs/features/09-luu-tru-tich-hop/module-apps-cpmod.md` |

---

## Bảo mật

- Không commit `keys/`, `private.pem`, `dist/`, `*.cpmod.zip`, `package/SIGNATURE`
- Mỗi team Publisher dùng một cặp key; thu hồi Publisher trên UI nếu lộ private key
- Module chạy trong sandbox CPMOD — không nhúng secret production vào `frontend/`
