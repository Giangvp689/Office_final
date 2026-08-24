# HƯỚNG DẪN KẾT NỐI VÀ QUẢN LÝ DATABASE MYSQL (XAMPP)

Hệ thống Quản Lý Văn Bản & Điều Hành Công Việc đã chuẩn bị sẵn file dump SQL hoàn chỉnh (`vanphong_so_schema_and_data.sql`) chứa toàn bộ bảng và dữ liệu mẫu y hệt trên giao diện web.

---

## 1. KHỞI ĐỘNG XAMPP & TẠO CƠ SỞ DỮ LIỆU
1. Mở **XAMPP Control Panel**, bấm **Start** tại **Apache** và **MySQL**.
2. Mở trình duyệt truy cập: `http://localhost/phpmyadmin`
3. Nhấn tab **Import** (Nhập) ở menu trên cùng.
4. Chọn file `vanphong_so_schema_and_data.sql` nằm ở thư mục gốc của dự án này -> Bấm **Import** (Nhập) ở cuối trang.
5. phpMyAdmin sẽ tự động tạo Database `vanphong_so` với 10 bảng dữ liệu hoàn chỉnh.

---

## 2. DANH SÁCH 10 BẢNG DỮ LIỆU ĐÃ TẠO

| STT | Tên Bảng | Ý nghĩa chức năng |
|---|---|---|
| 1 | `departments` | Danh mục phòng ban cơ quan |
| 2 | `positions` | Danh mục chức vụ (Giám đốc, Trưởng phòng, Chuyên viên,...) |
| 3 | `users` | Danh sách cán bộ công chức, email, phân quyền role |
| 4 | `dossiers` | Danh mục Hồ sơ vụ việc (HS-2025-CDS-01,...) |
| 5 | `incoming_documents` | Sổ đăng ký Văn bản đến, số ký hiệu, nơi gửi, trích yếu |
| 6 | `outgoing_documents` | Sổ đăng ký Văn bản đi, nơi nhận, người duyệt, người ký |
| 7 | `tasks` | Danh mục Công việc / Nhiệm vụ, tiến độ %, hạn xử lý |
| 8 | `attachments` | Quản lý tệp đính kèm, đường dẫn tài liệu |
| 9 | `audit_logs` | Nhật ký thao tác người dùng (Thêm, sửa, xóa, duyệt) |
| 10 | `notifications` | Thông báo hệ thống & cảnh báo nhắc hạn công việc |

---

## 3. CÁC CÂU LỆNH SQL MẪU ĐỂ THÊM, SỬA, XÓA DỮ LIỆU

### A. Thao tác với Văn Bản Đến (`incoming_documents`):
```sql
-- 1. Thêm một văn bản đến mới:
INSERT INTO incoming_documents (
  id, document_number, official_number, received_date, issue_date, 
  issuing_authority, summary, doc_type, urgency, security_level, assignee_id, due_date, status, dossier_id
) VALUES (
  'vbd-06', '180/VP-UBND', '55/CT-UBND', '2025-08-25', '2025-08-24',
  'Ủy Ban Nhân Dân Tỉnh', 'V/v Đẩy mạnh dịch vụ công trực tuyến và thanh toán không dùng tiền mặt',
  'Chỉ thị', 'KHAN', 'THUONG', 'usr-06', '2025-09-05', 'PROCESSING', 'dos-01'
);

-- 2. Sửa thông tin trích yếu hoặc người phụ trách văn bản:
UPDATE incoming_documents 
SET summary = 'Cập nhật nội dung trích yếu mới', assignee_id = 'usr-02', due_date = '2025-09-10'
WHERE id = 'vbd-06';

-- 3. Xóa văn bản đến:
DELETE FROM incoming_documents WHERE id = 'vbd-06';
```

---

### B. Thao tác với Nhiệm Vụ / Công Việc (`tasks`):
```sql
-- 1. Giao một nhiệm vụ mới:
INSERT INTO tasks (
  id, code, title, description, dossier_id, incoming_doc_id, creator_id, assignee_id, priority, start_date, due_date, progress, status
) VALUES (
  'task-08', 'CV-2025-08', 'Xây dựng kế hoạch đào tạo chữ ký số', 
  'Tổ chức lớp tập huấn cho toàn bộ cán bộ văn phòng', 'dos-01', 'vbd-01',
  'usr-01', 'usr-06', 'HIGH', '2025-08-25', '2025-09-05', 0, 'IN_PROGRESS'
);

-- 2. Cập nhật tiến độ hoàn thành công việc:
UPDATE tasks 
SET progress = 100, status = 'COMPLETED', completed_date = '2025-09-02', result_notes = 'Đã tổ chức xong lớp tập huấn'
WHERE id = 'task-08';

-- 3. Xóa công việc:
DELETE FROM tasks WHERE id = 'task-08';
```

---

### C. Thao tác với Văn Bản Đi (`outgoing_documents`):
```sql
-- 1. Thêm dự thảo văn bản đi:
INSERT INTO outgoing_documents (
  id, document_number, release_date, doc_type, recipient, summary, drafter_id, signer_id, status, dossier_id
) VALUES (
  'vbdi-05', '99/BC-DV', '2025-08-26', 'Báo cáo', 'Sở Thông Tin và Truyền Thông',
  'Báo cáo kết quả triển khai thí điểm phần mềm số hóa hồ sơ', 'usr-06', 'usr-01', 'DRAFT', 'dos-01'
);

-- 2. Đổi trạng thái văn bản đi sang đã ký phát hành:
UPDATE outgoing_documents 
SET status = 'ISSUED', release_date = '2025-08-27'
WHERE id = 'vbdi-05';
```

---

### D. Thao tác với Hồ Sơ Vụ Việc (`dossiers`):
```sql
-- 1. Tạo hồ sơ vụ việc mới:
INSERT INTO dossiers (
  id, code, title, department, department_id, leader_id, manager_id, status, start_date, end_date, description
) VALUES (
  'dos-05', 'HS-2025-KHTC-05', 'Hồ sơ Xây dựng Kế hoạch Ngân sách Trung hạn 2026-2030',
  'Phòng Kế Hoạch - Tổng Hợp', 'dept-05', 'usr-02', 'usr-02', 'IN_PROGRESS', '2025-09-01', '2025-11-30', 'Kế hoạch phát triển 5 năm'
);

-- 2. Đóng hồ sơ khi hoàn tất:
UPDATE dossiers SET status = 'CLOSED' WHERE id = 'dos-05';
```

---

## 4. KẾT NỐI TỰ ĐỘNG NODE.JS VỚI MYSQL
Để ứng dụng Node.js kết nối trực tiếp vào MySQL khi chạy `npm run dev`:
1. Cài đặt driver: `npm install mysql2`
2. Cấu hình biến môi trường trong file `.env`:
   ```env
   DB_HOST=localhost
   DB_USER=root
   DB_PASSWORD=
   DB_NAME=vanphong_so
   DB_PORT=3306
   ```
3. XAMPP mặc định chạy MySQL trên port `3306`, user là `root` và mật khẩu để trống.
