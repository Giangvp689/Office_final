export function generateLocalAssistantAnswer(query: string, context: any): string {
  const q = query.toLowerCase();

  if (q.includes('quá hạn') || q.includes('trễ hạn') || q.includes('overdue')) {
    const count = context?.overdueTasks?.length || 0;
    if (count === 0) {
      return `🎉 Hiện tại hệ thống ghi nhận **0 công việc bị quá hạn**! Toàn bộ các nhiệm vụ giao việc và văn bản chuyển xử lý đều đang bám sát tiến độ hoàn thành.`;
    }
    const list = context.overdueTasks.map((t: any) => `- **${t.code}**: ${t.title} (Hạn chót: ${t.dueDate})`).join('\n');
    return `⚠️ Báo cáo: Hiện có **${count} công việc quá hạn** cần chỉ đạo đôn đốc ngay:\n\n${list}\n\n👉 **Đề xuất giải pháp:** Cán bộ phụ trách cần gửi thông báo nhắc nhở khẩn hoặc tái phân công cho nhân sự rảnh việc hơn trong phòng ban.`;
  }

  if (q.includes('hỏa tốc') || q.includes('khẩn')) {
    const urgent = context?.urgentDocs || [];
    if (urgent.length === 0) {
      return `✅ Hiện không có văn bản đến nào ở mức **HỎA TỐC** hoặc **KHẨN** đang tồn đọng chưa xử lý.`;
    }
    const list = urgent.map((d: any) => `- **Số ${d.number}** [${d.urgency}]: ${d.summary}`).join('\n');
    return `🚨 **Cảnh báo:** Có **${urgent.length} văn bản hỏa tốc / khẩn** cần tập trung giải quyết:\n\n${list}\n\n📌 **Hành động đề xuất:** Đề nghị Lãnh đạo duyệt phân luồng thụ lý ngay để chuyển chuyên viên xử lý trong ngày.`;
  }

  if (q.includes('hồ sơ') || q.includes('dossier')) {
    const count = context?.dossiers?.length || 0;
    return `📁 **Báo cáo Hồ sơ vụ việc:**\n- Tổng số hồ sơ đang lưu trữ: **${count} hồ sơ**\n- Các hồ sơ đang mở bao gồm: Hồ sơ tài chính, Hồ sơ nhân sự quy hoạch, và Hồ sơ theo dõi các dự án chuyển đổi số.\n- Bạn có thể vào mục **"Quản Lý Hồ Sơ"** trên thanh menu để xem chi tiết danh mục tài liệu bên trong từng hồ sơ.`;
  }

  if (q.includes('tờ trình') || q.includes('nghị định 30') || q.includes('thể thức')) {
    return `📋 **Thể thức Tờ trình chuẩn theo Nghị định 30/2020/NĐ-CP gồm 8 thành phần chính:**\n\n1. **Quốc hiệu & Tiêu ngữ**: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM (Độc lập - Tự do - Hạnh phúc).\n2. **Tên cơ quan ban hành**: Đặt phía trên bên trái.\n3. **Số & Ký hiệu**: Ví dụ: *Số: .../TTr-TCCB*.\n4. **Địa danh & Ngày tháng năm**.\n5. **Tên loại & Trích yếu**: TỜ TRÌNH / Về việc xin phê duyệt...\n6. **Nội dung tờ trình** (3 phần: Sự cần thiết & Căn cứ pháp lý -> Nội dung đề xuất -> Kiến nghị phê duyệt).\n7. **Chức vụ, Chữ ký, Họ tên người đứng đầu**.\n8. **Nơi nhận**: Cơ quan cấp trên có thẩm quyền duyệt & Lưu VT.`;
  }

  // Generic fast response
  return `📊 **Tổng hợp thông tin điều hành:**\n- Tổng số văn bản đến: **${context?.totalIncoming || 0} văn bản**\n- Tổng số văn bản đi: **${context?.totalOutgoing || 0} văn bản**\n- Tổng số công việc giao xử lý: **${context?.totalTasks || 0} nhiệm vụ**\n\nBạn có thể nhấp vào các câu hỏi gợi ý bên dưới hoặc chuyển qua **Studio Phân Loại** để nhận diện văn bản tự động tức thì!`;
}
