/**
 * Tiện ích định dạng ngày giờ chuẩn xác cho Hệ thống Quản Lý & Phân Loại Văn Bản
 */

export interface FormattedNotificationTime {
  time: string; // "14:35"
  date: string; // "05/10/2026"
  display: string; // "14:35 - Hôm nay (05/10/2026)" hoặc "14:35 • 25/08/2026"
  relative: string; // "5 phút trước", "Hôm qua", "3 ngày trước"
  full: string; // "14:35:00 - Thứ Hai, 05/10/2026"
}

export function formatNotificationDateTime(dateInput?: string | number | Date | null): FormattedNotificationTime {
  if (!dateInput) {
    const now = new Date();
    return {
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      date: now.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' }),
      display: 'Vừa xong',
      relative: 'Vừa xong',
      full: now.toLocaleString('vi-VN'),
    };
  }

  const d = new Date(dateInput);
  if (isNaN(d.getTime())) {
    return {
      time: '--:--',
      date: String(dateInput),
      display: String(dateInput),
      relative: '',
      full: String(dateInput),
    };
  }

  const now = new Date();
  const timeStr = d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  const dateStr = d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
  const fullStr = d.toLocaleString('vi-VN', {
    weekday: 'long',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const diffMs = now.getTime() - d.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  const diffMin = Math.floor(diffSec / 60);
  const diffHour = Math.floor(diffMin / 60);
  const diffDay = Math.floor(diffHour / 24);

  // Check if same calendar day
  const isToday =
    d.getDate() === now.getDate() &&
    d.getMonth() === now.getMonth() &&
    d.getFullYear() === now.getFullYear();

  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const isYesterday =
    d.getDate() === yesterday.getDate() &&
    d.getMonth() === yesterday.getMonth() &&
    d.getFullYear() === yesterday.getFullYear();

  let relative = '';
  let display = '';

  if (diffSec < 45) {
    relative = 'Vừa xong';
    display = `${timeStr} - Vừa xong (Hôm nay)`;
  } else if (diffMin < 60) {
    relative = `${diffMin} phút trước`;
    display = `${timeStr} - ${diffMin} phút trước (${dateStr})`;
  } else if (isToday) {
    relative = `${diffHour} giờ trước`;
    display = `${timeStr} - Hôm nay (${dateStr})`;
  } else if (isYesterday) {
    relative = 'Hôm qua';
    display = `${timeStr} - Hôm qua (${dateStr})`;
  } else if (diffDay < 7) {
    relative = `${diffDay} ngày trước`;
    display = `${timeStr} • ${dateStr}`;
  } else {
    relative = dateStr;
    display = `${timeStr} • ${dateStr}`;
  }

  return {
    time: timeStr,
    date: dateStr,
    display,
    relative,
    full: fullStr,
  };
}
