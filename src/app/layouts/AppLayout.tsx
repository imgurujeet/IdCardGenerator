import { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  Layout,
  Users,
  FileCheck2,
  FolderOpen,
  Sparkles,
  Settings,
  ChevronDown,
  Menu,
  X,
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { Organization } from '../../types/database';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState(organizationService.getActiveOrgId());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    async function loadOrgs() {
      const list = await organizationService.getOrganizations();
      setOrgs(list);
    }
    loadOrgs();
  }, []);

  const handleOrgChange = (newId: string) => {
    organizationService.setActiveOrgId(newId);
    setCurrentOrgId(newId);
    window.location.reload(); // Refresh to update active tenant state
  };

  const navItems = [
    { to: '/', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/templates', label: 'ID Templates', icon: Layout },
    { to: '/records', label: 'Records & Data', icon: Users },
    { to: '/forms', label: 'Collection Forms', icon: FileCheck2 },
    { to: '/assets', label: 'Media Library', icon: FolderOpen },
    { to: '/requests', label: 'Design Requests', icon: Sparkles },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];



  return (
    <div className="min-h-screen flex bg-surface-50">
      {/* Desktop Left Sidebar */}
      <aside className="hidden lg:flex w-64 bg-white border-r border-surface-200 flex-col justify-between shrink-0 select-none z-20">
        <div>
          {/* Brand Header */}
          <div className="h-16 px-5 border-b border-surface-200 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-brand-600 text-white flex items-center justify-center font-bold text-sm shadow-sm">
                ID
              </div>
              <div className="leading-tight">
                <span className="font-bold text-sm text-surface-900 tracking-tight block">IDForge SaaS</span>
                <span className="text-[10px] text-surface-400 block font-mono">v1.0 • Enterprise</span>
              </div>
            </div>
          </div>

          {/* Organization Switcher */}
          <div className="p-3 border-b border-surface-100">
            <label className="text-[10px] font-semibold uppercase tracking-wider text-surface-400 block px-2 mb-1.5">
              Workspace
            </label>
            <div className="relative">
              <select
                value={currentOrgId}
                onChange={(e) => handleOrgChange(e.target.value)}
                className="w-full appearance-none bg-surface-50 hover:bg-surface-100/80 border border-surface-200 rounded-lg px-3 py-2 text-xs font-semibold text-surface-900 outline-none cursor-pointer pr-8 transition-colors"
              >
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 text-surface-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-3 space-y-1">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive =
                item.to === '/'
                  ? location.pathname === '/'
                  : location.pathname.startsWith(item.to);

              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                    isActive
                      ? 'bg-brand-50 text-brand-700 font-semibold shadow-xs'
                      : 'text-surface-600 hover:text-surface-900 hover:bg-surface-100'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-brand-600' : 'text-surface-500'}`} />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>
        </div>

        {/* User Profile Bar */}
        <div className="p-4 border-t border-surface-200 flex items-center justify-between">
          <div className="flex items-center gap-2.5 truncate">
            <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
              SJ
            </div>
            <div className="truncate text-xs">
              <p className="font-semibold text-surface-900 truncate">Dr. Sarah Jenkins</p>
              <p className="text-[10px] text-surface-400 truncate">Administrator</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile Top Header */}
        <header className="lg:hidden h-14 bg-white border-b border-surface-200 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-brand-600 text-white flex items-center justify-center font-bold text-xs">
              ID
            </div>
            <span className="font-bold text-sm text-surface-900">IDForge</span>
          </div>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-1.5 text-surface-600 hover:text-surface-900 rounded-md"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </header>

        {/* Mobile Nav Overlay */}
        {mobileMenuOpen && (
          <div className="lg:hidden bg-white border-b border-surface-200 p-4 space-y-2 z-30">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMobileMenuOpen(false)}
                className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium text-surface-700 hover:bg-surface-100"
              >
                <item.icon className="w-4 h-4 text-surface-500" />
                <span>{item.label}</span>
              </NavLink>
            ))}
          </div>
        )}

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
