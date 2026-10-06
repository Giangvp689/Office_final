import React, { useState, useEffect, useMemo } from 'react';
import { db } from './services/db';
import {
  User,
  IncomingDocument,
  OutgoingDocument,
  Task,
  Dossier,
  AttachmentFile,
  MasterData,
  AuditLog,
  SystemNotification,
} from './types';
import { Sidebar, NavSection } from './components/Sidebar';
import { Header } from './components/Header';

// Views from src/views
import { DashboardView } from './views/DashboardView';
import { IncomingDocsView } from './views/IncomingDocsView';
import { OutgoingDocsView } from './views/OutgoingDocsView';
import { TasksView } from './views/TasksView';
import { DossiersView } from './views/DossiersView';
import { CalendarView } from './views/CalendarView';
import { RemindersView } from './views/RemindersView';
import { PersonnelView } from './views/PersonnelView';
import { DocumentsVaultView } from './views/DocumentsVaultView';
import { MasterDataView } from './views/MasterDataView';
import { AuditLogsView } from './views/AuditLogsView';
import { AIAssistantView } from './views/AIAssistantView';
import { ClassificationStudioView } from './views/ClassificationStudioView';
import { LoginView } from './views/LoginView';
import { ChangePasswordModal } from './components/ChangePasswordModal';
import { UserProfileModal } from './components/UserProfileModal';
import { DatabaseCenterModal } from './components/DatabaseCenterModal';
import { FacebookNotificationToast } from './components/FacebookNotificationToast';
import { Lock } from 'lucide-react';
import { canAccessClassificationStudio, isLeaderOrAdmin } from './utils/permission';

