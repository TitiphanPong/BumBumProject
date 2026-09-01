import Providers from '../providers';
import AppFooter from './components/Footer';
import AppHeader from './components/Header';
import DesktopSidebarGate from './components/DesktopSidebarGate';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <div className="flex min-h-screen bg-[#f5f5f5]">
        <DesktopSidebarGate />
        <div className="flex min-w-0 flex-1 flex-col">
          <AppHeader />
          <main className="mx-4 my-6 flex-1 p-[5px]">{children}</main>
          <AppFooter />
        </div>
      </div>
    </Providers>
  );
}
