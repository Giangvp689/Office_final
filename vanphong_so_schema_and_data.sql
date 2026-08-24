-- =======================================================================
-- FILE: vanphong_so_schema_and_data.sql
-- CƠ SỞ DỮ LIỆU ĐẦY ĐỦ: HỆ THỐNG QUẢN LÝ VĂN BẢN & ĐIỀU HÀNH CÔNG VIỆC
-- Hỗ trợ nhập trực tiếp vào phpMyAdmin / MySQL / MariaDB (XAMPP)
-- =======================================================================

CREATE DATABASE IF NOT EXISTS `vanphong_so` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE `vanphong_so`;

-- 1. BẢNG PHÒNG BAN (departments)
DROP TABLE IF EXISTS `departments`;
CREATE TABLE `departments` (
  `id` varchar(50) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `manager_id` varchar(50) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `departments` (`id`, `code`, `name`, `description`, `manager_id`) VALUES
('dept-01', 'BGD', 'Ban Giám Đốc', 'Điều hành và chỉ đạo toàn diện hoạt động của đơn vị', 'usr-01'),
('dept-02', 'VP', 'Văn Phòng - Hành Chính', 'Quản lý văn thư, lưu trữ, tiếp nhận văn bản và hậu cần', 'usr-03'),
('dept-03', 'TCKT', 'Phòng Tài Chính - Kế Toán', 'Quản lý tài chính, ngân sách, quyết toán và giải ngân', 'usr-04'),
('dept-04', 'TCCB', 'Phòng Tổ Chức Cán Bộ', 'Quản lý nhân sự, thi đua khen thưởng, tuyển dụng và đào tạo', 'usr-05'),
('dept-05', 'KHTC', 'Phòng Kế Hoạch - Tổng Hợp', 'Xây dựng kế hoạch chiến lược, dự án và tổng hợp báo cáo định kỳ', 'usr-02'),
('dept-06', 'CNTT', 'Trung Tâm CNTT & Chuyển Đổi Số', 'Phát triển hạ tầng công nghệ, an toàn thông tin và ứng dụng số', 'usr-06');

-- 2. BẢNG CHỨC VỤ (positions)
DROP TABLE IF EXISTS `positions`;
CREATE TABLE `positions` (
  `id` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `level` int(11) DEFAULT 5,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `positions` (`id`, `name`, `level`) VALUES
('pos-01', 'Giám Đốc / Thủ Trưởng', 1),
('pos-02', 'Phó Giám Đốc', 2),
('pos-03', 'Chánh Văn Phòng / Trưởng Phòng', 3),
('pos-04', 'Phó Chánh Văn Phòng / Phó Trưởng Phòng', 4),
('pos-05', 'Văn Thư Lưu Trữ', 5),
('pos-06', 'Chuyên Viên Chính / Trưởng Nhóm', 5),
('pos-07', 'Chuyên Viên / Cán Bộ', 6);

-- 3. BẢNG NGƯỜI DÙNG / CÁN BỘ (users)
DROP TABLE IF EXISTS `users`;
CREATE TABLE `users` (
  `id` varchar(50) NOT NULL,
  `full_name` varchar(255) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(50) DEFAULT NULL,
  `avatar` text,
  `department` varchar(255) DEFAULT NULL,
  `department_id` varchar(50) DEFAULT NULL,
  `position` varchar(255) DEFAULT NULL,
  `position_id` varchar(50) DEFAULT NULL,
  `role` enum('LEADER','CLERK','STAFF','ADMIN') NOT NULL DEFAULT 'STAFF',
  `status` enum('ACTIVE','INACTIVE') NOT NULL DEFAULT 'ACTIVE',
  `join_date` date DEFAULT NULL,
  `bio` text,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email_unique` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `users` (`id`, `full_name`, `email`, `phone`, `avatar`, `department`, `department_id`, `position`, `position_id`, `role`, `status`, `join_date`, `bio`) VALUES
('usr-01', 'Nguyễn Văn Hùng', 'hung.nv@donvi.gov.vn', '0912.345.678', 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80', 'Ban Giám Đốc', 'dept-01', 'Giám Đốc / Thủ Trưởng', 'pos-01', 'LEADER', 'ACTIVE', '2018-03-15', 'Thủ trưởng cơ quan, phụ trách chỉ đạo điều hành chung'),
('usr-02', 'Trần Thị Mai Phương', 'phuong.ttm@donvi.gov.vn', '0988.765.432', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80', 'Phòng Kế Hoạch - Tổng Hợp', 'dept-05', 'Trưởng Phòng', 'pos-03', 'LEADER', 'ACTIVE', '2019-06-01', 'Trưởng phòng Kế hoạch - Tổng hợp, điều phối dự án chiến lược'),
('usr-03', 'Lê Thanh Bình', 'binh.lt@donvi.gov.vn', '0903.112.233', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'Văn Phòng - Hành Chính', 'dept-02', 'Văn Thư Lưu Trữ', 'pos-05', 'CLERK', 'ACTIVE', '2020-01-10', 'Văn thư cơ quan, tiếp nhận và phát hành văn bản đi/đến'),
('usr-04', 'Phạm Minh Đức', 'duc.pm@donvi.gov.vn', '0977.889.900', 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150&auto=format&fit=crop&q=80', 'Phòng Tài Chính - Kế Toán', 'dept-03', 'Trưởng Phòng', 'pos-03', 'STAFF', 'ACTIVE', '2020-08-20', 'Trưởng phòng Tài chính - Kế toán, duyệt hồ sơ thanh quyết toán'),
('usr-05', 'Hoàng Bích Ngọc', 'ngoc.hb@donvi.gov.vn', '0934.556.778', 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=150&auto=format&fit=crop&q=80', 'Phòng Tổ Chức Cán Bộ', 'dept-04', 'Trưởng Phòng', 'pos-03', 'STAFF', 'ACTIVE', '2021-02-15', 'Trưởng phòng Tổ chức Cán bộ, quản lý hồ sơ nhân sự'),
('usr-06', 'Đặng Quốc Anh', 'anh.dq@donvi.gov.vn', '0919.223.344', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', 'Trung Tâm CNTT & Chuyển Đổi Số', 'dept-06', 'Quản Trị Viên', 'pos-06', 'ADMIN', 'ACTIVE', '2021-09-01', 'Quản trị viên hệ thống & phụ trách Chuyển đổi số'),
('usr-07', 'Vũ Hải Yến', 'yen.vh@donvi.gov.vn', '0945.678.901', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80', 'Phòng Kế Hoạch - Tổng Hợp', 'dept-05', 'Chuyên Viên', 'pos-07', 'STAFF', 'ACTIVE', '2022-04-12', 'Chuyên viên tổng hợp báo cáo & theo dõi tiến độ'),
('usr-08', 'Ngô Tuấn Kiệt', 'kiet.nt@donvi.gov.vn', '0962.113.355', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', 'Trung Tâm CNTT & Chuyển Đổi Số', 'dept-06', 'Chuyên Viên Kỹ Thuật', 'pos-07', 'STAFF', 'ACTIVE', '2023-01-05', 'Chuyên viên kỹ thuật hạ tầng & phần mềm');

-- 4. BẢNG HỒ SƠ VỤ VIỆC (dossiers)
DROP TABLE IF EXISTS `dossiers`;
CREATE TABLE `dossiers` (
  `id` varchar(50) NOT NULL,
  `code` varchar(100) NOT NULL,
  `title` varchar(500) NOT NULL,
  `department` varchar(255) DEFAULT NULL,
  `department_id` varchar(50) DEFAULT NULL,
  `leader_id` varchar(50) DEFAULT NULL,
  `manager_id` varchar(50) DEFAULT NULL,
  `status` enum('OPEN','IN_PROGRESS','CLOSED','ARCHIVED') NOT NULL DEFAULT 'IN_PROGRESS',
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  `description` text,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `dossier_code_unique` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `dossiers` (`id`, `code`, `title`, `department`, `department_id`, `leader_id`, `manager_id`, `status`, `start_date`, `end_date`, `description`, `created_at`, `updated_at`) VALUES
('dos-01', 'HS-2025-CDS-01', 'Hồ sơ Dự án Chuyển đổi số và Nâng cấp Hạ tầng CNTT năm 2025', 'Trung Tâm CNTT & Chuyển Đổi Số', 'dept-06', 'usr-06', 'usr-06', 'IN_PROGRESS', '2025-01-10', '2025-12-30', 'Toàn bộ hồ sơ đề án, văn bản chỉ đạo, hợp đồng và tiến độ triển khai Chuyển đổi số toàn cơ quan.', '2025-01-10 08:00:00', '2025-08-20 14:30:00'),
('dos-02', 'HS-2025-TCCB-02', 'Hồ sơ Kế hoạch Tuyển dụng & Đào tạo Nâng cao Năng lực Cán bộ 2025', 'Phòng Tổ Chức Cán Bộ', 'dept-04', 'usr-05', 'usr-05', 'IN_PROGRESS', '2025-02-01', '2025-09-30', 'Hồ sơ tuyển dụng 15 chuyên viên và chương trình tập huấn quản lý hồ sơ điện tử.', '2025-02-01 09:00:00', '2025-08-18 10:15:00'),
('dos-03', 'HS-2025-TCKT-03', 'Hồ sơ Quyết toán Ngân sách Quý I & Quý II năm 2025', 'Phòng Tài Chính - Kế Toán', 'dept-03', 'usr-04', 'usr-04', 'CLOSED', '2025-04-01', '2025-07-15', 'Tổng hợp chứng từ giải ngân, báo cáo tài chính và biên bản kiểm toán độc lập.', '2025-04-01 08:30:00', '2025-07-15 16:45:00'),
('dos-04', 'HS-2025-VP-04', 'Hồ sơ Chuẩn bị Hội nghị Tổng kết Công tác 6 tháng đầu năm', 'Văn Phòng - Hành Chính', 'dept-02', 'usr-03', 'usr-03', 'CLOSED', '2025-06-01', '2025-07-05', 'Kế hoạch tổ chức, danh sách khách mời, bài phát biểu và tài liệu hội nghị tổng kết.', '2025-06-01 08:00:00', '2025-07-05 17:00:00');

-- 5. BẢNG VĂN BẢN ĐẾN (incoming_documents)
DROP TABLE IF EXISTS `incoming_documents`;
CREATE TABLE `incoming_documents` (
  `id` varchar(50) NOT NULL,
  `document_number` varchar(100) NOT NULL,
  `official_number` varchar(100) DEFAULT NULL,
  `received_date` date NOT NULL,
  `issue_date` date NOT NULL,
  `issuing_authority` varchar(255) NOT NULL,
  `summary` text NOT NULL,
  `doc_type` varchar(100) DEFAULT 'Công văn',
  `urgency` enum('THUONG','KHAN','THUONG_KHAN','HOA_TOC') NOT NULL DEFAULT 'THUONG',
  `security_level` enum('THUONG','MAT','TOI_MAT','TUYET_MAT') NOT NULL DEFAULT 'THUONG',
  `assignee_id` varchar(50) DEFAULT NULL,
  `co_assignee_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `due_date` date DEFAULT NULL,
  `status` enum('PENDING_ASSIGN','PROCESSING','PROCESSED','OVERDUE','REJECTED') NOT NULL DEFAULT 'PROCESSING',
  `result_summary` text,
  `dossier_id` varchar(50) DEFAULT NULL,
  `linked_task_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `created_by_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_incoming_dossier` (`dossier_id`),
  CONSTRAINT `fk_incoming_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `incoming_documents` (`id`, `document_number`, `official_number`, `received_date`, `issue_date`, `issuing_authority`, `summary`, `doc_type`, `urgency`, `security_level`, `assignee_id`, `co_assignee_ids`, `due_date`, `status`, `result_summary`, `dossier_id`, `linked_task_ids`, `created_by_id`, `created_at`, `updated_at`) VALUES
('vbd-01', '142/UBND-VP', '289/QĐ-UBND', '2025-08-15', '2025-08-14', 'Ủy Ban Nhân Dân Tỉnh', 'V/v Phê duyệt Đề án Chuyển đổi số giai đoạn 2025-2030 và giao nhiệm vụ triển khai thí điểm tại các đơn vị trực thuộc.', 'Quyết định', 'KHAN', 'THUONG', 'usr-06', '[\"usr-02\", \"usr-07\"]', '2025-08-30', 'PROCESSING', 'Đã lập kế hoạch chi tiết, đang hoàn thiện dự toán thiết bị CNTT.', 'dos-01', '[\"task-01\", \"task-02\"]', 'usr-03', '2025-08-15 09:15:00', '2025-08-20 10:00:00'),
('vbd-02', '158/VP-STTTT', '105/CV-STTTT', '2025-08-18', '2025-08-17', 'Sở Thông Tin và Truyền Thông', 'Hướng dẫn bảo đảm an toàn thông tin mạng và ứng phó sự cố máy chủ quý III năm 2025.', 'Công văn', 'HOA_TOC', 'MAT', 'usr-06', '[\"usr-08\"]', '2025-08-25', 'PROCESSING', 'Đã kiểm tra tường lửa hệ thống, rà soát lỗ hổng bảo mật 10 máy chủ cơ sở dữ liệu.', 'dos-01', '[\"task-03\"]', 'usr-03', '2025-08-18 10:05:00', '2025-08-21 15:00:00'),
('vbd-03', '165/VP-SNV', '562/TB-SNV', '2025-08-19', '2025-08-18', 'Sở Nội Vụ', 'Thông báo về chỉ tiêu thi đua, khen thưởng và kế hoạch đánh giá xếp loại cán bộ công chức viên chức cuối năm.', 'Thông báo', 'THUONG', 'THUONG', 'usr-05', '[\"usr-01\", \"usr-07\"]', '2025-09-10', 'PROCESSING', 'Phòng TCCB đang soạn thảo biểu mẫu đánh giá gửi các phòng ban.', 'dos-02', '[\"task-04\"]', 'usr-03', '2025-08-19 14:30:00', '2025-08-20 08:00:00'),
('vbd-04', '170/VP-STC', '890/CV-STC', '2025-08-21', '2025-08-20', 'Sở Tài Chính', 'Yêu cầu rà soát, báo cáo tiến độ giải ngân vốn đầu tư công và dự toán ngân sách chi thường xuyên 8 tháng đầu năm.', 'Công văn', 'THUONG_KHAN', 'THUONG', 'usr-04', '[\"usr-02\"]', '2025-08-26', 'PROCESSING', 'Đang tổng hợp số liệu kế toán chi tiết từng chương trình.', 'dos-03', '[\"task-05\"]', 'usr-03', '2025-08-21 09:00:00', '2025-08-22 16:00:00'),
('vbd-05', '178/VP-UBND', '44/CT-UBND', '2025-08-22', '2025-08-22', 'Ủy Ban Nhân Dân Tỉnh', 'Chỉ thị về việc tăng cường kỷ luật kỷ cương hành chính và văn hóa công sở tại các cơ quan, đơn vị.', 'Chỉ thị', 'THUONG', 'THUONG', 'usr-03', '[\"usr-05\"]', '2025-09-05', 'PENDING_ASSIGN', 'Chờ Giám đốc phê duyệt kế hoạch phổ biến văn bản.', 'dos-04', '[]', 'usr-03', '2025-08-22 11:00:00', '2025-08-22 11:00:00');

-- 6. BẢNG VĂN BẢN ĐI (outgoing_documents)
DROP TABLE IF EXISTS `outgoing_documents`;
CREATE TABLE `outgoing_documents` (
  `id` varchar(50) NOT NULL,
  `document_number` varchar(100) NOT NULL,
  `release_date` date NOT NULL,
  `doc_type` varchar(100) DEFAULT 'Công văn',
  `recipient` varchar(255) NOT NULL,
  `summary` text NOT NULL,
  `drafter_id` varchar(50) NOT NULL,
  `signer_id` varchar(50) NOT NULL,
  `status` enum('DRAFT','PENDING_APPROVAL','APPROVED','SIGNED','ISSUED','SENT','CANCELLED') NOT NULL DEFAULT 'DRAFT',
  `dossier_id` varchar(50) DEFAULT NULL,
  `reply_to_doc_id` varchar(50) DEFAULT NULL,
  `created_by_id` varchar(50) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_outgoing_dossier` (`dossier_id`),
  CONSTRAINT `fk_outgoing_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `outgoing_documents` (`id`, `document_number`, `release_date`, `doc_type`, `recipient`, `summary`, `drafter_id`, `signer_id`, `status`, `dossier_id`, `reply_to_doc_id`, `created_by_id`, `created_at`, `updated_at`) VALUES
('vbdi-01', '89/TTr-DV', '2025-08-21', 'Tờ trình', 'Ủy Ban Nhân Dân Tỉnh / Sở Tài Chính', 'Tờ trình xin phê duyệt dự toán kinh phí mua sắm thiết bị an toàn bảo mật mạng năm 2025.', 'usr-06', 'usr-01', 'SIGNED', 'dos-01', 'vbd-02', 'usr-06', '2025-08-20 16:00:00', '2025-08-21 15:30:00'),
('vbdi-02', '92/BC-DV', '2025-08-22', 'Báo cáo', 'Sở Kế Hoạch và Đầu Tư', 'Báo cáo tình hình thực hiện kế hoạch phát triển kinh tế - xã hội và đầu tư công tháng 8/2025.', 'usr-07', 'usr-02', 'ISSUED', 'dos-01', 'vbd-01', 'usr-07', '2025-08-21 10:00:00', '2025-08-22 14:20:00'),
('vbdi-03', '95/TB-DV', '2025-08-23', 'Thông báo', 'Các Phòng, Ban và Toàn thể Cán bộ nhân viên', 'Thông báo lịch nghỉ Lễ Quốc khánh 2/9 và phân công trực cơ quan, đảm bảo an toàn an ninh.', 'usr-03', 'usr-01', 'SENT', 'dos-04', NULL, 'usr-03', '2025-08-23 08:30:00', '2025-08-23 11:00:00'),
('vbdi-04', 'DTh-98/CV-DV', '2025-08-24', 'Công văn', 'Sở Tài Chính', 'Công văn giải trình số liệu quyết toán chi thường xuyên và phân bổ ngân sách quý III.', 'usr-04', 'usr-01', 'DRAFT', 'dos-03', 'vbd-04', 'usr-04', '2025-08-23 14:00:00', '2025-08-23 14:00:00');

-- 7. BẢNG CÔNG VIỆC / NHIỆM VỤ (tasks)
DROP TABLE IF EXISTS `tasks`;
CREATE TABLE `tasks` (
  `id` varchar(50) NOT NULL,
  `code` varchar(100) NOT NULL,
  `title` varchar(500) NOT NULL,
  `description` text,
  `dossier_id` varchar(50) DEFAULT NULL,
  `incoming_doc_id` varchar(50) DEFAULT NULL,
  `linked_doc_id` varchar(50) DEFAULT NULL,
  `doc_type_relation` enum('INCOMING','OUTGOING') DEFAULT NULL,
  `creator_id` varchar(50) DEFAULT NULL,
  `created_by_id` varchar(50) DEFAULT NULL,
  `assignee_id` varchar(50) NOT NULL,
  `co_assignee_ids` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `priority` enum('LOW','MEDIUM','HIGH','URGENT') NOT NULL DEFAULT 'MEDIUM',
  `start_date` date NOT NULL,
  `due_date` date NOT NULL,
  `progress` int(11) NOT NULL DEFAULT 0,
  `status` enum('TODO','IN_PROGRESS','WAITING_APPROVAL','COMPLETED','OVERDUE','CANCELLED') NOT NULL DEFAULT 'IN_PROGRESS',
  `completed_date` date DEFAULT NULL,
  `result_notes` text,
  `sub_tasks` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `comments` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  `remind_days_before` int(11) DEFAULT 1,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `fk_task_dossier` (`dossier_id`),
  CONSTRAINT `fk_task_dossier` FOREIGN KEY (`dossier_id`) REFERENCES `dossiers` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `tasks` (`id`, `code`, `title`, `description`, `dossier_id`, `incoming_doc_id`, `linked_doc_id`, `doc_type_relation`, `creator_id`, `created_by_id`, `assignee_id`, `co_assignee_ids`, `priority`, `start_date`, `due_date`, `progress`, `status`, `completed_date`, `result_notes`, `sub_tasks`, `comments`, `remind_days_before`, `created_at`, `updated_at`) VALUES
('task-01', 'CV-2025-01', 'Xây dựng Đề án Chi tiết Nâng cấp Hạ tầng CNTT năm 2025', 'Căn cứ Quyết định 289/QĐ-UBND, lập đề án chi tiết gồm: khảo sát hiện trạng, phân tích yêu cầu kỹ thuật, lập dự toán chi tiết và kế hoạch đấu thầu.', 'dos-01', 'vbd-01', 'vbd-01', 'INCOMING', 'usr-01', 'usr-01', 'usr-06', '[\"usr-07\", \"usr-08\"]', 'HIGH', '2025-08-16', '2025-08-28', 75, 'IN_PROGRESS', NULL, 'Đã hoàn thành khảo sát 100% phòng ban và bản dự thảo đề cương sơ bộ.', '[{\"id\":\"sub-1\",\"title\":\"Khảo sát hiện trạng máy tính và mạng LAN\",\"completed\":true},{\"id\":\"sub-2\",\"title\":\"Lập bảng cấu hình kỹ thuật máy chủ\",\"completed\":true},{\"id\":\"sub-3\",\"title\":\"Xin báo giá từ 3 nhà cung cấp\",\"completed\":true},{\"id\":\"sub-4\",\"title\":\"Hoàn thiện thuyết minh dự án và trình duyệt\",\"completed\":false}]', '[{\"id\":\"cm-1\",\"userId\":\"usr-01\",\"userName\":\"Nguyễn Văn Hùng\",\"userAvatar\":\"https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80\",\"content\":\"Yêu cầu phòng CNTT đẩy nhanh tiến độ để kịp phiên họp Ban Giám đốc vào thứ Sáu tuần tới.\",\"createdAt\":\"2025-08-18T10:00:00.000Z\"},{\"id\":\"cm-2\",\"userId\":\"usr-06\",\"userName\":\"Đặng Quốc Anh\",\"userAvatar\":\"https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80\",\"content\":\"Dạ báo cáo Thủ trưởng, đội kỹ thuật đã gom xong báo giá và đang viết thuyết minh hoàn chỉnh.\",\"createdAt\":\"2025-08-18T15:30:00.000Z\"}]', 2, '2025-08-16 08:30:00', '2025-08-22 09:15:00'),
('task-02', 'CV-2025-02', 'Tổng hợp Báo cáo Thẩm định Ngân sách Dự án Chuyển đổi số', 'Phối hợp với Phòng Tài chính rà soát danh mục thiết bị, khớp định mức chi tiêu công và hoàn thiện báo cáo thẩm định kinh phí.', 'dos-01', 'vbd-01', 'vbd-01', 'INCOMING', 'usr-01', 'usr-01', 'usr-04', '[\"usr-06\"]', 'MEDIUM', '2025-08-17', '2025-08-27', 90, 'WAITING_APPROVAL', NULL, 'Đã hoàn tất báo cáo thẩm định dự toán 1.85 tỷ đồng, đang chờ Giám đốc ký duyệt.', '[{\"id\":\"sub-21\",\"title\":\"Đối chiếu đơn giá thiết bị\",\"completed\":true},{\"id\":\"sub-22\",\"title\":\"Kiểm tra nguồn vốn bố trí ngân sách 2025\",\"completed\":true},{\"id\":\"sub-23\",\"title\":\"Dự thảo biên bản thẩm định\",\"completed\":true}]', '[]', 1, '2025-08-17 09:00:00', '2025-08-22 16:00:00'),
('task-03', 'CV-2025-03', 'Rà soát lỗ hổng bảo mật & Sao lưu dự phòng hệ thống máy chủ', 'Thực hiện kiểm tra an ninh mạng theo Công văn khẩn 105/CV-STTTT, cập nhật bản vá bảo mật và thực hiện full backup cơ sở dữ liệu.', 'dos-01', 'vbd-02', 'vbd-02', 'INCOMING', 'usr-02', 'usr-02', 'usr-08', '[\"usr-06\"]', 'URGENT', '2025-08-19', '2025-08-24', 60, 'IN_PROGRESS', NULL, 'Đã hoàn thành sao lưu CSDL tại máy chủ phụ, đang quét mã độc trên cổng thông tin.', '[{\"id\":\"sub-31\",\"title\":\"Sao lưu CSDL sang ổ cứng NAS\",\"completed\":true},{\"id\":\"sub-32\",\"title\":\"Cập nhật bản vá Linux Kernel\",\"completed\":true},{\"id\":\"sub-33\",\"title\":\"Kiểm thử khôi phục thảm họa\",\"completed\":false}]', '[]', 1, '2025-08-19 08:00:00', '2025-08-22 17:30:00'),
('task-04', 'CV-2025-04', 'Dự thảo Hướng dẫn Đánh giá Xếp loại Cán bộ năm 2025', 'Biên soạn hướng dẫn tiêu chí chấm điểm, khung thi đua khen thưởng theo văn bản mới nhất của Sở Nội Vụ.', 'dos-02', 'vbd-03', 'vbd-03', 'INCOMING', 'usr-01', 'usr-01', 'usr-05', '[\"usr-07\"]', 'MEDIUM', '2025-08-20', '2025-09-05', 40, 'IN_PROGRESS', NULL, 'Đã có khung tiêu chí cơ bản, đang lấy ý kiến các Trưởng phòng ban.', '[{\"id\":\"sub-41\",\"title\":\"Nghiên cứu văn bản hướng dẫn của Sở\",\"completed\":true},{\"id\":\"sub-42\",\"title\":\"Soạn biểu mẫu tự chấm điểm\",\"completed\":true},{\"id\":\"sub-43\",\"title\":\"Lấy ý kiến góp ý của Công đoàn\",\"completed\":false}]', '[]', 3, '2025-08-20 10:00:00', '2025-08-21 11:00:00'),
('task-05', 'CV-2025-05', 'Tổng hợp Báo cáo Giải ngân Ngân sách 8 Tháng Đầu Năm', 'Khẩn trương lập bảng số liệu chi tiết giải ngân từng nguồn vốn để báo cáo Sở Tài Chính trước ngày 26/08.', 'dos-03', 'vbd-04', 'vbd-04', 'INCOMING', 'usr-01', 'usr-01', 'usr-04', '[\"usr-02\", \"usr-07\"]', 'URGENT', '2025-08-21', '2025-08-25', 85, 'IN_PROGRESS', NULL, 'Số liệu đã khớp với Kho bạc Nhà nước, đang soạn công văn giải trình.', '[{\"id\":\"sub-51\",\"title\":\"Đối chiếu số dư Kho bạc\",\"completed\":true},{\"id\":\"sub-52\",\"title\":\"Lập bảng phụ lục giải ngân các dự án\",\"completed\":true},{\"id\":\"sub-53\",\"title\":\"Trình Lãnh đạo ký văn bản gửi Sở\",\"completed\":false}]', '[]', 1, '2025-08-21 09:30:00', '2025-08-23 10:00:00'),
('task-06', 'CV-2025-06', 'Chuẩn bị Lịch Phân Công Trực và Đảm bảo An ninh Lễ 2/9', 'Lập danh sách cán bộ trực ca, số điện thoại liên lạc khẩn cấp, phối hợp lực lượng bảo vệ và phòng cháy chữa cháy.', 'dos-04', NULL, 'vbdi-03', 'OUTGOING', 'usr-01', 'usr-01', 'usr-03', '[\"usr-08\"]', 'HIGH', '2025-08-22', '2025-08-26', 100, 'COMPLETED', '2025-08-23', 'Đã ban hành Thông báo 95/TB-DV và niêm yết lịch trực tại bảng tin cơ quan.', '[{\"id\":\"sub-61\",\"title\":\"Lập danh sách cán bộ trực Lễ\",\"completed\":true},{\"id\":\"sub-62\",\"title\":\"Kiểm tra bình cứu hỏa và camera\",\"completed\":true},{\"id\":\"sub-63\",\"title\":\"Gửi thông báo toàn cơ quan\",\"completed\":true}]', '[]', 2, '2025-08-22 08:00:00', '2025-08-23 11:30:00'),
('task-07', 'CV-2025-07', 'Soát xét Hợp đồng Bảo trì Phần mềm Quản trị Nhân sự', 'Kiểm tra các điều khoản SLA, phạm vi bảo hành và thời gian hỗ trợ kỹ thuật trước khi gia hạn hợp đồng năm 2025-2026.', 'dos-02', NULL, NULL, NULL, 'usr-05', 'usr-05', 'usr-07', '[\"usr-06\"]', 'LOW', '2025-08-10', '2025-08-20', 50, 'OVERDUE', NULL, 'Đang đợi đối tác phản hồi về điều khoản nâng cấp tính năng tự động sao lưu.', '[{\"id\":\"sub-71\",\"title\":\"Đọc lại hợp đồng cũ\",\"completed\":true},{\"id\":\"sub-72\",\"title\":\"Gửi email đề xuất sửa đổi SLA\",\"completed\":true},{\"id\":\"sub-73\",\"title\":\"Ký phụ lục gia hạn\",\"completed\":false}]', '[]', 1, '2025-08-10 09:00:00', '2025-08-21 09:00:00');

-- 8. BẢNG TỆP ĐÍNH KÈM (attachments)
DROP TABLE IF EXISTS `attachments`;
CREATE TABLE `attachments` (
  `id` varchar(50) NOT NULL,
  `file_name` varchar(255) NOT NULL,
  `file_size` bigint(20) NOT NULL,
  `file_type` varchar(50) NOT NULL,
  `file_url` text NOT NULL,
  `category` enum('VAN_BAN_DEN','VAN_BAN_DI','CONG_VIEC','HO_SO','KHAC') NOT NULL,
  `related_id` varchar(50) DEFAULT NULL,
  `dossier_code` varchar(100) DEFAULT NULL,
  `dossier_id` varchar(50) DEFAULT NULL,
  `uploaded_by_id` varchar(50) NOT NULL,
  `uploaded_by_name` varchar(255) NOT NULL,
  `uploaded_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `tags` longtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `attachments` (`id`, `file_name`, `file_size`, `file_type`, `file_url`, `category`, `related_id`, `dossier_code`, `dossier_id`, `uploaded_by_id`, `uploaded_by_name`, `uploaded_at`, `tags`) VALUES
('att-01', 'QD_Phe_Duyet_Ke_Hoach_Chuyen_Doi_So_2025.pdf', 2450000, 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'VAN_BAN_DEN', 'vbd-01', 'HS-2025-CDS-01', 'dos-01', 'usr-03', 'Lê Thanh Bình', '2025-08-15 09:12:00', '[\"Văn bản đến\", \"Quyết định\", \"Chuyển đổi số\"]'),
('att-02', 'Cong_Van_Trien_Khai_Bao_Mat_2025.pdf', 1820000, 'pdf', 'https://www.w3.org/WAI/ER/tests/xhtml/testfiles/resources/pdf/dummy.pdf', 'VAN_BAN_DEN', 'vbd-02', 'HS-2025-CDS-01', 'dos-01', 'usr-03', 'Lê Thanh Bình', '2025-08-18 10:00:00', '[\"Hỏa tốc\", \"An toàn thông tin\"]'),
('att-03', 'Bao_Cao_Tien_Do_Tuan_33_KHTC.docx', 840000, 'docx', '#', 'CONG_VIEC', 'task-01', 'HS-2025-CDS-01', 'dos-01', 'usr-07', 'Vũ Hải Yến', '2025-08-20 11:20:00', '[\"Báo cáo\", \"Tiến độ\", \"KHTC\"]'),
('att-04', 'To_Trinh_Bo_Sung_Kinh_Phi_Trang_Thiet_Bi.pdf', 1250000, 'pdf', '#', 'VAN_BAN_DI', 'vbdi-01', 'HS-2025-CDS-01', 'dos-01', 'usr-06', 'Đặng Quốc Anh', '2025-08-21 14:40:00', '[\"Tờ trình\", \"Văn bản đi\", \"Kinh phí\"]');

-- 9. BẢNG LỊCH SỬ THAO TÁC / AUDIT LOGS (audit_logs)
DROP TABLE IF EXISTS `audit_logs`;
CREATE TABLE `audit_logs` (
  `id` varchar(50) NOT NULL,
  `timestamp` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `user_id` varchar(50) NOT NULL,
  `user_name` varchar(255) NOT NULL,
  `user_avatar` text,
  `action` enum('CREATE','UPDATE','DELETE','STATUS_CHANGE','ASSIGN','UPLOAD_FILE','DOWNLOAD_FILE','EXPORT','LOGIN') NOT NULL,
  `entity_type` enum('INCOMING_DOC','OUTGOING_DOC','TASK','DOSSIER','USER','FILE','MASTER_DATA') NOT NULL,
  `entity_id` varchar(50) NOT NULL,
  `entity_title` varchar(500) NOT NULL,
  `details` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `audit_logs` (`id`, `timestamp`, `user_id`, `user_name`, `user_avatar`, `action`, `entity_type`, `entity_id`, `entity_title`, `details`) VALUES
('log-01', '2025-08-23 11:30:00', 'usr-03', 'Lê Thanh Bình', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'STATUS_CHANGE', 'TASK', 'task-06', 'Chuẩn bị Lịch Phân Công Trực và Đảm bảo An ninh Lễ 2/9', 'Đã chuyển trạng thái công việc sang [Hoàn thành] (Tiến độ: 100%)'),
('log-02', '2025-08-23 08:30:00', 'usr-03', 'Lê Thanh Bình', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'CREATE', 'OUTGOING_DOC', 'vbdi-03', 'Thông báo 95/TB-DV - Nghỉ lễ Quốc khánh 2/9', 'Đã tạo và ban hành văn bản đi số 95/TB-DV liên kết với Hồ sơ HS-2025-VP-04'),
('log-03', '2025-08-22 17:30:00', 'usr-08', 'Ngô Tuấn Kiệt', 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=150&auto=format&fit=crop&q=80', 'UPDATE', 'TASK', 'task-03', 'Rà soát lỗ hổng bảo mật & Sao lưu dự phòng hệ thống máy chủ', 'Cập nhật tiến độ từ 30% lên 60%, ghi chú: Hoàn thành sao lưu CSDL phụ'),
('log-04', '2025-08-21 09:00:00', 'usr-03', 'Lê Thanh Bình', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80', 'CREATE', 'INCOMING_DOC', 'vbd-04', 'Công văn 890/CV-STC từ Sở Tài Chính', 'Tiếp nhận văn bản đến số 170/VP-STC, phân công Đ/c Phạm Minh Đức xử lý'),
('log-05', '2025-08-20 16:00:00', 'usr-06', 'Đặng Quốc Anh', 'https://images.unsplash.com/photo-1522075469751-3a6694fb2f61?w=150&auto=format&fit=crop&q=80', 'UPLOAD_FILE', 'FILE', 'att-04', 'To_Trinh_Bo_Sung_Kinh_Phi_Trang_Thiet_Bi.pdf', 'Tải lên tài liệu đính kèm cho Tờ trình 89/TTr-DV (Mã hồ sơ: HS-2025-CDS-01)');

-- 10. BẢNG THÔNG BÁO HỆ THỐNG (notifications)
DROP TABLE IF EXISTS `notifications`;
CREATE TABLE `notifications` (
  `id` varchar(50) NOT NULL,
  `user_id` varchar(50) NOT NULL,
  `title` varchar(255) NOT NULL,
  `message` text NOT NULL,
  `type` enum('DEADLINE_TODAY','OVERDUE','DOC_ASSIGNED','TASK_ASSIGNED','STATUS_UPDATE','GENERAL') NOT NULL,
  `link_type` enum('INCOMING_DOC','OUTGOING_DOC','TASK','DOSSIER') DEFAULT NULL,
  `target_id` varchar(50) DEFAULT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

INSERT INTO `notifications` (`id`, `user_id`, `title`, `message`, `type`, `link_type`, `target_id`, `is_read`, `created_at`) VALUES
('notif-01', 'usr-08', 'Nhiệm vụ sắp đến hạn xử lý', 'Công việc \"Rà soát lỗ hổng bảo mật & Sao lưu dự phòng máy chủ\" có hạn chót vào ngày 24/08/2025.', 'DEADLINE_TODAY', 'TASK', 'task-03', 0, '2025-08-23 07:30:00'),
('notif-02', 'usr-04', 'Công văn khẩn yêu cầu báo cáo', 'Bạn được giao xử lý Công văn 890/CV-STC về tiến độ giải ngân ngân sách, hạn xử lý ngày 25/08.', 'DOC_ASSIGNED', 'INCOMING_DOC', 'vbd-04', 0, '2025-08-22 08:00:00'),
('notif-03', 'usr-07', 'Cảnh báo: Công việc đã quá hạn', 'Công việc \"Soát xét Hợp đồng Bảo trì Phần mềm\" đã quá hạn từ ngày 20/08/2025. Vui lòng cập nhật tiến độ.', 'OVERDUE', 'TASK', 'task-07', 1, '2025-08-21 09:00:00');
