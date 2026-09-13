# HƯỚNG DẪN TRIỂN KHAI SILKMOON LÊN DIGITALOCEAN (KIẾN TRÚC ZERO-CODE NGINX PROXY)

Hệ thống triển khai theo mô hình **Zero-Code Reverse Proxy Injection**:
Mã nguồn của website SilkMoon hoàn toàn nguyên bản (không cần thêm thẻ script hay sửa bất kỳ dòng code nào). Cổng vào Nginx Gateway sẽ tự động tiêm SDK giám sát và chuyển tiếp telemetry về hệ thống AI chống bot.

---

## 1. Kiến trúc luồng hoạt động
```
                              Khách hàng / Bot
                                     │
                                     ▼ Port 80 / 443
                        ┌────────────────────────┐
                        │   SILKMOON GATEWAY     │
                        │    (Nginx Reverse)     │
                        └────────────┬───────────┘
                                     │
        ┌────────────────────────────┼────────────────────────────┐
        │ 1. Tiêm SDK vào HTML       │ 2. Proxy API Backend       │ 3. Proxy Telemetry
        ▼                            ▼                            ▼
┌──────────────────┐        ┌──────────────────┐        ┌──────────────────┐
│ silkmoon-frontend│        │ silkmoon-backend │        │bot-detection-core│
│   (Port 80 nội)  │        │  (Port 3000 nội) │        │  (Port 8000 nội) │
└──────────────────┘        └──────────────────┘        └──────────────────┘
```

* **`/` $\rightarrow$ `silkmoon-frontend`**: Nginx tự động tiêm `<script src="/bot-collector.js"></script>` vào trước thẻ `</body>` trên đường truyền bằng module `sub_filter`.
* **`/bot-collector.js`**: Nginx lấy trực tiếp bundle SDK từ server `bot-detection-core`.
* **`/api/v1/telemetry`**: Chuyển tiếp luồng hành vi chuột/touch/canvas về AI server để phân tích gian lận & bot.
* **`/api/v1/`**: Chuyển tiếp các API của cửa hàng về `silkmoon-backend`.

---

## 2. Các bước triển khai trên DigitalOcean Droplet

### Bước 2.1: Chuẩn bị máy chủ Droplet
* Tạo 1 Droplet Ubuntu 24.04 LTS (RAM $\ge$ 2GB).
* Cài Docker & Docker Compose:
```bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh
```

### Bước 2.2: Clone mã nguồn SilkMoon
```bash
git clone https://github.com/btthanhk4/silkmoon.git /var/www/silkmoon
cd /var/www/silkmoon
```

### Bước 2.3: Thiết lập biến môi trường
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Điền các giá trị thực tế: `MONGODB_URI`, `JWT_SECRET`, `PAYOS_...`.

### Bước 2.4: Khởi chạy toàn bộ hệ thống
```bash
docker compose up -d --build
```
Kiểm tra container đang chạy:
```bash
docker compose ps
```

---

## 3. Cài đặt SSL HTTPS Miễn phí với Certbot
Trên máy chủ host Droplet:
```bash
sudo apt update && sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot sẽ tự động quản lý và gia hạn chứng chỉ SSL vĩnh viễn.
