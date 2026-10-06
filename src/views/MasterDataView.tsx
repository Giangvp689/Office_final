import React, { useState } from 'react';
import { MasterData, User } from '../types';
import { ShieldAlert, Lock, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface MasterDataViewProps {
  masterData: MasterData;
  onUpdateMasterData: (newData: MasterData) => void;
  currentUser?: User;
}

type StringArrayField = 'docTypes' | 'authorities' | 'departments' | 'positions';

const getItemText = (item: any): string => {
  if (!item) return '';
  if (typeof item === 'string') return item;
  if (typeof item === 'object') {
    return item.name || item.title || item.code || item.id || '';
  }
  return String(item);
};

const getItemKey = (field: string, item: any, index: number): string => {
  if (!item) return `${field}-empty-${index}`;
  if (typeof item === 'string') return `${field}-${item}-${index}`;
  if (typeof item === 'object') {
    return `${field}-${item.id || item.code || item.name || index}`;
  }
  return `${field}-${index}`;
};

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  masterData,
  onUpdateMasterData,
  currentUser,
}) => {
  const [docTypeInput, setDocTypeInput] = useState('');
  const [authorityInput, setAuthorityInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [posInput, setPosInput] = useState('');
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);

  const triggerFeedback = (msg: string) => {
    setSaveFeedback(msg);
    setTimeout(() => {
      setSaveFeedback((current) => (current === msg ? null : current));
    }, 3000);
  };

  const isAdminOrLeader = currentUser?.role === 'ADMIN' || currentUser?.role === 'LEADER';

  if (currentUser && !isAdminOrLeader) {
    return (
      <div className="flex-1 p-8 flex items-center justify-center">
        <div className="bg-white p-8 rounded-2xl border border-slate-200 max-w-md text-center shadow-xs">
          <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center mx-auto mb-4 border border-amber-200">
            <Lock className="w-6 h-6" />
          </div>
          <h2 className="text-base font-bold text-slate-800">Quyền Hạn Bị Giới Hạn</h2>
          <p className="text-xs text-slate-500 mt-2 leading-relaxed">
            Chức năng Quản lý Danh mục dùng chung chỉ dành riêng cho Lãnh đạo cơ quan và Quản trị viên hệ thống.
          </p>
        </div>
      </div>
    );
  }

  const handleAdd = (field: StringArrayField, value: string, setter: (s: string) => void) => {
    const val = value.trim();
    if (!val) return;
    const currentList = masterData[field] || [];
    const exists = currentList.some((it: any) => getItemText(it).toLowerCase() === val.toLowerCase());
    if (exists) {
      triggerFeedback(`Mục "${val}" đã tồn tại trong danh mục`);
      return;
    }

    onUpdateMasterData({
      ...masterData,
      [field]: [...currentList, val],
    });
    setter('');
    triggerFeedback(`Đã lưu "${val}" vào CSDL danh mục hệ thống`);
  };

  const handleRemove = (field: StringArrayField, targetItem: any) => {
    const currentList = masterData[field] || [];
    const targetText = getItemText(targetItem);
    const targetId = typeof targetItem === 'object' && targetItem ? targetItem.id : null;

    onUpdateMasterData({
      ...masterData,
      [field]: currentList.filter((i: any) => {
        if (targetId && typeof i === 'object' && i && i.id === targetId) return false;
        return getItemText(i) !== targetText;
      }),
    });
    triggerFeedback(`Đã xóa "${targetText}" khỏi danh mục hệ thống`);
  };

  return (
    <div className="w-full p-6 md:p-8 flex flex-col gap-6 flex-1">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-slate-800 flex items-center gap-2.5">
            Danh Mục Dùng Chung Hệ Thống
            {saveFeedback && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 inline-flex items-center gap-1 animate-pulse">
                <CheckCircle2 className="w-3.5 h-3.5" />
                {saveFeedback}
              </span>
            )}
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Quản lý các danh mục chuẩn hóa: Loại văn bản, Cơ quan ban hành, Phòng ban và Chức vụ (Đồng bộ CSDL máy chủ & Cloud)
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Box 1: Loại văn bản */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-3">1. Danh mục Loại văn bản</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={docTypeInput}
              onChange={(e) => setDocTypeInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd('docTypes', docTypeInput, setDocTypeInput)}
              placeholder="Thêm loại văn bản mới..."
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={() => handleAdd('docTypes', docTypeInput, setDocTypeInput)}
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
            >
              Thêm
            </button>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {(masterData.docTypes || []).map((item, idx) => {
              const text = getItemText(item);
              if (!text) return null;
              return (
                <span
                  key={getItemKey('docTypes', item, idx)}
                  className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {text}
                  <button
                    onClick={() => handleRemove('docTypes', item)}
                    className="text-slate-400 hover:text-rose-600 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Box 2: Cơ quan ban hành */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-3">2. Cơ quan / Đơn vị ban hành</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={authorityInput}
              onChange={(e) => setAuthorityInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd('authorities', authorityInput, setAuthorityInput)}
              placeholder="Thêm cơ quan mới..."
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={() => handleAdd('authorities', authorityInput, setAuthorityInput)}
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
            >
              Thêm
            </button>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {(masterData.authorities || []).map((item, idx) => {
              const text = getItemText(item);
              if (!text) return null;
              return (
                <span
                  key={getItemKey('authorities', item, idx)}
                  className="bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {text}
                  <button
                    onClick={() => handleRemove('authorities', item)}
                    className="text-indigo-400 hover:text-rose-600 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Box 3: Phòng ban */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-3">3. Danh sách Phòng ban trực thuộc</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={deptInput}
              onChange={(e) => setDeptInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd('departments', deptInput, setDeptInput)}
              placeholder="Thêm phòng ban mới..."
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={() => handleAdd('departments', deptInput, setDeptInput)}
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
            >
              Thêm
            </button>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {(masterData.departments || []).map((item, idx) => {
              const text = getItemText(item);
              if (!text) return null;
              return (
                <span
                  key={getItemKey('departments', item, idx)}
                  className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {text}
                  <button
                    onClick={() => handleRemove('departments', item)}
                    className="text-emerald-400 hover:text-rose-600 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        </div>

        {/* Box 4: Chức vụ */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 flex flex-col">
          <h3 className="font-bold text-sm text-slate-800 mb-3">4. Danh mục Chức vụ cán bộ</h3>
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={posInput}
              onChange={(e) => setPosInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleAdd('positions', posInput, setPosInput)}
              placeholder="Thêm chức vụ..."
              className="flex-1 p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
            />
            <button
              onClick={() => handleAdd('positions', posInput, setPosInput)}
              className="px-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold"
            >
              Thêm
            </button>
          </div>
          <div className="flex flex-wrap gap-2 flex-1">
            {(masterData.positions || []).map((item, idx) => {
              const text = getItemText(item);
              if (!text) return null;
              return (
                <span
                  key={getItemKey('positions', item, idx)}
                  className="bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
                >
                  {text}
                  <button
                    onClick={() => handleRemove('positions', item)}
                    className="text-purple-400 hover:text-rose-600 cursor-pointer"
                  >
                    &times;
                  </button>
                </span>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

