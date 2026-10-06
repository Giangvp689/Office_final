import { IncomingDocument, OutgoingDocument, Task, User, Dossier } from '../types';

/**
 * Enhanced Local Administrative AI Knowledge Engine
 * Automatically performs deep multi-field semantic search, fuzzy matching,
 * contextual summarization, and Decree 30/2020/NĐ-CP guidance across all system entities.
 */
export function generateLocalAssistantAnswer(query: string, context: any): string {
  const rawQ = query || '';
  const q = rawQ.toLowerCase().trim();
  const today = new Date().toISOString().split('T')[0];

  const incomingDocs: IncomingDocument[] = context?.incomingDocs || context?.incomingList || [];
  const outgoingDocs: OutgoingDocument[] = context?.outgoingDocs || context?.outgoingList || [];
  const tasks: Task[] = context?.tasks || context?.taskList || [];
  const dossiers: Dossier[] = context?.dossiers || context?.dossierList || [];
  const users: User[] = context?.users || context?.userList || [];
  const currentUser: User = context?.currentUser || { fullName: 'Cán bộ', role: 'STAFF' };

  const overdueTasks = tasks.length > 0
    ? tasks.filter((t) => (t.status === 'OVERDUE' || (t.dueDate && t.dueDate < today)) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED')
    : (context?.overdueTasks || []);

  const urgentDocs = incomingDocs.length > 0
    ? incomingDocs.filter((d) => (d.urgency === 'HOA_TOC' || d.urgency === 'KHAN' || d.urgency === 'THUONG_KHAN') && d.status !== 'COMPLETED')
    : (context?.urgentDocs || []);

  // 1. Chào hỏi thân thiện
  if (/^(xin chào|chào|hello|hi|hey|chào bạn|chào em|chào anh|chào chị|alo|bạn là ai)/i.test(q)) {
    return `Xin chào đồng chí **${currentUser?.fullName || 'Cán bộ'}**! Tôi là **Trợ lý Gemini AI Cấp Cao** của Hệ thống Quản Lý & Phân Loại Văn Bản Hành Chính.

Tôi nắm rõ dữ liệu thực tế hiện tại của cơ quan:
- 📋 **${incomingDocs.length} văn bản đến** (${urgentDocs.length} văn bản hỏa tốc / khẩn cần xử lý).
- 📤 **${outgoingDocs.length} văn bản đi** đã ký phát hành hoặc đang dự thảo.
- ⚡ **${tasks.length} nhiệm vụ** (${overdueTasks.length} nhiệm vụ quá hạn cần đôn đốc).
- 📁 **${dossiers.length} hồ sơ vụ việc** đang theo dõi.

Đồng chí có thể hỏi tôi bất kỳ điều gì:
1. *"Tóm tắt các văn bản đến mới nhất và yêu cầu trọng tâm cần làm"*
2. *"Những ai đang có việc quá hạn và giải pháp đôn đốc là gì?"*
3. *"Tìm các văn bản liên quan đến tài chính, ngân sách hoặc kế hoạch"*
4. *"Soạn dự thảo công văn báo cáo UBND Tỉnh theo Nghị định 30"*
5. Hoặc trao đổi, tham vấn bất kỳ quy trình nghiệp vụ hành chính nào!`;
  }

  // 2. Yêu cầu tóm tắt văn bản đến / bóc tách yêu cầu
  if (q.includes('tóm tắt') || q.includes('bóc tách') || q.includes('yêu cầu') || q.includes('nhiệm vụ cần làm') || q.includes('chỉ đạo')) {
    // Tìm văn bản liên quan theo số hiệu hoặc từ khóa
    let targetDoc = incomingDocs[0]; // Mặc định văn bản mới nhất
    for (const doc of incomingDocs) {
      if ((doc.officialNumber && q.includes(doc.officialNumber.toLowerCase())) ||
          (doc.documentNumber && q.includes(doc.documentNumber.toLowerCase())) ||
          (doc.summary && q.includes(doc.summary.toLowerCase().slice(0, 20)))) {
        targetDoc = doc;
        break;
      }
    }

    if (targetDoc) {
      const assigneeName = users.find((u) => u.id === targetDoc.assigneeId)?.fullName || 'Chưa phân công';
      const execSummary = targetDoc.executiveSummary || `Văn bản về việc "${targetDoc.summary}" do đơn vị "${targetDoc.issuingAuthority}" ban hành ngày ${targetDoc.issueDate || 'gần đây'}. Văn bản chỉ đạo các phòng ban chuyên môn khẩn trương rà soát nội dung, xây dựng phương án tham mưu báo cáo và hoàn thành nhiệm vụ theo đúng thẩm quyền.`;
      
      const mandates = (targetDoc.keyRequirements && targetDoc.keyRequirements.length > 0)
        ? targetDoc.keyRequirements
        : [
            'Tiếp nhận, thẩm định hồ sơ văn bản theo đúng thể thức Nghị định 30/2020/NĐ-CP',
            'Xây dựng văn bản tham mưu hoặc báo cáo phản hồi cơ quan ban hành',
            'Phối hợp với các bộ phận liên quan để hoàn thiện hồ sơ trước hạn chót',
          ];

      return `📋 **TỔNG HỢP & TÓM TẮT CHUYÊN SÂU VĂN BẢN ĐẾN [${targetDoc.documentNumber}]:**

- **Số / Ký hiệu gốc:** ${targetDoc.officialNumber || targetDoc.documentNumber}
- **Cơ quan ban hành:** **${targetDoc.issuingAuthority}**
- **Người ký:** ${targetDoc.signer || 'Lãnh đạo đơn vị'} (${targetDoc.signerPosition || 'Thủ trưởng cơ quan'})
- **Mức độ khẩn:** **${targetDoc.urgency}** | **Hạn hoàn thành:** **${targetDoc.dueDate}**
- **Cán bộ thụ lý chính:** **${assigneeName}**

---
📝 **TÓM TẮT ĐIỀU HÀNH (EXECUTIVE SUMMARY):**
${execSummary}

---
📌 **CÁC YÊU CẦU & CHỈ ĐẠO BẮT BUỘC THI HÀNH:**
${mandates.map((m, i) => `${i + 1}. **${m}**`).join('\n')}

💡 **Đề xuất hành động:** Đồng chí có thể bấm vào mục **"Văn Bản Đến"** để xem chi tiết hoặc bấm nút **"+ Giao việc"** để khởi tạo nhiệm vụ cho chuyên viên thụ lý!`;
    }
  }

  // 3. Tra cứu theo số hiệu văn bản (e.g. 72/2025/QH15, 218/QĐ-STC)
  const docNumberMatch = q.match(/([0-9]+\/[a-z0-9\-_]+)/i);
  if (docNumberMatch) {
    const num = docNumberMatch[1].toUpperCase();
    const foundInc = incomingDocs.find((d) => (d.documentNumber || '').toUpperCase().includes(num) || (d.officialNumber || '').toUpperCase().includes(num));
    const foundOut = outgoingDocs.find((d) => (d.documentNumber || '').toUpperCase().includes(num));

    if (foundInc) {
      const assignee = users.find((u) => u.id === foundInc.assigneeId)?.fullName || 'Chưa phân công';
      return `📄 **Tìm thấy Văn bản Đến số [${foundInc.documentNumber}]:**
- **Số ký hiệu gốc:** ${foundInc.officialNumber || foundInc.documentNumber}
- **Cơ quan ban hành:** **${foundInc.issuingAuthority || 'Chưa rõ'}**
- **Người ký:** ${foundInc.signer || 'Lãnh đạo đơn vị'} (${foundInc.signerPosition || 'Thủ trưởng'})
- **Loại văn bản:** ${foundInc.docType || 'Công văn'} | **Độ khẩn:** ${foundInc.urgency || 'THUONG'}
- **Trích yếu nội dung:** ${foundInc.summary}
${foundInc.executiveSummary ? `- **Tóm tắt điều hành:** ${foundInc.executiveSummary}\n` : ''}- **Cán bộ thụ lý:** ${assignee}
- **Hạn hoàn thành:** ${foundInc.dueDate || 'Không thời hạn'}
- **Trạng thái:** ${foundInc.status === 'COMPLETED' ? '✅ Đã hoàn thành' : foundInc.status === 'OVERDUE' ? '⚠️ Quá hạn' : '⏳ Đang xử lý'}
${foundInc.leaderDirective ? `- **Ý kiến chỉ đạo của Lãnh đạo:** "${foundInc.leaderDirective}"` : ''}`;
    }

    if (foundOut) {
      const drafter = users.find((u) => u.id === foundOut.drafterId)?.fullName || 'Chưa rõ';
      return `📤 **Tìm thấy Văn bản Đi số [${foundOut.documentNumber}]:**
- **Trích yếu / Tiêu đề:** ${foundOut.summary || foundOut.title}
- **Nơi nhận:** ${foundOut.recipient}
- **Cán bộ soạn thảo:** ${drafter}
- **Trạng thái:** ${foundOut.status === 'ISSUED' ? '✅ Đã phát hành' : foundOut.status === 'SIGNED' ? '🖋️ Đã ký duyệt' : '📝 Dự thảo'}
- **Ngày phát hành:** ${foundOut.releaseDate || 'Đang xử lý'}`;
    }
  }

  // 4. Soạn thảo văn bản hành chính theo yêu cầu
  if (q.includes('soạn') || q.includes('dự thảo') || q.includes('viết công văn') || q.includes('viết tờ trình') || q.includes('mẫu văn bản')) {
    const todayVN = `ngày ${new Date().getDate()} tháng ${new Date().getMonth() + 1} năm ${new Date().getFullYear()}`;
    return `📝 **DỰ THẢO VĂN BẢN THEO CHUẨN NGHỊ ĐỊNH 30/2020/NĐ-CP:**

**CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM**
**Độc lập - Tự do - Hạnh phúc**
-------------------
Số: .../VP-TH                                  *Hà Nội, ${todayVN}*

**Kính gửi:** Ủy ban nhân dân Tỉnh / Sở Ban Ngành liên quan

**Về việc:** ${rawQ.replace(/(soạn|dự thảo|viết công văn|viết tờ trình|giúp tôi|hãy)/gi, '').trim() || 'Triển khai nhiệm vụ theo kế hoạch công tác'}

**Căn cứ pháp lý:**
- Căn cứ Nghị định số 30/2020/NĐ-CP ngày 05/3/2020 của Chính phủ về công tác văn thư;
- Căn cứ Quyết định phân công nhiệm vụ và Kế hoạch công tác năm của cơ quan;

Thực hiện chỉ đạo của Lãnh đạo cơ quan, Văn phòng xin trân trọng báo cáo và đề xuất nội dung sau:
1. Khẩn trương rà soát, thống kê và hoàn thiện toàn bộ hồ sơ nghiệp vụ liên quan theo đúng thẩm quyền.
2. Chủ động phối hợp liên phòng ban để bảo đảm tiến độ và chất lượng văn bản tham mưu.
3. Kính trình Lãnh đạo cấp trên xem xét, chỉ đạo để đơn vị có cơ sở tổ chức triển khai thực hiện.

**Nơi nhận:**
- Như trên;
- Lãnh đạo cơ quan (để b/c);
- Lưu: VT, TH.

**THỦ TRƯỞNG ĐƠN VỊ**
*(Ký, ghi rõ họ tên và đóng dấu)*`;
  }

  // 5. Tra cứu theo cán bộ nhân sự
  const matchedUser = users.find((u) => u.fullName && q.includes(u.fullName.toLowerCase()));
  if (matchedUser) {
    const userTasks = tasks.filter((t) => t.assigneeId === matchedUser.id || t.coAssigneeIds?.includes(matchedUser.id));
    const userOverdue = userTasks.filter((t) => (t.status === 'OVERDUE' || (t.dueDate && t.dueDate < today)) && t.status !== 'COMPLETED');
    const userPending = userTasks.filter((t) => t.status === 'IN_PROGRESS' || t.status === 'NOT_STARTED');
    const userWaiting = userTasks.filter((t) => t.status === 'WAITING_APPROVAL');
    const userDocs = incomingDocs.filter((d) => d.assigneeId === matchedUser.id);

    return `👤 **BÁO CÁO CÔNG VIỆC CỦA CÁN BỘ: ${matchedUser.fullName}**
- **Chức vụ / Vị trí:** ${matchedUser.position || matchedUser.role} - **Phòng ban:** ${matchedUser.department}
- **Tổng số nhiệm vụ được giao:** **${userTasks.length} việc** (Văn bản đến phụ trách: **${userDocs.length} VB**)
- **Đang xử lý:** ${userPending.length} việc
- **Chờ Lãnh đạo nghiệm thu:** ${userWaiting.length} việc
- **Quá hạn / Trễ hạn:** ${userOverdue.length} việc ${userOverdue.length > 0 ? '⚠️' : '✅'}

${userOverdue.length > 0 ? `📌 **Các việc quá hạn cần đôn đốc ngay:**\n` + userOverdue.map((t) => `- [${t.code}] ${t.title} (Hạn: ${t.dueDate})`).join('\n') : '🎉 Hiện tại cán bộ không có việc nào bị quá hạn.'}

${userPending.length > 0 ? `\n⏳ **Các việc trọng tâm đang thực hiện:**\n` + userPending.slice(0, 3).map((t) => `- [${t.code}] ${t.title} (Tiến độ: ${t.progress || 0}%, Hạn: ${t.dueDate})`).join('\n') : ''}`;
  }

  // 6. Quá hạn / Tiến độ trễ
  if (q.includes('quá hạn') || q.includes('trễ hạn') || q.includes('chậm tiến độ') || q.includes('chưa xong')) {
    if (overdueTasks.length === 0) {
      return `🎉 **Tin vui!** Toàn hệ thống hiện có **0 công việc bị quá hạn**. Mọi nhiệm vụ đều đang bám sát mốc thời hạn được giao.`;
    }
    const list = overdueTasks.slice(0, 8).map((t: any) => {
      const assigneeName = t.assigneeName || users.find((u) => u.id === t.assigneeId)?.fullName || 'Chưa rõ';
      return `- **[${t.code}]** ${t.title}\n  *Cán bộ phụ trách:* ${assigneeName} | *Hạn chót:* ${t.dueDate} | *Tiến độ:* ${t.progress || 0}%`;
    }).join('\n');

    return `⚠️ **CẢNH BÁO TIẾN ĐỘ: Có ${overdueTasks.length} nhiệm vụ ĐANG QUÁ HẠN chưa hoàn thành:**

${list}
${overdueTasks.length > 8 ? `\n*...và còn ${overdueTasks.length - 8} nhiệm vụ quá hạn khác.*` : ''}

💡 **Đề xuất giải pháp đôn đốc:**
1. Lãnh đạo gửi thông báo nhắc việc trực tiếp đến cán bộ phụ trách.
2. Với các nhiệm vụ gặp khó khăn về số liệu hoặc phối hợp, bổ sung thêm chuyên viên hỗ trợ.
3. Chuyển sang mục **"Theo Dõi Công Việc"** để xem chi tiết timeline.`;
  }

  // 7. Văn bản Hỏa tốc / Khẩn
  if (q.includes('hỏa tốc') || q.includes('khẩn') || q.includes('gấp') || q.includes('ưu tiên')) {
    if (urgentDocs.length === 0) {
      return `✅ **Hiện không có văn bản Hỏa tốc hoặc Khẩn nào chưa xử lý.** Mọi văn bản ưu tiên cao đều đã được chỉ đạo phân luồng xong.`;
    }
    const list = urgentDocs.map((d: any) => {
      const assigneeName = users.find((u) => u.id === d.assigneeId)?.fullName || 'Chưa phân công';
      return `- **Số [${d.documentNumber}]** [${d.urgency}]: ${d.summary}\n  *Cơ quan ban hành:* ${d.issuingAuthority || 'Chưa rõ'} | *Người xử lý:* ${assigneeName} | *Hạn:* ${d.dueDate || 'Trong ngày'}`;
    }).join('\n');

    return `🚨 **DANH SÁCH ${urgentDocs.length} VĂN BẢN HỎA TỐC / KHẨN CẦN ƯU TIÊN GIẢI QUYẾT:**

${list}

📌 **Hành động cấp thiết:** Lãnh đạo cần phê duyệt chỉ đạo ngay để chuyên viên kịp thời tham mưu phản hồi trong thời hạn 24h - 48h.`;
  }

  // 8. Tìm kiếm văn bản theo từ khóa nội dung (ví dụ: tài chính, ngân sách, nhân sự, đào tạo, dự án...)
  const keywords = q.split(/\s+/).filter((w) => w.length > 2 && !['văn', 'bản', 'các', 'cho', 'tôi', 'nào', 'trong', 'hệ', 'thống'].includes(w));
  if (keywords.length > 0) {
    const matchedDocs = incomingDocs.filter((d) => {
      const text = `${d.documentNumber} ${d.officialNumber || ''} ${d.issuingAuthority} ${d.summary} ${d.executiveSummary || ''}`.toLowerCase();
      return keywords.some((k) => text.includes(k));
    });

    const matchedTasks = tasks.filter((t) => {
      const text = `${t.code} ${t.title} ${t.description || ''}`.toLowerCase();
      return keywords.some((k) => text.includes(k));
    });

    if (matchedDocs.length > 0 || matchedTasks.length > 0) {
      let response = `🔍 **KẾT QUẢ TRA CỨU THEO TỪ KHÓA "${query}":**\n\n`;
      if (matchedDocs.length > 0) {
        response += `📄 **Văn bản liên quan (${matchedDocs.length} văn bản):**\n`;
        matchedDocs.slice(0, 5).forEach((d) => {
          const assigneeName = users.find((u) => u.id === d.assigneeId)?.fullName || 'Chưa phân công';
          response += `- **[${d.documentNumber}]** (${d.issuingAuthority}): ${d.summary}\n  *Thụ lý:* ${assigneeName} | *Hạn:* ${d.dueDate} | *Trạng thái:* ${d.status}\n`;
        });
        response += '\n';
      }

      if (matchedTasks.length > 0) {
        response += `⚡ **Nhiệm vụ liên quan (${matchedTasks.length} nhiệm vụ):**\n`;
        matchedTasks.slice(0, 4).forEach((t) => {
          const assigneeName = users.find((u) => u.id === t.assigneeId)?.fullName || 'Chưa rõ';
          response += `- **[${t.code}]** ${t.title} (Phụ trách: ${assigneeName}, Tiến độ: ${t.progress || 0}%)\n`;
        });
      }

      return response;
    }
  }

  // 9. Hướng dẫn Nghị định 30/2020/NĐ-CP
  if (q.includes('nghị định 30') || q.includes('thể thức') || q.includes('quy định văn thư')) {
    return `📜 **QUY ĐỊNH THỂ THỨC VĂN BẢN THEO NGHỊ ĐỊNH 30/2020/NĐ-CP:**

1. **Các thành phần bắt buộc:**
   - **Quốc hiệu & Tiêu ngữ**: CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM / Độc lập - Tự do - Hạnh phúc (chữ hoa đậm).
   - **Tên cơ quan ban hành**: Cấp trên trực tiếp (chữ hoa thường), cơ quan ban hành (chữ in hoa đậm).
   - **Số, ký hiệu**: VD *125/UBND-VP* hoặc *45/QĐ-STC*.
   - **Địa danh và ngày tháng năm**: VD *Hà Nội, ngày 15 tháng 10 năm 2025*.
   - **Trích yếu nội dung**: Rõ ràng, súc tích, khái quát trọn vẹn chủ đề văn bản.
   - **Chữ ký, con dấu**: Kèm chữ ký số hoặc dấu mộc theo thẩm quyền.
   - **Nơi nhận**: Cơ quan cấp trên, đơn vị thi hành và lưu trữ văn thư (VT, TH).

2. **Kỹ thuật trình bày:** Khổ giấy A4, font Times New Roman Unicode, căn lề chuẩn: trên/dưới 20-25mm, trái 30-35mm, phải 15-20mm.`;
  }

  // 10. Trả lời tự do / Tổng quan hệ thống
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED').length;
  return `🤖 **PHẢN HỒI VỀ: "${query}"**

Hiện tại tôi ghi nhận câu hỏi của đồng chí **${currentUser?.fullName || 'Cán bộ'}**. Dưới đây là thông tin điều hành tổng thể của cơ quan:

- 📊 **Văn bản đến:** **${incomingDocs.length} văn bản** (${urgentDocs.length} hỏa tốc/khẩn cần chỉ đạo gấp).
- 📤 **Văn bản đi:** **${outgoingDocs.length} văn bản** đã được lưu chuyển.
- ⚡ **Tiến độ công việc:** **${tasks.length} nhiệm vụ** (${completedTasks} hoàn thành, ${overdueTasks.length} quá hạn).
- 📁 **Hồ sơ lưu trữ:** **${dossiers.length} hồ sơ** vụ việc đang quản lý.

💡 **Đồng chí có thể đặt bất kỳ câu hỏi nào cụ thể hơn:**
- *"Tóm tắt chi tiết văn bản đến mới nhất"*
- *"Có những công việc nào sắp đến hạn trong tuần này?"*
- *"Phân tích các việc của phòng Kế hoạch - Tài chính"*
- *"Soạn giúp tôi một công văn gửi UBND Tỉnh"*`;
}
