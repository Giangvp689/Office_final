import React, { useState } from 'react';
import { Sliders, Plus, Trash2, Tag, Building2, Layers } from 'lucide-react';
import { MasterData } from '../types';

interface MasterDataViewProps {
  masterData: MasterData;
  onUpdateMasterData: (newData: MasterData) => void;
}

export const MasterDataView: React.FC<MasterDataViewProps> = ({
  masterData,
  onUpdateMasterData,
}) => {
  const [activeTab, setActiveTab] = useState<'DOC_TYPES' | 'AUTHORITIES' | 'DEPTS'>('DOC_TYPES');
  const [newItemName, setNewItemName] = useState('');
  const [newItemCode, setNewItemCode] = useState('');

  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemName.trim()) return;

    if (activeTab === 'DOC_TYPES') {
      const code = newItemCode.trim() || newItemName.substring(0, 3).toUpperCase();
      const updated = {
        ...masterData,
        documentTypes: [
          ...masterData.documentTypes,
          { id: `dt_${Date.now()}`, code, name: newItemName },
        ],
      };
      onUpdateMasterData(updated);
    } else if (activeTab === 'AUTHORITIES') {
      const code = newItemCode.trim() || newItemName.substring(0, 3).toUpperCase();
      const updated = {
        ...masterData,
        authorities: [
          ...masterData.authorities,
          { id: `auth_${Date.now()}`, code, name: newItemName, level: 'Tỉnh/Thành' },
        ],
      };
      onUpdateMasterData(updated);
    } else if (activeTab === 'DEPTS') {
      const code = newItemCode.trim() || newItemName.substring(0, 3).toUpperCase();
      const updated = {
        ...masterData,
        departments: [
          ...masterData.departments,
          { id: `dept_${Date.now()}`, code, name: newItemName },
        ],
      };
      onUpdateMasterData(updated);
    }

    setNewItemName('');
    setNewItemCode('');
  };

  const handleDeleteItem = (id: string) => {
    if (activeTab === 'DOC_TYPES') {
      onUpdateMasterData({
        ...masterData,
        documentTypes: masterData.documentTypes.filter((x) => x.id !== id),
      });
    } else if (activeTab === 'AUTHORITIES') {
      onUpdateMasterData({
        ...masterData,
        authorities: masterData.authorities.filter((x) => x.id !== id),
      });
    } else if (activeTab === 'DEPTS') {
      onUpdateMasterData({
        ...masterData,
        departments: masterData.departments.filter((x) => x.id !== id),
      });
    }
  };

  return (
    <div className="flex-1 p-6 lg:p-8 overflow-y-auto flex flex-col gap-6 bg-slate-50">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <Sliders className="w-6 h-6 text-indigo-600" />
          <h1 className="text-xl font-bold text-slate-800 tracking-tight">Danh Mục Dùng Chung</h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Cấu hình chuẩn hóa các danh mục hệ thống: Loại văn bản hành chính, Cơ quan ban hành, và Các phòng ban đơn vị.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 border-b border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTab('DOC_TYPES')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'DOC_TYPES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Tag className="w-4 h-4" />
          <span>Loại Văn Bản ({masterData.documentTypes.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('AUTHORITIES')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'AUTHORITIES' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Cơ Quan Ban Hành ({masterData.authorities.length})</span>
        </button>
        <button
          onClick={() => setActiveTab('DEPTS')}
          className={`pb-3 px-3 border-b-2 flex items-center gap-2 transition-colors ${
            activeTab === 'DEPTS' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Phòng Ban Cơ Quan ({masterData.departments.length})</span>
        </button>
      </div>

      {/* Form Add */}
      <form onSubmit={handleAddItem} className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-3">
        <input
          type="text"
          required
          value={newItemName}
          onChange={(e) => setNewItemName(e.target.value)}
          placeholder="Nhập tên mục mới (Ví dụ: Tờ trình, Thông tri, Phòng Pháp chế...)"
          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
        />
        <input
          type="text"
          value={newItemCode}
          onChange={(e) => setNewItemCode(e.target.value)}
          placeholder="Mã viết tắt (TTr, PC...)"
          className="w-40 bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-xs outline-none focus:border-indigo-500"
        />
        <button
          type="submit"
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs px-4 py-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm Mục</span>
        </button>
      </form>

      {/* Table */}
      <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-50 border-b border-slate-200 text-slate-400 font-bold uppercase text-[10px]">
            <tr>
              <th className="p-3.5">Mã viết tắt</th>
              <th className="p-3.5">Tên danh mục</th>
              <th className="p-3.5 text-right">Thao tác</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {activeTab === 'DOC_TYPES' &&
              masterData.documentTypes.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-700">{item.code}</td>
                  <td className="p-3.5 font-medium text-slate-800">{item.name}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

            {activeTab === 'AUTHORITIES' &&
              masterData.authorities.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-700">{item.code}</td>
                  <td className="p-3.5 font-medium text-slate-800">{item.name}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}

            {activeTab === 'DEPTS' &&
              masterData.departments.map((item) => (
                <tr key={item.id} className="hover:bg-slate-50">
                  <td className="p-3.5 font-mono font-bold text-slate-700">{item.code}</td>
                  <td className="p-3.5 font-medium text-slate-800">{item.name}</td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
