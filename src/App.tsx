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

export const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => db.isAuthenticated());
  const [showChangePasswordModal, setShowChangePasswordModal] = useState<boolean>(false);
  const [showUserProfileModal, setShowUserProfileModal] = useState<boolean>(false);
  const [userProfileTab, setUserProfileTab] = useState<'PROFILE' | 'PASSWORD'>('PROFILE');
  const [showDatabaseCenterModal, setShowDatabaseCenterModal] = useState<boolean>(false);

  // Navigation State
  const [currentSection, setCurrentSection] = useState<NavSection>('DASHBOARD');
  const [searchQuery, setSearchQuery] = useState('');

  // Active target for notification deep-linking (Facebook-style navigation)
  const [activeTarget, setActiveTarget] = useState<{
    type: 'TASK' | 'INCOMING_DOC' | 'OUTGOING_DOC' | 'DOSSIER';
    id: string;
    timestamp: number;
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

    const unsubscribe = db.subscribe(() => {
      reloadData();
    });
    return () => unsubscribe();
  }, []);

  // Compute counts for sidebar
  const counts = useMemo(() => {
    const today = new Date().toISOString().split('T')[0];
    const incoming = incomingDocs.length;
    const outgoing = outgoingDocs.length;
    const myTasks = tasks.filter(
      (t) => (t.assigneeId === currentUser?.id || t.coAssigneeIds?.includes(currentUser?.id)) && t.status !== 'COMPLETED'
    ).length;
    const overdue = tasks.filter(
      (t) => (t.status === 'OVERDUE' || t.dueDate < today) && t.status !== 'COMPLETED' && t.status !== 'CANCELLED'
    ).length;
    const unreadNotifs = notifications.filter((n) => !n.isRead).length;

    return { incoming, outgoing, myTasks, overdue, reminders: unreadNotifs };
  }, [incomingDocs, outgoingDocs, tasks, currentUser, notifications]);

  // If user is not authenticated, show modern Login view
  if (!isAuthenticated) {
    return (
      <LoginView
        onLoginSuccess={(user) => {
          setCurrentUser(user);
          setIsAuthenticated(true);
        }}
      />
    );
  }

  // Notification target click (Facebook-style deep linking)
  const handleSelectNotificationTarget = (type?: string, id?: string) => {
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
    
    setActiveTarget({ type: normalizedType, id, timestamp: Date.now() });
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
        onOpenDatabaseCenter={() => setShowDatabaseCenterModal(true)}
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
          onOpenDatabaseCenter={() => setShowDatabaseCenterModal(true)}
          notifications={notifications}
          onMarkNotificationAsRead={(id) => db.markNotificationAsRead(id)}
          onMarkAllAsRead={() => db.markAllNotificationsAsRead()}
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
              onSelectSection={(sec) => setCurrentSection(sec)}
              onOpenTaskDetail={() => setCurrentSection('ALL_TASKS')}
              onOpenIncomingDocDetail={() => setCurrentSection('INCOMING_DOCS')}
              onOpenDossierDetail={() => setCurrentSection('DOSSIERS')}
            />
          )}

          {currentSection === 'CLASSIFIER_STUDIO' && (
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
          )}

          {currentSection === 'INCOMING_DOCS' && (
            <IncomingDocsView
              docs={incomingDocs}
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              onSaveDoc={(doc) => db.saveIncomingDoc(doc, currentUser)}
              onDeleteDoc={(id) => db.deleteIncomingDoc(id, currentUser)}
              onCreateTaskFromDoc={(doc) => {
                db.saveTask(
                  {
                    id: 'task-' + Date.now(),
                    code: 'CV-' + new Date().getFullYear() + '-' + Math.floor(Math.random() * 900 + 100),
                    title: `Xử lý VB đến: ${doc.summary.slice(0, 60)}...`,
                    description: `Căn cứ văn bản đến số ${doc.documentNumber} do ${doc.issuingAuthority} ban hành. Yêu cầu nghiên cứu và thực hiện đúng thời hạn.`,
                    dossierId: doc.dossierId,
                    incomingDocId: doc.id,
                    linkedDocId: doc.id,
                    docTypeRelation: 'INCOMING',
                    createdById: currentUser.id,
                    assigneeId: doc.assigneeId || currentUser.id,
                    coAssigneeIds: doc.coAssigneeIds || [],
                    priority: doc.urgency === 'HOA_TOC' ? 'URGENT' : doc.urgency === 'KHAN' ? 'HIGH' : 'MEDIUM',
                    startDate: new Date().toISOString().split('T')[0],
                    dueDate: doc.dueDate || new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0],
                    progress: 0,
                    status: 'IN_PROGRESS',
                    subTasks: [
                      { id: 'sub-1', title: 'Nghiên cứu văn bản và tài liệu đính kèm', completed: false },
                      { id: 'sub-2', title: 'Soạn thảo văn bản phản hồi / báo cáo kết quả', completed: false },
                    ],
                    attachments: doc.attachments || [],
                  },
                  currentUser
                );
                setCurrentSection('ALL_TASKS');
              }}
              currentUser={currentUser}
              onOpenDossier={() => setCurrentSection('DOSSIERS')}
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
              onSaveDoc={(doc) => db.saveOutgoingDoc(doc, currentUser)}
              onDeleteDoc={(id) => db.deleteOutgoingDoc(id, currentUser)}
              currentUser={currentUser}
              onOpenDossier={() => setCurrentSection('DOSSIERS')}
              initialSelectedDocId={activeTarget?.type === 'OUTGOING_DOC' ? activeTarget.id : undefined}
            />
          )}

          {currentSection === 'ALL_TASKS' && (
            <TasksView
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              onSaveTask={(task) => db.saveTask(task, currentUser)}
              onDeleteTask={(id) => db.deleteTask(id, currentUser)}
              currentUser={currentUser}
              filterMode="ALL"
              onOpenDossier={() => setCurrentSection('DOSSIERS')}
              initialSelectedTaskId={activeTarget?.type === 'TASK' ? activeTarget.id : undefined}
            />
          )}

          {currentSection === 'MY_ASSIGNED_TASKS' && (
            <TasksView
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              onSaveTask={(task) => db.saveTask(task, currentUser)}
              onDeleteTask={(id) => db.deleteTask(id, currentUser)}
              currentUser={currentUser}
              filterMode="ASSIGNED_TO_ME"
              onOpenDossier={() => setCurrentSection('DOSSIERS')}
              initialSelectedTaskId={activeTarget?.type === 'TASK' ? activeTarget.id : undefined}
            />
          )}

          {currentSection === 'MY_DELEGATED_TASKS' && (
            <TasksView
              tasks={tasks}
              users={users}
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              onSaveTask={(task) => db.saveTask(task, currentUser)}
              onDeleteTask={(id) => db.deleteTask(id, currentUser)}
              currentUser={currentUser}
              filterMode="DELEGATED_BY_ME"
              onOpenDossier={() => setCurrentSection('DOSSIERS')}
              initialSelectedTaskId={activeTarget?.type === 'TASK' ? activeTarget.id : undefined}
            />
          )}

          {currentSection === 'DOSSIERS' && (
            <DossiersView
              dossiers={dossiers}
              incomingDocs={incomingDocs}
              outgoingDocs={outgoingDocs}
              tasks={tasks}
              users={users}
              onSaveDossier={(dossier) => db.saveDossier(dossier, currentUser)}
              onDeleteDossier={(id) => db.deleteDossier(id, currentUser)}
              currentUser={currentUser}
              onOpenTaskDetail={() => setCurrentSection('ALL_TASKS')}
              onOpenIncomingDocDetail={() => setCurrentSection('INCOMING_DOCS')}
              initialDossierId={activeTarget?.type === 'DOSSIER' ? activeTarget.id : undefined}
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
              users={users}
              onOpenTaskDetail={() => setCurrentSection('ALL_TASKS')}
              onOpenIncomingDocDetail={() => setCurrentSection('INCOMING_DOCS')}
              onCreateNotification={(title, message, userId) => {
                db.addNotification({
                  title,
                  message,
                  userId,
                  type: 'DEADLINE_TODAY',
                  linkType: 'TASK',
                });
              }}
            />
          )}

          {currentSection === 'PERSONNEL' && (
            <PersonnelView
              users={users}
              tasks={tasks}
              onSaveUser={(user) => db.saveUser(user, currentUser)}
              onDeleteUser={(id) => db.deleteUser(id, currentUser)}
              currentUser={currentUser}
              onOpenTaskDetail={() => setCurrentSection('ALL_TASKS')}
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

          {currentSection === 'AUDIT_LOGS' && <AuditLogsView logs={auditLogs} users={users} />}

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
      <DatabaseCenterModal
        isOpen={showDatabaseCenterModal}
        onClose={() => setShowDatabaseCenterModal(false)}
        onDataResetOrRestored={reloadData}
      />

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
        notifications={notifications}
        onMarkAsRead={(id) => db.markNotificationAsRead(id)}
        onNavigate={handleSelectNotificationTarget}
      />
    </div>
  );
};

export default App;
