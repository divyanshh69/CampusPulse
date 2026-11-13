import React, { useState } from 'react';
import { ClubStoreProvider, useClubStore } from './hooks/useClubStore';
import { Sidebar } from './components/layout/Sidebar';
import { Header } from './components/layout/Header';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { MembersPage } from './pages/MembersPage';
import { EventsPage } from './pages/EventsPage';
import { AttendancePage } from './pages/AttendancePage';
import { CreditsPage } from './pages/CreditsPage';
import { TasksPage } from './pages/TasksPage';
import { ProfilePage } from './pages/ProfilePage';
import { SettingsPage } from './pages/SettingsPage';
import { NotificationsPage } from './pages/NotificationsPage';

const AppShell: React.FC = () => {
  const { currentPage, isAuthenticated, isLoadingAuth } = useClubStore();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Show clean workspace loading indicator while restoring token from backend
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 text-slate-900">
        <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-xs font-bold text-white font-mono animate-pulse">
          CP
        </div>
        <p className="mt-3 text-xs font-medium text-slate-500 font-display">
          Verifying session & loading workspace...
        </p>
      </div>
    );
  }

  // Enforce route protection: unauthenticated users cannot access protected views
  if (!isAuthenticated || currentPage === 'login') {
    return <LoginPage />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case 'dashboard':
        return <DashboardPage />;
      case 'members':
        return <MembersPage />;
      case 'events':
        return <EventsPage />;
      case 'attendance':
        return <AttendancePage />;
      case 'credits':
        return <CreditsPage />;
      case 'tasks':
        return <TasksPage />;
      case 'profile':
        return <ProfilePage />;
      case 'settings':
        return <SettingsPage />;
      case 'notifications':
        return <NotificationsPage />;
      default:
        return <DashboardPage />;
    }
  };

  return (
    <div className="flex min-h-screen bg-slate-50 text-slate-900">
      <Sidebar
        isOpenMobile={isMobileMenuOpen}
        onCloseMobile={() => setIsMobileMenuOpen(false)}
      />

      <div className="flex flex-1 flex-col min-w-0">
        <Header onOpenMobileMenu={() => setIsMobileMenuOpen(true)} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1360px] w-full mx-auto">
          {renderPage()}
        </main>
      </div>
    </div>
  );
};

export default function App() {
  return (
    <ClubStoreProvider>
      <AppShell />
    </ClubStoreProvider>
  );
}