export const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => db.isAuthenticated());
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [userProfileTab, setUserProfileTab] = useState<'PROFILE' | 'PASSWORD'>('PROFILE');
  const [showDatabaseCenterModal, setShowDatabaseCenterModal] = useState<boolean>(false);

  // Navigation State
  const [currentSection, setCurrentSection] = useState<NavSection>('DASHBOARD');
  const [reminderInitialTab, setReminderInitialTab] = useState<'REMINDERS' | 'NOTIFICATIONS'>('REMINDERS');
  const [searchQuery, setSearchQuery] = useState('');

  // Active target for notification deep-linking (Facebook-style navigation)
  const [activeTarget, setActiveTarget] = useState<{
    type: 'TASK' | 'INCOMING_DOC' | 'OUTGOING_DOC' | 'DOSSIER';
    id: string;
    timestamp: number;
    subTarget?: 'COMMENTS' | 'DETAILS' | 'APPROVAL';
  } | null>(null);

  // Core Data from db
  const [users, setUsers] = useState<User[]>(() => db.getUsers());
  const [currentUser, setCurrentUser] = useState<User>(() => db.getCurrentUser());
  const [incomingDocs, setIncomingDocs] = useState<IncomingDocument[]>(() => db.getIncomingDocs());
  const [outgoingDocs, setOutgoingDocs] = useState<OutgoingDocument[]>(() => db.getOutgoingDocs());
  const [tasks, setTasks] = useState<Task[]>(() => db.getTasks());
  const [dossiers, setDossiers] = useState<Dossier[]>(() => db.getDossiers());
  const [attachments, setAttachments] = useState<AttachmentFile[]>(() => db.getAttachments());
  const [masterData, setMasterData] = useState<MasterData>(() => db.getMasterData());
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => db.getAuditLogs());
  const [notifications, setNotifications] = useState<SystemNotification[]>(() => db.getNotifications());

  // Filter notifications specifically for the current authenticated user (Actor/sender never receives their own notification)
  const userNotifications = useMemo(() => {
    if (!currentUser) return [];
    return notifications
      .filter((n) => {
        // 1. CÁN BỘ / LÃNH ĐẠO GIAO VIỆC HOẶC THỰC HIỆN HÀNH ĐỘNG TUYỆT ĐỐI KHÔNG NHẬN THÔNG BÁO CỦA CHÍNH MÌNH
        if (n.senderId && n.senderId === currentUser.id) {
          return false;
        }
        // 2. Nếu có chỉ định đích danh cán bộ nhận
        if (n.userId) {
          return n.userId === currentUser.id;
        }
        // 3. Nếu gửi theo vai trò (ví dụ: Lãnh đạo nhận khi có yêu cầu trình duyệt, Văn thư nhận khi có VB đã ký)
        if (n.targetRole) {
          return n.targetRole === currentUser.role;
        }
        // 4. Các thông báo chung toàn cơ quan (chỉ hiển thị nếu không phải người gửi)
        return true;
      })
      .sort((a, b) => new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime());
  }, [notifications, currentUser]);

  // Reload data on changes
  const reloadData = () => {
    setIsAuthenticated(db.isAuthenticated());
    setUsers(db.getUsers());
    setCurrentUser(db.getCurrentUser());
    setIncomingDocs(db.getIncomingDocs());
    setOutgoingDocs(db.getOutgoingDocs());
    setTasks(db.getTasks());
    setDossiers(db.getDossiers());
    setAttachments(db.getAttachments());
    setMasterData(db.getMasterData());
    setAuditLogs(db.getAuditLogs());
    setNotifications(db.getNotifications());
  };

  useEffect(() => {
    // Initial fetch directly from the server database
    db.checkAndSyncMySql();
    db.fetchAndRefreshAuditLogs().then((logs) => {
      if (logs && logs.length > 0) setAuditLogs(logs);
    });

    const unsubscribe = db.subscribe(() => {
      reloadData();
    });
    return () => unsubscribe();
  }, []);

  // Compute personalized counts for sidebar based on role and active tasks (excluding completed items)
  const counts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const role = currentUser?.role || 'STAFF';
    const isStaff = role === 'STAFF';
    const isLeader = role === 'LEADER' || role === 'ADMIN';
    const isClerkRole = role === 'CLERK';

    // 1. Nhắc Việc & Trễ Hạn (Overdue / Action Needed):
    // - Chuyên viên: CHỈ ĐẾM việc quá hạn của chính mình, không đếm của toàn hệ thống
    // - Lãnh đạo: Việc quá hạn chưa xử lý + việc chuyên viên trình nghiệm thu chờ Lãnh đạo duyệt (WAITING_APPROVAL)
    // - Văn thư: Việc chuyên môn của văn thư quá hạn
    let overdueCount = 0;
    if (isStaff) {
      overdueCount = tasks.filter(
        (t) =>
          (t.assigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || '')) &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          (t.status === 'OVERDUE' || t.dueDate < today)
      ).length;
    } else if (isLeader) {
      const agencyOverdue = tasks.filter(
        (t) => (t.status === 'OVERDUE' || t.dueDate < today) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
      ).length;
      const waitingApproval = tasks.filter((t) => t.status === 'WAITING_APPROVAL').length;
      overdueCount = agencyOverdue + waitingApproval;
    } else if (isClerkRole) {
      overdueCount = tasks.filter(
        (t) =>
          (t.assigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || '')) &&
          t.status !== 'COMPLETED' &&
          t.status !== 'CANCELLED' &&
          (t.status === 'OVERDUE' || t.dueDate < today)
      ).length;
    }

    // 2. Quản Lý Văn Bản Đến (Active / Đang làm, KHÔNG đếm cái đã xong):
    // - Lãnh đạo & Văn thư: Văn bản đến mới hoặc đang xử lý (chờ chỉ đạo / đang làm, KHÔNG đếm COMPLETED)
    // - Chuyên viên: CHỈ ĐẾM văn bản đến được giao cho mình mà ĐANG LÀM (chưa hoàn thành)
    let incomingCount = 0;
    if (isStaff) {
      incomingCount = incomingDocs.filter(
        (d) =>
          (d.assigneeId === currentUser?.id || d.coAssigneeIds?.includes(currentUser?.id || '')) &&
          d.status !== 'COMPLETED'
      ).length;
    } else {
      incomingCount = incomingDocs.filter((d) => d.status !== 'COMPLETED').length;
    }

    // 3. Quản Lý Văn Bản Đi (Active / Đang làm, KHÔNG đếm cái đã phát hành xong):
    // - Lãnh đạo: Văn bản đi đang chờ thẩm định / ký duyệt (DRAFT, REVIEWING)
    // - Văn thư: Văn bản đi cần phát hành / cấp số / đóng dấu (SIGNED, DRAFT)
    // - Chuyên viên: CHỈ ĐẾM văn bản đi do mình soạn thảo đang xử lý (chưa phát hành/gửi: status !== 'ISSUED' && status !== 'SENT')
    let outgoingCount = 0;
    if (isStaff) {
      outgoingCount = outgoingDocs.filter(
        (d) =>
          (d.drafterId === currentUser?.id || d.createdById === currentUser?.id) &&
          d.status !== 'ISSUED' &&
          d.status !== 'SENT'
      ).length;
    } else if (isClerkRole) {
      outgoingCount = outgoingDocs.filter(
        (d) => d.status === 'SIGNED' || d.status === 'DRAFT'
      ).length;
    } else {
      outgoingCount = outgoingDocs.filter(
        (d) => d.status !== 'ISSUED' && d.status !== 'SENT'
      ).length;
    }

    // 4. Nhiệm vụ của tôi (Đang làm, không đếm đã xong):
    const myTasks = tasks.filter(
      (t) =>
        (t.assigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id || '')) &&
        t.status !== 'COMPLETED' &&
        t.status !== 'CANCELLED'
    ).length;

    const unreadNotifs = userNotifications.filter((n) => !n.isRead).length;

    return {
      incoming: incomingCount,
      outgoing: outgoingCount,
      myTasks,
      overdue: overdueCount,
      reminders: unreadNotifs,
    };
  }, [incomingDocs, outgoingDocs, tasks, currentUser, userNotifications]);

  // If user is not authenticated, show modern Login view
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
          reloadData();
          db.checkAndSyncMySql().then(() => {
            reloadData();
          });
        }}
      />
    );
  }

  // Notification target click (Facebook-style deep linking)
  const handleSelectNotificationTarget = (type?: string, id?: string, subTarget?: 'COMMENTS' | 'DETAILS' | 'APPROVAL') => {
    if (!id || !type) return;
    const normalizedType = type.toUpperCase() as 'TASK' | 'INCOMING_DOC' | 'OUTGOING_DOC' | 'DOSSIER';
    
    if (normalizedType === 'TASK') {
      setCurrentSection('ALL_TASKS');
    } else if (normalizedType === 'INCOMING_DOC') {
      setCurrentSection('INCOMING_DOCS');
    } else if (normalizedType === 'OUTGOING_DOC') {
      setCurrentSection('OUTGOING_DOCS');
    } else if (normalizedType === 'DOSSIER') {
      setCurrentSection('DOSSIERS');
    }
    
    setActiveTarget({ type: normalizedType, id, timestamp: Date.now(), subTarget });
  };

  const handleDraftOutgoingDocFromTask = (task: Task) => {
    const leaderUser = users.find((u) => u.role === 'LEADER') || users.find((u) => u.role === 'ADMIN') || currentUser;
    const summaryText = `Dự thảo Báo cáo / Công văn trả lời thực hiện nhiệm vụ [${task.code}]: ${task.title}`;
    const newOutgoingDoc: OutgoingDocument = {
      id: `out-${Date.now()}`,
      documentNumber: db.generateDraftOutgoingDocNumber(),
      summary: summaryText,
      title: summaryText,
      releaseDate: new Date().toISOString().split('T')[0],
      docType: 'Công văn',
      department: (currentUser.department as any) || 'Phòng Chuyên Môn',
      drafterId: currentUser.id,
      signerId: task.creatorId || task.createdById || leaderUser.id,
      recipient: task.incomingDocId
        ? incomingDocs.find((d) => d.id === task.incomingDocId)?.issuingAuthority || 'Cơ quan cấp trên'
        : 'Cơ quan cấp trên / Lãnh đạo đơn vị',
      status: 'DRAFT',
      dossierId: task.dossierId || '',
      replyToDocId: task.incomingDocId || '',
      attachments: task.attachments || [],
      createdById: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    db.saveOutgoingDoc(newOutgoingDoc, currentUser);
    setActiveTarget({ type: 'OUTGOING_DOC', id: newOutgoingDoc.id, timestamp: Date.now() });
    setCurrentSection('OUTGOING_DOCS');
  };

  const handleDraftOutgoingDocFromIncomingDoc = (doc: IncomingDocument) => {
    const leaderUser = users.find((u) => u.role === 'LEADER') || users.find((u) => u.role === 'ADMIN') || currentUser;
    const summaryText = `Dự thảo Công văn trả lời / Báo cáo văn bản đến [${doc.documentNumber}]: ${doc.summary}`;
    const newOutgoingDoc: OutgoingDocument = {
      id: `out-${Date.now()}`,
      documentNumber: db.generateDraftOutgoingDocNumber(),
      summary: summaryText,
      title: summaryText,
      releaseDate: new Date().toISOString().split('T')[0],
      docType: 'Công văn',
      department: (currentUser.department as any) || 'Phòng Chuyên Môn',
      drafterId: currentUser.id,
      signerId: doc.leaderId || leaderUser.id,
      recipient: doc.issuingAuthority || 'Cơ quan gửi đến',
      status: 'DRAFT',
      dossierId: doc.dossierId || '',
      replyToDocId: doc.id,
      attachments: doc.attachments || [],
      createdById: currentUser.id,
      createdAt: new Date().toISOString(),
    };
    db.saveOutgoingDoc(newOutgoingDoc, currentUser);
    setActiveTarget({ type: 'OUTGOING_DOC', id: newOutgoingDoc.id, timestamp: Date.now() });
    setCurrentSection('OUTGOING_DOCS');
  };

  return (
    <div className="flex h-screen w-screen bg-slate-50 overflow-hidden font-sans text-slate-800 antialiased">
      {/* Sleek Sidebar */}
      <Sidebar
        currentSection={currentSection}
        onSelectSection={(sec) => setCurrentSection(sec)}
        currentUser={currentUser}
        isImpersonating={db.isImpersonating()}
        onReturnToAdmin={() => db.returnToAdminAccount()}
        onOpenDatabaseCenter={isLeaderOrAdmin(currentUser) ? () => setShowDatabaseCenterModal(true) : undefined}
        onOpenUserProfile={() => {
          setUserProfileTab('PROFILE');
          setShowUserProfileModal(true);
        }}
        onOpenUserSwitch={
          db.canSwitchUser()
            ? () => {
                const nextUser = users.find((u) => u.id !== currentUser?.id) || users[0];
                if (nextUser) {
                  db.switchUser(nextUser.id);
                }
              }
            : undefined
        }
        counts={counts}
      />

      {/* Main Content Workspace */}
      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Top Header */}
        <Header
          currentUser={currentUser}
          allUsers={users}
          canSwitchUser={db.canSwitchUser()}
          isImpersonating={db.isImpersonating()}
          adminOriginUser={db.getAdminOriginUser()}
          onSwitchUser={db.canSwitchUser() ? (userId) => db.switchUser(userId) : undefined}
          onReturnToAdmin={() => db.returnToAdminAccount()}
          onLogout={() => {
            db.logout(currentUser);
            setIsAuthenticated(false);
          }}
          onOpenUserProfile={() => {
            setUserProfileTab('PROFILE');
            setShowUserProfileModal(true);
          }}
          onOpenChangePassword={() => {
            setUserProfileTab('PASSWORD');
            setShowUserProfileModal(true);
          }}
          onOpenDatabaseCenter={isLeaderOrAdmin(currentUser) ? () => setShowDatabaseCenterModal(true) : undefined}
          notifications={userNotifications}
          onMarkNotificationAsRead={(id) => db.markNotificationAsRead(id)}
          onMarkAllAsRead={() => db.markAllNotificationsAsRead(currentUser.id)}
          onDeleteNotification={(id) => db.deleteNotification(id)}
          onOpenNotificationHistory={() => {
            setReminderInitialTab('NOTIFICATIONS');
            setCurrentSection('REMINDERS');
          }}
          onSelectNotificationTarget={handleSelectNotificationTarget}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
        />

        {/* Active View Router */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-slate-50 relative custom-scrollbar flex flex-col">
          {currentSection === 'DASHBOARD' && (
            <DashboardView
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              attachments={attachments}
              currentUser={currentUser}
              onSelectSection={(sec) => setCurrentSection(sec)}
              onOpenTaskDetail={() => setCurrentSection('ALL_TASKS')}
              onOpenIncomingDocDetail={() => setCurrentSection('INCOMING_DOCS')}
              onOpenDossierDetail={() => setCurrentSection('DOSSIERS')}
            />
          )}

          {currentSection === 'CLASSIFIER_STUDIO' && (
            canAccessClassificationStudio(currentUser) ? (
              <ClassificationStudioView
                users={users}
                dossiers={dossiers}
                incomingDocs={incomingDocs}
                currentUser={currentUser}
                onSaveIncomingDoc={(doc) => db.saveIncomingDoc(doc, currentUser)}
                onSaveDossier={(dos) => db.saveDossier(dos, currentUser)}
                onSaveTask={(task) => db.saveTask(task, currentUser)}
                onNavigateSection={(sec) => setCurrentSection(sec)}
              />
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center p-8 text-center bg-slate-50 my-auto">
                <div className="w-16 h-16 bg-amber-100 text-amber-700 rounded-2xl flex items-center justify-center mb-4 shadow-xs">
                  <Lock className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-800 mb-2">
                  Phân Hệ Dành Riêng Cho Văn Thư & Lãnh Đạo Cơ Quan
                </h3>
                <p className="text-xs text-slate-600 max-w-md leading-relaxed mb-6">
                  Theo quy định Nghị định 30/2020/NĐ-CP, phân hệ OCR và Phân loại văn bản đầu vào dành riêng cho Văn thư (tiếp nhận & vào sổ văn bản đến) và Lãnh đạo (thẩm định phân luồng). Chuyên viên tập trung theo dõi và thực thi các nhiệm vụ được giao.
                </p>
                <button
                  onClick={() => setCurrentSection('ALL_TASKS')}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition-all cursor-pointer"
                >
                  Chuyển Đến Bàn Làm Việc Nhiệm Vụ
                </button>
              </div>
            )
          )}

          {currentSection === 'INCOMING_DOCS' && (
            <IncomingDocsView
              docs={incomingDocs}
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              masterData={masterData}
              onSaveDoc={(doc) => db.saveIncomingDoc(doc, currentUser)}
              onDeleteDoc={(id) => db.deleteIncomingDoc(id, currentUser)}
              onDraftOutgoingDoc={handleDraftOutgoingDocFromIncomingDoc}
              onCreateTaskFromDoc={(doc) => {
                const newTaskId = 'task-' + Date.now();
                db.saveTask(
                  {
                    id: newTaskId,
                    code: 'CV-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 900 + 100),
                    title: `Xử lý VB đến: ${doc.summary.slice(0, 60)}...`,
                    description: `Căn cứ văn bản đến số ${doc.documentNumber} do ${doc.issuingAuthority} ban hành. Yêu cầu chủ trì nghiên cứu và thực hiện đúng thời hạn.`,
                    dossierId: doc.dossierId,
                    incomingDocId: doc.id,
                    linkedDocId: doc.id,
                    docTypeRelation: 'INCOMING',
                    createdById: currentUser.id,
                    creatorId: currentUser.id,
                    assigneeId: doc.assigneeId || currentUser.id,
                    coAssigneeIds: doc.coAssigneeIds || [],
                    priority: doc.urgency === 'HOA_TOC' ? 'URGENT' : doc.urgency === 'KHAN' ? 'HIGH' : 'MEDIUM',
                    startDate: new Date().toISOString().split('T')[0],
                    dueDate: doc.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                    progress: 0,
                    status: 'IN_PROGRESS',
                    subTasks: [
                      { id: 'sub-1', title: 'Tiếp nhận văn bản & nghiên cứu tài liệu đính kèm', completed: false },
                      { id: 'sub-2', title: 'Dự thảo phương án xử lý / văn bản trả lời', completed: false },
                      { id: 'sub-3', title: 'Báo cáo kết quả và trình Lãnh đạo nghiệm thu', completed: false },
                    ],
                    attachments: doc.attachments || [],
                  },
                  currentUser
                );

                const updatedLinkedTasks = [...(doc.linkedTaskIds || []), newTaskId];
                db.saveIncomingDoc(
                  {
                    ...doc,
                    status: doc.status === 'PENDING_ASSIGN' ? 'PROCESSING' : doc.status,
                    linkedTaskIds: updatedLinkedTasks,
                  },
                  currentUser
                );

                setActiveTarget({ type: 'TASK', id: newTaskId, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
              currentUser={currentUser}
              onOpenDossier={(dId) => {
                setActiveTarget({ type: 'DOSSIER', id: dId, timestamp: Date.now() });
                setCurrentSection('DOSSIERS');
              }}
              onOpenTaskDetail={(taskId) => {
                setActiveTarget({ type: 'TASK', id: taskId, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
              initialSelectedDocId={activeTarget?.type === 'INCOMING_DOC' ? activeTarget.id : undefined}
            />
          )}

          {currentSection === 'OUTGOING_DOCS' && (
            <OutgoingDocsView
              docs={outgoingDocs}
              incomingDocs={incomingDocs}
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              masterData={masterData}
              onSaveDoc={(doc) => db.saveOutgoingDoc(doc, currentUser)}
              onDeleteDoc={(id) => db.deleteOutgoingDoc(id, currentUser)}
              currentUser={currentUser}
              onOpenDossier={(dId) => {
                setActiveTarget({ type: 'DOSSIER', id: dId, timestamp: Date.now() });
                setCurrentSection('DOSSIERS');
              }}
              onOpenTaskDetail={(taskId) => {
                setActiveTarget({ type: 'TASK', id: taskId, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
              initialSelectedDocId={activeTarget?.type === 'OUTGOING_DOC' ? activeTarget.id : undefined}
            />
          )}

          {currentSection === 'ALL_TASKS' && (
            <TasksView
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              onSaveTask={(task) => db.saveTask(task, currentUser)}
              onDeleteTask={(id) => db.deleteTask(id, currentUser)}
              currentUser={currentUser}
              filterMode="ALL"
              onOpenDossier={(dId) => {
                setActiveTarget({ type: 'DOSSIER', id: dId, timestamp: Date.now() });
                setCurrentSection('DOSSIERS');
              }}
              onOpenIncomingDoc={(docId) => {
                setActiveTarget({ type: 'INCOMING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('INCOMING_DOCS');
              }}
              onDraftOutgoingDoc={handleDraftOutgoingDocFromTask}
              initialSelectedTaskId={activeTarget?.type === 'TASK' ? activeTarget.id : undefined}
              initialSubTarget={activeTarget?.type === 'TASK' ? activeTarget.subTarget : undefined}
              targetTimestamp={activeTarget?.timestamp}
            />
          )}

          {currentSection === 'MY_ASSIGNED_TASKS' && (
            <TasksView
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              onSaveTask={(task) => db.saveTask(task, currentUser)}
              onDeleteTask={(id) => db.deleteTask(id, currentUser)}
              currentUser={currentUser}
              filterMode="ASSIGNED_TO_ME"
              onOpenDossier={(dId) => {
                setActiveTarget({ type: 'DOSSIER', id: dId, timestamp: Date.now() });
                setCurrentSection('DOSSIERS');
              }}
              onOpenIncomingDoc={(docId) => {
                setActiveTarget({ type: 'INCOMING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('INCOMING_DOCS');
              }}
              onDraftOutgoingDoc={handleDraftOutgoingDocFromTask}
              initialSelectedTaskId={activeTarget?.type === 'TASK' ? activeTarget.id : undefined}
              initialSubTarget={activeTarget?.type === 'TASK' ? activeTarget.subTarget : undefined}
              targetTimestamp={activeTarget?.timestamp}
            />
          )}

          {currentSection === 'MY_DELEGATED_TASKS' && (
            <TasksView
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              onSaveTask={(task) => db.saveTask(task, currentUser)}
              onDeleteTask={(id) => db.deleteTask(id, currentUser)}
              currentUser={currentUser}
              filterMode="DELEGATED_BY_ME"
              onOpenDossier={(dId) => {
                setActiveTarget({ type: 'DOSSIER', id: dId, timestamp: Date.now() });
                setCurrentSection('DOSSIERS');
              }}
              onOpenIncomingDoc={(docId) => {
                setActiveTarget({ type: 'INCOMING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('INCOMING_DOCS');
              }}
              onDraftOutgoingDoc={handleDraftOutgoingDocFromTask}
              initialSelectedTaskId={activeTarget?.type === 'TASK' ? activeTarget.id : undefined}
              initialSubTarget={activeTarget?.type === 'TASK' ? activeTarget.subTarget : undefined}
              targetTimestamp={activeTarget?.timestamp}
            />
          )}

          {currentSection === 'DOSSIERS' && (
            <DossiersView
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              tasks={tasks}
              users={users}
              masterData={masterData}
              onSaveDossier={(dossier) => db.saveDossier(dossier, currentUser)}
              onDeleteDossier={(id) => db.deleteDossier(id, currentUser)}
              currentUser={currentUser}
              onOpenTaskDetail={(taskId) => {
                setActiveTarget({ type: 'TASK', id: taskId, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
              onOpenIncomingDocDetail={(docId) => {
                setActiveTarget({ type: 'INCOMING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('INCOMING_DOCS');
              }}
              onOpenOutgoingDocDetail={(docId) => {
                setActiveTarget({ type: 'OUTGOING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('OUTGOING_DOCS');
              }}
              initialDossierId={activeTarget?.type === 'DOSSIER' ? activeTarget.id : undefined}
              targetTimestamp={activeTarget?.timestamp}
            />
          )}

          {currentSection === 'CALENDAR' && (
            <CalendarView
              tasks={tasks}
              incomingDocs={incomingDocs}
              users={users}
              currentUser={currentUser}
              onOpenTaskDetail={(id) => {
                if (id) setActiveTarget({ type: 'TASK', id, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
              onOpenIncomingDocDetail={(id) => {
                if (id) setActiveTarget({ type: 'INCOMING_DOC', id, timestamp: Date.now() });
                setCurrentSection('INCOMING_DOCS');
              }}
            />
          )}

          {currentSection === 'REMINDERS' && (
            <RemindersView
              tasks={tasks}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              users={users}
              currentUser={currentUser}
              notifications={userNotifications}
              onMarkNotificationAsRead={(id) => db.markNotificationAsRead(id)}
              onMarkAllAsRead={() => db.markAllNotificationsAsRead(currentUser.id)}
              onDeleteNotification={(id) => db.deleteNotification(id)}
              onClearAllNotifications={() => db.clearAllNotifications(currentUser.id)}
              onNavigateToTarget={handleSelectNotificationTarget}
              initialTab={reminderInitialTab}
              onOpenTaskDetail={(taskId) => {
                if (taskId) setActiveTarget({ type: 'TASK', id: taskId, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
              onOpenIncomingDocDetail={(docId) => {
                if (docId) setActiveTarget({ type: 'INCOMING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('INCOMING_DOCS');
              }}
              onOpenOutgoingDocDetail={(docId) => {
                if (docId) setActiveTarget({ type: 'OUTGOING_DOC', id: docId, timestamp: Date.now() });
                setCurrentSection('OUTGOING_DOCS');
              }}
              onCreateNotification={(title, message, userId) => {
                db.addNotification(
                  {
                    title,
                    message,
                    userId,
                    type: 'DEADLINE_TODAY',
                    linkType: 'TASK',
                  },
                  currentUser
                );
              }}
            />
          )}

          {currentSection === 'PERSONNEL' && (
            <PersonnelView
              users={users}
              tasks={tasks}
              masterData={masterData}
              onSaveUser={(user) => db.saveUser(user, currentUser)}
              onDeleteUser={(id) => db.deleteUser(id, currentUser)}
              currentUser={currentUser}
              onOpenTaskDetail={(taskId) => {
                if (taskId) setActiveTarget({ type: 'TASK', id: taskId, timestamp: Date.now() });
                setCurrentSection('ALL_TASKS');
              }}
            />
          )}

          {currentSection === 'VAULT' && (
            <DocumentsVaultView
              attachments={attachments}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              tasks={tasks}
              users={users}
              onUploadFile={(file) => db.saveAttachment(file, currentUser)}
              onDeleteFile={(id) => db.deleteAttachment(id, currentUser)}
              currentUser={currentUser}
            />
          )}

          {currentSection === 'MASTER_DATA' && (
            <MasterDataView
              masterData={masterData}
              onUpdateMasterData={(newData) => db.saveMasterData(newData, currentUser)}
              currentUser={currentUser}
            />
          )}

          {currentSection === 'AUDIT_LOGS' && (
            <AuditLogsView
              logs={auditLogs}
              users={users}
              onRefresh={async () => {
                const freshLogs = await db.fetchAndRefreshAuditLogs();
                setAuditLogs(freshLogs);
              }}
            />
          )}

          {currentSection === 'AI_ASSISTANT' && (
            <AIAssistantView
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              currentUser={currentUser}
            />
          )}
        </main>
      </div>

      {/* Database Center & Domain Modal */}
      {isLeaderOrAdmin(currentUser) && showDatabaseCenterModal && (
        <DatabaseCenterModal
          isOpen={showDatabaseCenterModal}
          onClose={() => setShowDatabaseCenterModal(false)}
          onDataResetOrRestored={reloadData}
          currentUser={currentUser}
        />
      )}

      {/* User Profile & Password Modal */}
      <UserProfileModal
        isOpen={showUserProfileModal}
        onClose={() => setShowUserProfileModal(false)}
        currentUser={currentUser}
        onSaveProfile={(updatedUser) => {
          db.saveUser(updatedUser, currentUser);
          setCurrentUser(updatedUser);
          setUsers(db.getUsers());
        }}
        initialTab={userProfileTab}
      />

      {/* Change Password Modal (Fallback / Direct) */}
      <ChangePasswordModal
        isOpen={showChangePasswordModal}
        onClose={() => setShowChangePasswordModal(false)}
        currentUser={currentUser}
      />

      {/* Facebook-style Live Interactive Notification Toast */}
      <FacebookNotificationToast
        notifications={userNotifications}
        onMarkAsRead={(id) => db.markNotificationAsRead(id)}
        onNavigate={handleSelectNotificationTarget}
      />
    </div>
  );
};

export default App;
