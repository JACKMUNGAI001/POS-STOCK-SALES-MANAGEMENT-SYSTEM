import { useContext, useState } from "react";
import { AuthContext } from "../context/AuthContext";
import { ThemeContext } from "../context/ThemeContext";
import { SearchContext } from "../context/SearchContext";
import { useNavigate } from "react-router-dom";
import { LogOut, ArrowLeft, Settings, Search, Sun, Moon, X, Menu, Calendar, Type } from "lucide-react";

export default function Header({ onMenuClick }) {
  const { user, logout } = useContext(AuthContext);
  const { isDarkMode, toggleDarkMode } = useContext(ThemeContext);
  const { searchQuery, setSearchQuery, searchType, setSearchType, clearSearch } = useContext(SearchContext);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login");
  };

  return (
    <header className="bg-transparent mb-6 md:mb-8 flex flex-wrap justify-between items-center gap-2 sm:gap-4">
      <div className="flex min-w-0 items-center gap-2 md:gap-6">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 rounded-lg shadow-sm"
        >
          <Menu size={20} />
        </button>
        <button
          onClick={() => navigate(-1)}
          className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 py-2 px-3 md:px-4 rounded-lg shadow-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-all flex items-center gap-2 font-medium"
        >
          <ArrowLeft size={18} /> <span className="hidden sm:inline">Back</span>
        </button>
        <div className="hidden md:block">
          <h2 className="text-xl md:text-3xl font-bold text-gray-800 dark:text-white tracking-tight transition-colors">
            Welcome, {user?.name ? user.name.split(' ')[0] : 'User'}!
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 font-medium capitalize mt-1 transition-colors">
            {user?.role} Dashboard
          </p>
        </div>
      </div>

      <div className="ml-auto flex max-w-full items-center gap-2 md:gap-4">
        <div className="flex items-center gap-1 md:gap-2 px-2 md:px-4 py-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-100 dark:border-gray-700 transition-colors relative">
          {isSearchOpen ? (
            <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-300">
              <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                <button 
                  onClick={() => {
                    setSearchType(searchType === 'name' ? 'date' : 'name');
                    setSearchQuery('');
                  }}
                  className="px-3 py-1.5 bg-gray-100 dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 text-gray-500 hover:text-blue-600 dark:hover:text-blue-400 transition-colors flex items-center gap-1"
                  title={`Switch to ${searchType === 'name' ? 'Date' : 'Name'} Search`}
                >
                  {searchType === 'name' ? <Type size={14} /> : <Calendar size={14} />}
                </button>
                <div className="relative flex items-center">
                  <Search size={14} className="absolute left-3 text-gray-400" />
                  <input
                    type={searchType === 'name' ? "text" : "date"}
                    placeholder={searchType === 'name' ? "Search products..." : ""}
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    autoFocus
                    className="pl-9 pr-1 py-1.5 bg-transparent rounded-lg text-sm text-gray-700 dark:text-gray-200 focus:outline-none transition-all w-24 sm:w-48 md:w-64"
                  />
                </div>
              </div>
              <button 
                onClick={() => {
                  setIsSearchOpen(false);
                  clearSearch();
                }}
                className="p-1 text-gray-400 hover:text-red-500 transition-colors"
                title="Clear Search"
              >
                <X size={18} />
              </button>
            </div>
          ) : (
            <>
              <button 
                onClick={toggleDarkMode}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title={isDarkMode ? "Light Mode" : "Dark Mode"}
              >
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button 
                onClick={() => setIsSearchOpen(true)}
                className={`p-2 transition-colors relative ${searchQuery ? 'text-blue-600 dark:text-blue-400' : 'text-gray-400 hover:text-blue-600 dark:hover:text-blue-400'}`}
                title="Search"
              >
                {searchType === 'name' ? <Search size={20}/> : <Calendar size={20}/>}
                {searchQuery && <span className="absolute top-2 right-2 w-2 h-2 bg-blue-600 rounded-full"></span>}
              </button>

              <button 
                onClick={() => navigate("/profile")}
                className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                title="Settings & Profile"
              >
                <Settings size={20}/>
              </button>
            </>
          )}
        </div>
        <button
          onClick={handleLogout}
          className="bg-[#ef4444] text-white p-3 md:py-3 md:px-6 rounded-xl font-bold shadow-lg shadow-red-200 hover:bg-red-600 transition-all flex items-center gap-2"
        >
          <LogOut size={20} /> <span className="hidden md:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
