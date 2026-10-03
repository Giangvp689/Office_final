import React, { useState } from 'react';
import {
  IncomingDocument,
  OutgoingDocument,
  Task,
  User,
  Dossier,
} from '../types';
import {
  X,
  Printer,
  Download,
  FileSpreadsheet,
  FileText,
  Calendar,
  Building2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';

interface ReportModalProps {
  isOpen: boolean;
  onClose: () => void;
  startDateStr: string;
  endDateStr: string;
  timeRangeLabel: string;
  scopeLabel: string;
  incomingDocs: IncomingDocument[];
  outgoingDocs: OutgoingDocument[];
  tasks: Task[];
  users: User[];
  dossiers: Dossier[];
  currentUser?: User;
}

export const ReportModal: React.FC<ReportModalProps> = ({
  isOpen,
  onClose,
  startDateStr,
  endDateStr,
  timeRangeLabel,
  scopeLabel,
  incomingDocs,
  outgoingDocs,
  tasks,
  users,
  dossiers,
  currentUser,
}) => {
  const [reportTitle, setReportTitle] = useState('BÁO CÁO TỔNG KẾT TÌNH HÌNH TIẾP NHẬN, XỬ LÝ VĂN BẢN VÀ TIẾN ĐỘ CÔNG VIỆC');
  const [reportSigner, setReportSigner] = useState(currentUser?.fullName || 'Nguyễn Văn An');
  const [signerPosition, setSignerPosition] = useState(currentUser?.position || 'Giám đốc');

  if (!isOpen) return null;

  const totalIncoming = incomingDocs.length;
  const urgentIncoming = incomingDocs.filter(
    (d) => d.urgency === 'HOA_TOC' || d.urgency === 'KHAN' || d.urgency === 'THUONG_KHAN'
  ).length;
  const processingIncoming = incomingDocs.filter((d) => d.status === 'PROCESSING').length;
  const completedIncoming = incomingDocs.filter((d) => d.status === 'COMPLETED').length;

  const totalOutgoing = outgoingDocs.length;
  const issuedOutgoing = outgoingDocs.filter((d) => d.status === 'ISSUED' || d.status === 'SENT').length;
  const draftOutgoing = outgoingDocs.filter((d) => d.status === 'DRAFT').length;

  const totalTasks = tasks.length;
  const completedTasks = tasks.filter((t) => t.status === 'COMPLETED');
  const today = new Date().toISOString().split('T')[0];
  const overdueTasks = tasks.filter(
    (t) => t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.status !== 'CANCELLED' && t.dueDate < today)
  );
  const inProgressTasks = tasks.filter((t) => t.status === 'IN_PROGRESS');
  const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const handlePrint = () => {
    window.print();
  };

  const handleExportCsv = () => {
    const BOM = '\uFEFF';
    let csv = BOM + 'BÁO CÁO THỐNG KÊ TÌNH HÌNH VĂN BẢN VÀ CÔNG VIỆC\n';
    csv += `Kỳ báo cáo:,"${timeRangeLabel} (${startDateStr} đến ${endDateStr})"\n`;
    csv += `Phạm vi:,"${scopeLabel}"\n`;
    csv += `Thời gian xuất:,"${new Date().toLocaleString('vi-VN')}"\n\n`;

    csv += '--- CHỈ SỐ KPI TỔNG HỢP ---\n';
    csv += 'Chỉ tiêu,Số lượng,Ghi chú\n';
    csv += `Tổng văn bản đến tiếp nhận,${totalIncoming},Gồm ${urgentIncoming} văn bản khẩn\n`;
    csv += `Văn bản đến đã hoàn thành xử lý,${completedIncoming},\n`;
    csv += `Văn bản đến đang giải quyết,${processingIncoming},\n`;
    csv += `Tổng văn bản đi phát hành,${totalOutgoing},Gồm ${issuedOutgoing} đã ký ban hành\n`;
    csv += `Tổng nhiệm vụ công việc quản lý,${totalTasks},\n`;
    csv += `Nhiệm vụ đã hoàn thành,${completedTasks.length},Tỷ lệ: ${completionRate}%\n`;
    csv += `Nhiệm vụ quá hạn cần đôn đốc,${overdueTasks.length},\n\n`;

    csv += '--- DANH SÁCH NHIỆM VỤ CÔNG VIỆC TRỌNG TÂM TRONG KỲ ---\n';
    csv += 'Mã việc,Nội dung công việc,Người phụ trách,Hạn xử lý,Tiến độ,Trạng thái\n';
    tasks.forEach((t) => {
      const assignee = users.find((u) => u.id === t.assigneeId);
      csv += `"${t.code}","${t.title.replace(/"/g, '""')}","${assignee?.fullName || 'Chưa giao'}","${t.dueDate}","${t.progress}%","${t.status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `Bao_Cao_Van_Ban_Tien_Do_${startDateStr}_${endDateStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-3xl max-w-4xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden print:max-h-none print:shadow-none print:border-none print:rounded-none">
        
        {/* Modal Top Bar - Hidden during printing */}
        <div className="p-4 sm:px-6 bg-slate-900 text-white flex items-center justify-between print:hidden shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-300">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base">Xuất Báo Cáo Thống Kê Tiến Độ</h3>
              <p className="text-[11px] text-slate-300">
                Kỳ lọc: {timeRangeLabel} ({startDateStr} &rarr; {endDateStr})
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleExportCsv}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-700"
              title="Tải bảng tính Excel CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Xuất CSV Excel</span>
            </button>
            <button
              onClick={handlePrint}
              className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl flex items-center gap-1.5 shadow-md shadow-indigo-600/30 transition-all cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>In Báo Cáo (A4/PDF)</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Printable Official Administrative Report Content */}
        <div className="p-6 sm:p-10 flex-1 overflow-y-auto space-y-6 text-slate-800 print:overflow-visible print:p-0">
          
          {/* Header Quốc hiệu - Tiêu ngữ chuẩn NĐ 30/2020 */}
          <div className="flex flex-col sm:flex-row justify-between items-start gap-4 pb-4 border-b-2 border-slate-800">
            <div className="text-center sm:text-left">
              <div className="text-xs uppercase font-semibold tracking-wider text-slate-600">
                ỦY BAN NHÂN DÂN TỈNH
              </div>
              <div className="text-xs uppercase font-black tracking-tight text-slate-900 mt-0.5">
                TRUNG TÂM QUẢN LÝ & ĐIỀU HÀNH VĂN BẢN
              </div>
              <div className="text-[10px] text-slate-500 mt-1 font-mono">
                Số: ...... /BC-VP
              </div>
            </div>

            <div className="text-center self-center sm:self-auto">
              <div className="text-xs uppercase font-black tracking-tight text-slate-900">
                CỘNG HÒA XÃ HỘI CHỦ NGHĨA VIỆT NAM
              </div>
              <div className="text-xs font-bold text-slate-800 underline underline-offset-4 mt-0.5">
                Độc lập - Tự do - Hạnh phúc
              </div>
              <div className="text-[11px] text-slate-500 italic mt-1.5">
                ..., ngày {new Date().getDate()} tháng {new Date().getMonth() + 1} năm {new Date().getFullYear()}
              </div>
            </div>
          </div>

          {/* Tiêu đề báo cáo */}
          <div className="text-center space-y-1.5 pt-2">
            <h1 className="text-base sm:text-lg font-black uppercase text-slate-900 tracking-tight leading-snug">
              {reportTitle}
            </h1>
            <p className="text-xs font-semibold text-indigo-900 italic">
              (Kỳ báo cáo: Từ ngày {startDateStr} đến ngày {endDateStr} - {timeRangeLabel})
            </p>
            <div className="text-[11px] text-slate-600">
              Phạm vi tổng hợp: <strong>{scopeLabel}</strong>
            </div>
          </div>

          {/* Phần I: Số liệu tổng hợp (KPI) */}
          <div className="space-y-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs" />
              <span>I. TỔNG HỢP KHỐI LƯỢNG VĂN BẢN VÀ CÔNG VIỆC TRONG KỲ</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Văn bản đến</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalIncoming}</div>
                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">{urgentIncoming} văn bản khẩn</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Văn bản đi</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalOutgoing}</div>
                <div className="text-[10px] text-emerald-600 font-semibold mt-0.5">{issuedOutgoing} đã ban hành</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Tổng nhiệm vụ</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{totalTasks}</div>
                <div className="text-[10px] text-indigo-600 font-semibold mt-0.5">{inProgressTasks.length} đang thực hiện</div>
              </div>

              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                <div className="text-[10px] uppercase font-bold text-slate-500">Tỷ lệ hoàn thành</div>
                <div className="text-2xl font-black text-slate-900 mt-1">{completionRate}%</div>
                <div className="text-[10px] text-rose-600 font-semibold mt-0.5">{overdueTasks.length} việc quá hạn</div>
              </div>
            </div>
          </div>

          {/* Phần II: Bảng phân công tiến độ nhiệm vụ trọng tâm */}
          <div className="space-y-3">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs" />
              <span>II. CHI TIẾT CÁC NHIỆM VỤ TIÊU BIỂU VÀ ĐÔN ĐỐC QUÁ HẠN</span>
            </h2>

            <div className="border border-slate-300 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 border-b border-slate-300 font-bold text-[11px] text-slate-700">
                  <tr>
                    <th className="p-2.5 border-r border-slate-300 text-center w-10">STT</th>
                    <th className="p-2.5 border-r border-slate-300">Nội dung nhiệm vụ</th>
                    <th className="p-2.5 border-r border-slate-300 w-36">Cán bộ xử lý</th>
                    <th className="p-2.5 border-r border-slate-300 w-24 text-center">Hạn định</th>
                    <th className="p-2.5 border-r border-slate-300 w-20 text-center">Tiến độ</th>
                    <th className="p-2.5 w-28 text-center">Trạng thái</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200">
                  {tasks.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-4 text-center text-slate-400 italic">
                        Không có nhiệm vụ nào phát sinh trong khoảng thời gian đã chọn.
                      </td>
                    </tr>
                  ) : (
                    tasks.slice(0, 10).map((t, idx) => {
                      const assignee = users.find((u) => u.id === t.assigneeId);
                      const isOverdue = t.status === 'OVERDUE' || (t.status !== 'COMPLETED' && t.dueDate < today);
                      return (
                        <tr key={t.id} className={isOverdue ? 'bg-rose-50/40' : ''}>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono font-medium">
                            {idx + 1}
                          </td>
                          <td className="p-2.5 border-r border-slate-200">
                            <div className="font-semibold text-slate-900">{t.title}</div>
                            <div className="text-[10px] text-slate-500 font-mono mt-0.5">#{t.code}</div>
                          </td>
                          <td className="p-2.5 border-r border-slate-200 whitespace-nowrap">
                            {assignee?.fullName || 'Chưa giao'}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-mono whitespace-nowrap">
                            {new Date(t.dueDate).toLocaleDateString('vi-VN')}
                          </td>
                          <td className="p-2.5 border-r border-slate-200 text-center font-bold">
                            {t.progress}%
                          </td>
                          <td className="p-2.5 text-center whitespace-nowrap">
                            {t.status === 'COMPLETED' ? (
                              <span className="text-emerald-700 font-bold">Hoàn thành</span>
                            ) : isOverdue ? (
                              <span className="text-rose-600 font-bold">Quá hạn</span>
                            ) : (
                              <span className="text-indigo-600 font-semibold">Đang xử lý</span>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
            {tasks.length > 10 && (
              <p className="text-[11px] text-slate-500 italic text-right">
                * Báo cáo trích dẫn 10 nhiệm vụ tiêu biểu (tổng số {tasks.length} nhiệm vụ trong kỳ).
              </p>
            )}
          </div>

          {/* Phần III: Đánh giá & Kiến nghị */}
          <div className="space-y-2 pt-2">
            <h2 className="text-xs sm:text-sm font-black uppercase tracking-wide text-slate-900 flex items-center gap-2">
              <span className="w-1.5 h-3.5 bg-indigo-600 rounded-xs" />
              <span>III. ĐÁNH GIÁ VÀ KIẾN NGHỊ CHỈ ĐẠO</span>
            </h2>
            <div className="text-xs text-slate-700 leading-relaxed space-y-1 pl-3.5 border-l-2 border-slate-200">
              <p>
                - Tỷ lệ xử lý văn bản đúng hạn trong kỳ đạt <strong>{completionRate}%</strong>.
              </p>
              {overdueTasks.length > 0 ? (
                <p className="text-rose-700 font-medium">
                  - Yêu cầu các phòng ban chuyên môn khẩn trương rà soát <strong>{overdueTasks.length} nhiệm vụ quá hạn</strong>, báo cáo giải trình lý do chậm tiến độ trước ngày kế tiếp.
                </p>
              ) : (
                <p className="text-emerald-700 font-medium">
                  - Toàn bộ công việc trong kỳ được hoàn thành đúng hạn, không có hồ sơ tồn đọng.
                </p>
              )}
            </div>
          </div>

          {/* Phần Ký tên chuẩn thể thức văn bản */}
          <div className="pt-8 grid grid-cols-2 gap-4 text-center">
            <div>
              <div className="text-xs font-bold uppercase text-slate-700">NGƯỜI LẬP BÁO CÁO</div>
              <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký và ghi rõ họ tên)</div>
              <div className="mt-16 font-bold text-xs text-slate-900">
                {currentUser?.fullName || 'Văn thư cơ quan'}
              </div>
            </div>

            <div>
              <div className="text-xs font-bold uppercase text-slate-900">THỦ TRƯỞNG ĐƠN VỊ</div>
              <div className="text-[11px] text-slate-500 italic mt-0.5">(Ký, đóng dấu hoặc ký số điện tử)</div>
              <div className="mt-16 font-black text-xs text-slate-900 uppercase">
                {reportSigner}
              </div>
              <div className="text-[11px] text-slate-600 font-medium">
                {signerPosition}
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
