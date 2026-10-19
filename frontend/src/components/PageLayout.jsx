import React, { useContext, useState } from 'react';
import Sidebar from './Sidebar';
import Header from './Header';
import { AuthContext } from '../context/AuthContext';

export default function PageLayout({ children, role, title }) {
  const { user } = useContext(AuthContext);
  const currentRole = role || user?.role;
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="flex bg-[#f1f5f9] dark:bg-[#0f172a] min-h-screen transition-colors duration-300 relative overflow-x-hidden">
      {/* Sidebar - Responsive handling */}
      <div className={`fixed inset-0 z-40 transition-opacity bg-black/50 lg:hidden ${isSidebarOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={toggleSidebar} />
      
      <div className={`fixed inset-y-0 left-0 z-50 lg:relative lg:self-stretch lg:translate-x-0 transition-transform duration-300 ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <Sidebar role={currentRole} onClose={() => setIsSidebarOpen(false)} />
      </div>

      <main className="min-w-0 flex-1 p-3 sm:p-4 md:p-8 max-w-7xl mx-auto w-full relative">
        <Header onMenuClick={toggleSidebar} />
        {title && <h1 className="text-xl md:text-2xl font-bold text-gray-800 dark:text-white mb-6">{title}</h1>}
        <div className="w-full overflow-hidden">
          {children}
        </div>
      </main>
    </div>
  );
}
