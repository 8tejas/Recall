import React, { useEffect, useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  BookOpen,
  Calendar,
  Layers,
  Settings as SettingsIcon,
  ChevronRight,
  Plus,
  Compass,
  CheckCircle2,
  Clock,
  Sparkles,
  BookMarked,
  Sun,
  Moon,
  Menu,
  X
} from 'lucide-react';
import { fetchSubjects, fetchDueRevisions } from '../../api/client';
import { Subject, RevisionItem } from '../../types';
import { useAuthStore } from '../../store/authStore';
import { useThemeStore } from '../../store/themeStore';

export const AppLayout: React.FC = () => {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [dueCount, setDueCount] = useState<number>(0);
  const [expandedSubjects, setExpandedSubjects] = useState<Record<string, boolean>>({});
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const { user, loadUser } = useAuthStore();
  const { isDark, toggleTheme, initTheme } = useThemeStore();
  const location = useLocation();
  const navigate = useNavigate();

  const loadNavData = async () => {
    try {
      const [subjData, revData] = await Promise.all([fetchSubjects(), fetchDueRevisions()]);
      setSubjects(subjData);
      setDueCount(revData.filter(r => r.is_overdue).length);
    } catch (err) {
      console.error('Error fetching navigation data:', err);
    }
  };

  useEffect(() => {
    initTheme();
  }, []);

  useEffect(() => {
    loadUser();
    loadNavData();
    // Auto-close mobile drawer on navigation
    setMobileMenuOpen(false);
  }, [location.pathname]);

  const toggleSubject = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedSubjects(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const renderSidebarBody = (isMobile: boolean = false) => (
    <div className="flex flex-col flex-1 overflow-hidden">
      {/* Brand header */}
      <div className="p-4 border-b border-stone-200/80 dark:border-zinc-800 flex items-center justify-between">
        <div
          onClick={() => {
            navigate('/dashboard');
            if (isMobile) setMobileMenuOpen(false);
          }}
          className="flex items-center space-x-2.5 cursor-pointer"
        >
          <div className="w-7 h-7 rounded-md bg-stone-900 dark:bg-zinc-100 text-stone-50 dark:text-zinc-900 flex items-center justify-center font-bold text-sm tracking-wider shadow-sm">
            R
          </div>
          <div className="flex flex-col">
            <span className="font-semibold text-stone-900 dark:text-zinc-100 tracking-tight text-sm">Recall</span>
            <span className="text-[10px] text-stone-500 dark:text-zinc-400 font-mono tracking-wider">ACADEMIC MEMORY</span>
          </div>
        </div>

        <div className="flex items-center space-x-1">
          {/* Dark Mode Toggle */}
          <button
            onClick={toggleTheme}
            title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>

          {/* Close button for mobile drawer */}
          {isMobile && (
            <button
              onClick={() => setMobileMenuOpen(false)}
              className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
              title="Close Navigation"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Core navigation links */}
      <div className="px-3 pt-3 pb-2 space-y-1">
        <NavLink
          to="/dashboard"
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? 'bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 hover:text-stone-900 dark:hover:text-zinc-100'
            }`
          }
        >
          <div className="flex items-center space-x-2">
            <Compass className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
            <span>Dashboard</span>
          </div>
        </NavLink>

        <NavLink
          to="/revision"
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? 'bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 hover:text-stone-900 dark:hover:text-zinc-100'
            }`
          }
        >
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
            <span>Spaced Revision</span>
          </div>
          {dueCount > 0 && (
            <span className="px-1.5 py-0.5 text-[10px] rounded-full bg-amber-600 text-white font-mono font-semibold">
              {dueCount}
            </span>
          )}
        </NavLink>

        <NavLink
          to="/settings"
          onClick={() => isMobile && setMobileMenuOpen(false)}
          className={({ isActive }) =>
            `flex items-center justify-between px-2.5 py-1.5 rounded-md text-xs font-medium transition-colors ${
              isActive
                ? 'bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-semibold'
                : 'text-stone-600 dark:text-zinc-400 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 hover:text-stone-900 dark:hover:text-zinc-100'
            }`
          }
        >
          <div className="flex items-center space-x-2">
            <SettingsIcon className="w-4 h-4 text-stone-500 dark:text-zinc-400" />
            <span>Engine & Models</span>
          </div>
        </NavLink>
      </div>

      {/* Subjects Directory */}
      <div className="px-3 pt-4 pb-1 flex items-center justify-between">
        <span className="text-[11px] font-semibold text-stone-400 dark:text-zinc-500 uppercase tracking-wider font-mono">
          Subjects & Syllabi
        </span>
        <button
          onClick={() => {
            navigate('/subjects/new');
            if (isMobile) setMobileMenuOpen(false);
          }}
          title="Add New Syllabus"
          className="p-1 hover:bg-stone-200 dark:hover:bg-zinc-800 rounded text-stone-500 dark:text-zinc-400 hover:text-stone-900 dark:hover:text-zinc-100 transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Subject Items List */}
      <div className="flex-1 overflow-y-auto px-3 space-y-0.5">
        {subjects.length === 0 ? (
          <div className="px-2 py-4 text-center">
            <p className="text-xs text-stone-400 dark:text-zinc-500">No subjects yet.</p>
            <button
              onClick={() => {
                navigate('/subjects/new');
                if (isMobile) setMobileMenuOpen(false);
              }}
              className="mt-2 text-xs text-stone-800 dark:text-zinc-200 underline hover:text-stone-900 dark:hover:text-white font-medium"
            >
              + Add Syllabus
            </button>
          </div>
        ) : (
          subjects.map((sub) => {
            return (
              <div key={sub.id} className="group">
                <div
                  onClick={() => {
                    navigate(`/subjects/${sub.id}`);
                    if (isMobile) setMobileMenuOpen(false);
                  }}
                  className={`flex items-center justify-between px-2 py-1.5 rounded-md text-xs cursor-pointer transition-colors ${
                    location.pathname.startsWith(`/subjects/${sub.id}`)
                      ? 'bg-stone-200 dark:bg-zinc-800 text-stone-900 dark:text-zinc-100 font-medium'
                      : 'text-stone-700 dark:text-zinc-300 hover:bg-stone-200/60 dark:hover:bg-zinc-800/60 hover:text-stone-900 dark:hover:text-zinc-100'
                  }`}
                >
                  <div className="flex items-center space-x-1.5 truncate">
                    <BookOpen className="w-3.5 h-3.5 text-stone-400 dark:text-zinc-500 shrink-0" />
                    <span className="truncate">{sub.name}</span>
                  </div>
                  {sub.code && (
                    <span className="text-[10px] text-stone-400 dark:text-zinc-500 font-mono shrink-0 ml-1">
                      {sub.code}
                    </span>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer profile & system status */}
      <div className="p-3 border-t border-stone-200/80 dark:border-zinc-800 bg-stone-100/40 dark:bg-[#151517]">
        <div className="flex items-center justify-between text-xs text-stone-500 dark:text-zinc-400">
          <div className="flex items-center space-x-2 truncate">
            <div className="w-6 h-6 rounded-full bg-stone-300 dark:bg-zinc-700 text-stone-700 dark:text-zinc-200 flex items-center justify-center font-bold text-[10px]">
              {user?.name?.[0] || 'S'}
            </div>
            <span className="truncate text-stone-700 dark:text-zinc-200 font-medium">{user?.name || 'Academic Scholar'}</span>
          </div>
          <span className="text-[10px] bg-stone-200/80 dark:bg-zinc-800 text-stone-600 dark:text-zinc-300 px-1.5 py-0.5 rounded font-mono">
            FSRS
          </span>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex flex-col md:flex-row h-screen w-full bg-stone-50 dark:bg-[#121214] text-stone-900 dark:text-zinc-100 overflow-hidden font-sans transition-colors duration-150">
      {/* ── Mobile Top Header (hidden on desktop md+) ─────────────────── */}
      <header className="md:hidden flex items-center justify-between px-4 py-2.5 border-b border-stone-200 dark:border-zinc-800 bg-stone-100/90 dark:bg-[#18181b]/90 backdrop-blur-md sticky top-0 z-30 shrink-0">
        <div className="flex items-center space-x-2.5">
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-1.5 -ml-1 rounded-md text-stone-600 dark:text-zinc-300 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
            title="Open Menu"
          >
            <Menu className="w-5 h-5" />
          </button>
          <div
            onClick={() => navigate('/dashboard')}
            className="flex items-center space-x-2 cursor-pointer"
          >
            <div className="w-6 h-6 rounded bg-stone-900 dark:bg-zinc-100 text-stone-50 dark:text-zinc-900 flex items-center justify-center font-bold text-xs tracking-wider">
              R
            </div>
            <span className="font-semibold text-stone-900 dark:text-zinc-100 text-sm tracking-tight">Recall</span>
          </div>
        </div>

        <div className="flex items-center space-x-1.5">
          {dueCount > 0 && (
            <button
              onClick={() => navigate('/revision')}
              className="flex items-center space-x-1 px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 text-[10px] font-mono font-semibold"
            >
              <Calendar className="w-3 h-3" />
              <span>{dueCount}</span>
            </button>
          )}
          <button
            onClick={toggleTheme}
            title={isDark ? "Light Mode" : "Dark Mode"}
            className="p-1.5 rounded-md text-stone-500 hover:text-stone-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:bg-stone-200 dark:hover:bg-zinc-800 transition-colors"
          >
            {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
          </button>
        </div>
      </header>

      {/* ── Mobile Sliding Drawer (hidden on desktop md+) ─────────────── */}
      {mobileMenuOpen && (
        <div
          onClick={() => setMobileMenuOpen(false)}
          className="fixed inset-0 bg-black/50 backdrop-blur-xs z-40 md:hidden animate-fade-in"
        />
      )}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 max-w-[85vw] bg-stone-100 dark:bg-[#18181b] border-r border-stone-200 dark:border-zinc-800 flex flex-col justify-between select-none shadow-2xl transition-transform duration-200 ease-in-out md:hidden ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {renderSidebarBody(true)}
      </aside>

      {/* ── Desktop Persistent Sidebar (hidden on mobile <md) ─────────── */}
      <aside className="hidden md:flex md:w-64 md:shrink-0 border-r border-stone-200 dark:border-zinc-800 bg-stone-100/70 dark:bg-[#18181b] flex-col justify-between select-none">
        {renderSidebarBody(false)}
      </aside>

      {/* ── Main Content Viewport ────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full overflow-hidden bg-white dark:bg-[#121214]">
        <div className="flex-1 overflow-y-auto">
          <Outlet />
        </div>
      </main>
    </div>
  );
};
