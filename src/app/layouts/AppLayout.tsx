import React, { useState, useEffect } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
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
  Plus,
  LogOut,
  Building2,
  Check,
  Loader2,
} from 'lucide-react';
import { organizationService } from '../../services/organization.service';
import { authService, AuthUser } from '../../services/auth.service';
import { Organization } from '../../types/database';

export const AppLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(null);
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [currentOrgId, setCurrentOrgId] = useState(organizationService.getActiveOrgId());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // New Project / College Modal State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newOrgName, setNewOrgName] = useState('');
  const [newOrgCategory, setNewOrgCategory] = useState('College');
  const [isCreatingOrg, setIsCreatingOrg] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function init() {
      // Check session first (handles OAuth return from Google)
      await authService.getSession();
      const user = await authService.getCurrentUser();

      if (!user) {
        if (isMounted) navigate('/login');
        return;
      }

      if (isMounted) {
        setCurrentUser(user);
        const list = await organizationService.getOrganizations();
        setOrgs(list);
        if (list.length === 0) {
          setShowCreateModal(true);
        } else {
          const activeId = organizationService.getActiveOrgId();
          const match = list.find((o) => o.id === activeId) || list[0];
          setCurrentOrgId(match.id);
          organizationService.setActiveOrgId(match.id);
        }
      }
    }

    init();

    const sub = authService.onAuthStateChange(async (user) => {
      if (!isMounted) return;
      if (user) {
        setCurrentUser(user);
        const list = await organizationService.getOrganizations();
        setOrgs(list);
        if (list.length === 0) {
          setShowCreateModal(true);
        } else {
          const activeId = organizationService.getActiveOrgId();
          const match = list.find((o) => o.id === activeId) || list[0];
          setCurrentOrgId(match.id);
          organizationService.setActiveOrgId(match.id);
        }
      } else {
        navigate('/login');
      }
    });

    return () => {
      isMounted = false;
      sub.unsubscribe();
    };
  }, [navigate]);

  const handleOrgChange = (newId: string) => {
    organizationService.setActiveOrgId(newId);
    setCurrentOrgId(newId);
    window.location.reload(); // Refresh to update active tenant state
  };

  const handleCreateCollege = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;

    try {
      setIsCreatingOrg(true);
      const created = await organizationService.createOrganization({
        name: newOrgName.trim(),
        industry: newOrgCategory,
      });

      setShowCreateModal(false);
      setNewOrgName('');
      organizationService.setActiveOrgId(created.id);
      setCurrentOrgId(created.id);
      window.location.reload();
    } catch (err) {
      console.error('Failed to create college project:', err);
      alert('Could not create college project. Please try again.');
    } finally {
      setIsCreatingOrg(false);
    }
  };

  const handleSignOut = async () => {
    await authService.signOut();
    navigate('/login');
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
                <span className="text-[10px] text-surface-400 block font-mono">v1.0 • Multi-College</span>
              </div>
            </div>
          </div>

          {/* College / Project Switcher */}
          <div className="p-3 border-b border-surface-100 bg-surface-50/50">
            <div className="flex items-center justify-between px-2 mb-1.5">
              <label className="text-[10px] font-bold uppercase tracking-wider text-surface-500 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-brand-600" />
                <span>Active College / Project</span>
              </label>
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                title="Create New College Project"
                className="inline-flex items-center gap-0.5 text-[11px] font-bold text-brand-600 hover:text-brand-800 transition-colors"
              >
                <Plus className="w-3 h-3" />
                <span>New</span>
              </button>
            </div>

            {orgs.length === 0 ? (
              <button
                type="button"
                onClick={() => setShowCreateModal(true)}
                className="w-full py-2.5 px-3 bg-brand-50 hover:bg-brand-100 border border-dashed border-brand-300 rounded-lg text-xs font-bold text-brand-700 flex items-center justify-center gap-1.5 transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5 text-brand-600" />
                <span>+ Create Your First College</span>
              </button>
            ) : (
              <div className="relative">
                <select
                  value={orgs.some((o) => o.id === currentOrgId) ? currentOrgId : (orgs[0]?.id || '')}
                  onChange={(e) => {
                    if (e.target.value === '__NEW__') {
                      setShowCreateModal(true);
                    } else {
                      handleOrgChange(e.target.value);
                    }
                  }}
                  className="w-full appearance-none bg-white hover:bg-surface-50 border border-surface-300 rounded-lg px-3 py-2 text-xs font-semibold text-surface-900 outline-none cursor-pointer pr-8 shadow-xs transition-colors"
                >
                  {orgs.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                  <option value="__NEW__" className="text-brand-600 font-bold">
                    + Add New College / Project...
                  </option>
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-surface-500 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              </div>
            )}
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

        {/* User Profile Bar & Sign Out */}
        <div className="p-3 border-t border-surface-200 bg-surface-50/30">
          <div className="flex items-center justify-between gap-2 p-2 rounded-xl bg-white border border-surface-200 shadow-xs">
            <div className="flex items-center gap-2 truncate">
              <div className="w-8 h-8 rounded-full bg-brand-100 text-brand-700 font-bold flex items-center justify-center text-xs shrink-0">
                {currentUser?.fullName?.charAt(0) || 'U'}
              </div>
              <div className="truncate text-xs">
                <p className="font-bold text-surface-900 truncate leading-tight">
                  {currentUser?.fullName || 'User'}
                </p>
                <p className="text-[10px] text-surface-400 truncate leading-tight">
                  {currentUser?.email || 'Logged in'}
                </p>
              </div>
            </div>

            <button
              onClick={handleSignOut}
              title="Sign Out"
              className="p-1.5 text-surface-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
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

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowCreateModal(true)}
              className="p-1.5 text-brand-600 hover:bg-brand-50 rounded-md font-semibold text-xs flex items-center gap-1"
            >
              <Plus className="w-4 h-4" />
              <span>New College</span>
            </button>
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-1.5 text-surface-600 hover:text-surface-900 rounded-md"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
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
            <div className="pt-2 border-t border-surface-100 flex items-center justify-between">
              <span className="text-xs text-surface-500">{currentUser?.email}</span>
              <button
                onClick={handleSignOut}
                className="text-xs font-semibold text-red-600 hover:underline"
              >
                Sign Out
              </button>
            </div>
          </div>
        )}

        {/* Page Body Viewport */}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>

      {/* Create New College / Project Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-surface-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-surface-100 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-brand-50 text-brand-600 flex items-center justify-center">
                  <Building2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-surface-900">Create New College / Project</h3>
                  <p className="text-[11px] text-surface-500">Each college has its own templates and registration link.</p>
                </div>
              </div>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-surface-400 hover:text-surface-700 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateCollege} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  College or Organization Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={newOrgName}
                  onChange={(e) => setNewOrgName(e.target.value)}
                  placeholder="e.g. Primary Teacher Education College Barh (Patna)"
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-surface-700 mb-1">
                  Institution Type / Category
                </label>
                <select
                  value={newOrgCategory}
                  onChange={(e) => setNewOrgCategory(e.target.value)}
                  className="w-full px-3 py-2 border border-surface-300 rounded-lg text-xs bg-white outline-none focus:border-brand-500 font-medium"
                >
                  <option value="Teacher Training College">Teacher Training College (PTEC / B.Ed / D.El.Ed)</option>
                  <option value="Degree College">Degree / Arts / Science College</option>
                  <option value="Higher Secondary School">Higher Secondary / High School</option>
                  <option value="Coaching Institute">Coaching / Training Institute</option>
                  <option value="Hospital / Healthcare">Hospital / Medical Center</option>
                  <option value="Corporate / Company">Corporate / Company</option>
                </select>
              </div>

              <div className="pt-3 border-t border-surface-100 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 text-xs font-semibold text-surface-600 hover:text-surface-900"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCreatingOrg || !newOrgName.trim()}
                  className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg text-xs font-bold shadow-sm transition-all flex items-center gap-1.5 disabled:opacity-50"
                >
                  {isCreatingOrg ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span>Creating...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Create & Switch to College</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
