import React, { useState } from 'react';
import { MasterData } from '../types';
import { Database, Plus, Trash2, Check, Edit2 } from 'lucide-react';

interface MasterDataViewProps {
  masterData: MasterData;
  onUpdateMasterData: (newData: MasterData) => void;
}

type StringArrayField = 'docTypes' | 'authorities' | 'departments' | 'positions';

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  masterData,
  onUpdateMasterData,
}) => {
  const [docTypeInput, setDocTypeInput] = useState('');
  const [authorityInput, setAuthorityInput] = useState('');
  const [deptInput, setDeptInput] = useState('');
  const [posInput, setPosInput] = useState('');

  const handleAdd = (field: StringArrayField, value: string, setter: (s: string) => void) => {
    if (!value.trim()) return;
    const currentList = masterData[field] || [];
    if (currentList.includes(value.trim())) return;

    onUpdateMasterData({
      ...masterData,
      [field]: [...currentList, value.trim()],
    });
    setter('');
  };

  const handleRemove = (field: StringArrayField, item: string) => {
    const currentList = masterData[field] || [];
    onUpdateMasterData({
      ...masterData,
      [field]: currentList.filter((i) => i !== item),
    });
  };

  return (
    <div className="flex-1 p-6 md:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50 custom-scrollbar">
      <div>
        <h1 className="text-xl font-bold text-slate-800">Danh Mục Dùng Chung Hệ Thống</h1>
        <p className="text-xs text-slate-500 mt-0.5">
          Quản lý các danh mục chuẩn hóa: Loại văn bản, Cơ quan ban hành, Phòng ban và Chức vụ
        </p>
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
            {(masterData.docTypes || []).map((item) => (
              <span
                key={item}
                className="bg-slate-100 hover:bg-slate-200 text-slate-700 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                {item}
                <button
                  onClick={() => handleRemove('docTypes', item)}
                  className="text-slate-400 hover:text-rose-600"
                >
                  &times;
                </button>
              </span>
            ))}
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
            {(masterData.authorities || []).map((item) => (
              <span
                key={item}
                className="bg-indigo-50 text-indigo-800 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                {item}
                <button
                  onClick={() => handleRemove('authorities', item)}
                  className="text-indigo-400 hover:text-rose-600"
                >
                  &times;
                </button>
              </span>
            ))}
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
            {(masterData.departments || []).map((item) => (
              <span
                key={item}
                className="bg-emerald-50 text-emerald-800 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                {item}
                <button
                  onClick={() => handleRemove('departments', item)}
                  className="text-emerald-400 hover:text-rose-600"
                >
                  &times;
                </button>
              </span>
            ))}
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
            {(masterData.positions || []).map((item) => (
              <span
                key={item}
                className="bg-purple-50 text-purple-800 px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1.5"
              >
                {item}
                <button
                  onClick={() => handleRemove('positions', item)}
                  className="text-purple-400 hover:text-rose-600"
                >
                  &times;
                </button>
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
