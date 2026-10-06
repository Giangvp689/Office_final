# Hướng Dẫn Triển Khai Chạy Online Với Tên Miền trg.id.vn & Firebase

Hệ thống quản lý văn bản đã được tích hợp hoàn chỉnh với **Google Firebase Cloud Firestore** (Realtime database online) và sẵn sàng để chạy với tên miền **`trg.id.vn`**.

Email quản trị Firebase của bạn: **`Giangvp689@gmail.com`**

---

## 1. Cơ Sở Dữ Liệu Firebase Firestore (Đã Cấu Hình Xong)
- **Firebase Project ID**: `documentai-7f924`
- **Database ID**: `(default)`
- **Cơ chế hoạt động**:
  - Dữ liệu được đồng bộ trực tuyến thời gian thực (**real-time `onSnapshot`**) lên đám mây Firebase Firestore.
  - Khi thêm, sửa, xóa văn bản đến/đi, hồ sơ, nhiệm vụ, nhân sự hoặc phân quyền, dữ liệu tự động lưu và đồng bộ đa thiết bị ngay lập tức.
  - Trong giao diện, bạn có thể mở **Trung Tâm CSDL & Tên Miền** (nút *Quản Lý CSDL* ở thanh công cụ trên cùng hoặc menu bên trái) để bấm **"Đồng Bộ Lên Firestore"** hoặc **"Tải Dữ Liệu Từ Firestore Về"** bất cứ lúc nào.

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

### Cách 2: Triển Khai Qua Cloud Run (Trên AI Studio) Hoặc Vercel

1. **Trên Google AI Studio**:
   - Ở góc trên cùng bên phải màn hình ứng dụng, bấm vào nút **Deploy** (Triển khai) > chọn **Cloud Run** hoặc **GitHub**.
2. **Cấu hình DNS cho tên miền `trg.id.vn`**:
   - Trong phần Custom Domain của Cloud Run hoặc dịch vụ hosting (Vercel/Cloudflare):
   - Thêm bản ghi **CNAME** trỏ `trg.id.vn` về đích được cung cấp.
3. Dự án được đóng gói đầy đủ cả frontend Vite React và backend Node/Express đã sẵn sàng hoạt động ở môi trường production.
