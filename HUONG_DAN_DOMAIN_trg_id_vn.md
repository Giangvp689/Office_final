# Hướng Dẫn Triển Khai Chạy Online Với Tên Miền trg.id.vn & Firebase

Hệ thống quản lý văn bản đã được tích hợp hoàn chỉnh với **Google Firebase Cloud Firestore** (Realtime database online) và sẵn sàng để chạy với tên miền **`trg.id.vn`**.

Email quản trị Firebase của bạn: **`Giangvp689@gmail.com`**

---

## 1. Cơ Sở Dữ Liệu Firebase Firestore (Đã Cấu Hình Xong)
- **Database ID**: `ai-studio-officefinal-2091c447-bb64-4488-bc76-cc14e6260e8b`
- **Cơ chế hoạt động**:
  - Dữ liệu được đồng bộ trực tuyến thời gian thực (**real-time `onSnapshot`**) lên đám mây Firebase Firestore.
  - Khi thêm, sửa, xóa văn bản đến/đi, hồ sơ, nhiệm vụ, nhân sự hoặc phân quyền, dữ liệu tự động lưu và đồng bộ đa thiết bị ngay lập tức.
  - Trong giao diện, bạn có thể mở **Trung Tâm CSDL & Tên Miền** (nút *Quản Lý CSDL* ở thanh công cụ trên cùng hoặc menu bên trái) để bấm **"Đồng Bộ Toàn Bộ Dữ Liệu Lên Firestore"** bất cứ lúc nào.

---

## 2. Các Bước Cấu Hình Tên Miền `trg.id.vn` Chạy Online

Bạn có 2 lựa chọn để đưa dự án lên chạy trực tiếp với tên miền **`trg.id.vn`**:

### Cách 1: Sử dụng Firebase Hosting (Khuyên dùng - Miễn phí 100%, có sẵn SSL/HTTPS)

1. Truy cập vào [Firebase Console](https://console.firebase.google.com/) bằng email **Giangvp689@gmail.com**.
2. Chọn dự án của bạn (hoặc tạo Hosting site mới trong cùng tài khoản).
3. Vào mục **Build > Hosting**.
4. Nhấn nút **Add custom domain** (Thêm miền tùy chỉnh).
5. Nhập tên miền của bạn: `trg.id.vn` (hoặc `www.trg.id.vn`).
6. Firebase sẽ cung cấp cho bạn 2 thông tin bản ghi DNS:
   - **Loại bản ghi**: `A`
   - **Tên (Host/Name)**: `@`
   - **Giá trị (Points to / IP)**: 2 địa chỉ IP của Google (ví dụ `199.36.158.100`).
   *(Nếu là www thì tạo CNAME trỏ về domain Firebase)*.
7. Đăng nhập vào trang quản lý tên miền **`trg.id.vn`** (nơi bạn mua tên miền như iNET, PA Vietnam, Mat Bao, Cloudflare, v.v.):
   - Tạo bản ghi **A** trỏ về IP của Firebase đã cấp ở bước 6.
8. Sau vài phút, Firebase sẽ tự động cấp chứng chỉ bảo mật **SSL (HTTPS)** miễn phí và website sẽ hoạt động tại `https://trg.id.vn`.

---

## 3. Mô Hình Kết Nối MySQL Trên Máy Của Bạn Qua Cloudflare Tunnel (api.trg.id.vn)

Đây là mô hình tối ưu khi bạn muốn **Frontend chạy trên Vercel (`https://trg.id.vn`)**, nhưng **dữ liệu được lưu trực tiếp vào CSDL MySQL trên máy tính của bạn**, và **tuyệt đối không cần mở cổng MySQL 3306 ra Internet**:

```text
               INTERNET
                  │
        https://trg.id.vn (Vercel Frontend)
                  │
                  ▼ (Gọi API qua HTTPS)
        https://api.trg.id.vn
                  │
                  ▼
          Cloudflare Tunnel
                  │
                  ▼ (Chuyển tiếp nội bộ an toàn)
           Máy tính của bạn
         npm run dev (localhost:3000)
                  │
                  ▼ (Truy vấn SQL nội bộ)
          MySQL của bạn (localhost:3306)
```

### Các Bước Thực Hiện Cụ Thể:

#### Bước 1: Khởi động MySQL và Backend Node.js trên máy bạn
1. Bật MySQL trên máy bạn (qua XAMPP, Laragon, Docker hoặc dịch vụ Windows MySQL Service) tại cổng mặc định `3306`.
2. Mở Terminal / CMD tại thư mục dự án và chạy:
   ```bash
   npm run dev
   ```
   Backend Express sẽ chạy tại `http://localhost:3000`.

#### Bước 2: Thiết lập Cloudflare Tunnel trên máy bạn trỏ về localhost:3000
1. Truy cập [Cloudflare Zero Trust Dashboard](https://one.dash.cloudflare.com/) > chọn **Networks > Tunnels**.
2. Tạo Tunnel mới (hoặc dùng Tunnel sẵn có của tên miền `trg.id.vn`).
3. Trong tab **Public Hostname**, cấu hình:
   - **Subdomain**: `api`
   - **Domain**: `trg.id.vn`
   - **Path**: để trống
   - **Type**: `HTTP`
   - **URL**: `localhost:3000` (hoặc `127.0.0.1:3000`)
4. Hoặc chạy trực tiếp lệnh nhanh trên máy bạn:
   ```bash
   cloudflared tunnel --url http://localhost:3000
   ```
   *(Cloudflare sẽ tự động cấp chứng chỉ SSL HTTPS cho `api.trg.id.vn` và mã hóa toàn tuyến)*.

#### Bước 3: Cấu hình biến môi trường trên Vercel
1. Vào dự án của bạn trên [Vercel](https://vercel.com/) > chọn **Settings > Environment Variables**.
2. Thêm biến môi trường:
   - **Key**: `VITE_API_BASE_URL`
   - **Value**: `https://api.trg.id.vn`
3. Nhấn **Save** và bấm **Redeploy** lại phiên bản mới nhất trên Vercel.

#### Bước 4: Kiểm tra hoạt động thực tế
1. Từ điện thoại hoặc một máy tính khác, truy cập: `https://trg.id.vn`
2. Mở menu **Quản Lý CSDL** (hoặc bấm vào Trung tâm CSDL) > chọn tab **Cloudflare Tunnel (api.trg.id.vn)**.
3. Nhấn **"Kiểm Tra Kết Nối"**: hệ thống sẽ gửi ping qua `https://api.trg.id.vn/api/db-status` về máy tính bạn và thông báo thời gian phản hồi (ms) cùng số lượng bảng trong MySQL.
4. Bạn thử tạo một văn bản mới hoặc nhiệm vụ mới trên máy khách: bản ghi sẽ được lưu ngay lập tức vào MySQL trên máy tính của bạn!

