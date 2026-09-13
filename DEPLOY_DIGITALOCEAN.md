# HƯỚNG DẪN TRIỂN KHAI SILKMOON LÊN DIGITALOCEAN (DROPLET)

Tài liệu này hướng dẫn chi tiết cách triển khai toàn bộ hệ thống website **SilkMoon** và tích hợp hệ thống giám sát hành vi **Bot Detection AI** trên Cloud **DigitalOcean Droplet (Ubuntu 22.04 / 24.04 LTS)**.

---

## 1. Yêu cầu chuẩn bị trên DigitalOcean
1. Tạo 1 **Droplet**:
   - **OS**: Ubuntu 24.04 LTS (x64).
   - **Cấu hình đề xuất**: Regular AMD / Intel SSD, 4 GB RAM / 2 vCPU ($24/tháng) hoặc tối thiểu 2 GB RAM ($12/tháng).
   - **Authentication**: SSH Key hoặc Root Password.
2. Trỏ tên miền DNS (nếu có domain):
   - Bản ghi `A` trỏ `@` và `www` về IP của Droplet.
   - Bản ghi `A` trỏ `api` về IP của Droplet.

---

## 2. Các bước cài đặt trên máy chủ Droplet

### Bước 2.1: Cập nhật hệ thống & Cài Docker Engine
Đăng nhập SSH vào Droplet và chạy:
```bash
# 1. Cập nhật gói phần mềm
sudo apt update && sudo apt upgrade -y

# 2. Cài Docker và Docker Compose plugin
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh get-docker.sh

# 3. Kiểm tra Docker
docker --version
docker compose version
```

### Bước 2.2: Clone mã nguồn SilkMoon
```bash
git clone https://github.com/btthanhk4/silkmoon.git /var/www/silkmoon
cd /var/www/silkmoon
```

### Bước 2.3: Thiết lập biến môi trường Backend
Tạo file `.env` cho backend:
```bash
cp backend/.env.example backend/.env
nano backend/.env
```
Điền các thông tin thực tế:
- `MONGODB_URI`: Chuỗi kết nối MongoDB Atlas của bạn.
- `JWT_SECRET`: Khóa bí mật JWT bảo mật.
- `PAYOS_CLIENT_ID`, `PAYOS_API_KEY`, `PAYOS_CHECKSUM_KEY`: Thông tin cổng thanh toán PayOS.
- `MAIL_FROM`, `SMTP_...`: Thông tin gửi mail.

### Bước 2.4: Khởi chạy toàn bộ hệ thống bằng Docker Compose
```bash
docker compose up -d --build
```
Kiểm tra trạng thái các container:
```bash
docker compose ps
docker compose logs -f
```

---

## 3. Tích hợp Mô hình Giám sát Bot Detection AI

Hệ thống Frontend của SilkMoon đã được tích hợp sẵn SDK thu thập hành vi `bot-collector.js`:
- Telemetry được gửi ngầm tự động mỗi 5 giây (`POST /api/v1/telemetry`).
- Thu thập quỹ đạo di chuột, cử chỉ touch trên điện thoại, đặc trưng canvas fingerprint, cờ headless browser (Puppeteer, Playwright, Selenium).
- Khi kết nối với service `bot-detection-core`, toàn bộ lưu lượng bot cào dữ liệu hoặc gian lận click trên SilkMoon sẽ hiển thị trên dashboard giám sát thời gian thực.

---

## 4. Cấu hình Nginx & Chứng chỉ SSL HTTPS Miễn phí (Let's Encrypt)
Để website chạy giao thức an toàn `https://`:
```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d yourdomain.com -d www.yourdomain.com
```
Certbot sẽ tự động gia hạn chứng chỉ SSL mỗi 90 ngày.
