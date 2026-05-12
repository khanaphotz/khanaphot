import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LayoutDashboard, History, ShieldEllipsis, LogOut } from 'lucide-react';
import { cn } from '../lib/utils';

const Navbar: React.FC = () => {
  const { user, logout, isAdmin } = useAuth();
  const navigate = useNavigate();

  if (!user) return null;

  return (
    <nav className="sticky top-0 z-50 px-4 py-3">
      <div className="max-w-6xl mx-auto glass-card flex items-center justify-between px-6 py-3 border-neutral-700/50">
        <div className="flex items-center gap-8">
          <NavLink to="/" className="font-display font-bold text-xl text-ai-gradient hidden md:block">
            [DMK] Room Reservation
          </NavLink>
          
          <div className="flex items-center gap-1 md:gap-4">
            <NavLink 
              to="/" 
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-neutral-800",
                isActive ? "text-red-500 bg-red-500/10" : "text-neutral-400"
              )}
            >
              <LayoutDashboard className="w-4 h-4" />
              <span className="hidden sm:inline">Booking</span>
            </NavLink>
            
            <NavLink 
              to="/history" 
              className={({ isActive }) => cn(
                "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-neutral-800",
                isActive ? "text-red-500 bg-red-500/10" : "text-neutral-400"
              )}
            >
              <History className="w-4 h-4" />
              <span className="hidden sm:inline">History</span>
            </NavLink>

            {isAdmin && (
              <>
                <NavLink 
                  to="/admin" 
                  end
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-neutral-800",
                    isActive ? "text-red-500 bg-red-500/10" : "text-neutral-400"
                  )}
                >
                  <ShieldEllipsis className="w-4 h-4" />
                  <span className="hidden sm:inline">Admin</span>
                </NavLink>
                <NavLink 
                  to="/admin/management" 
                  className={({ isActive }) => cn(
                    "flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all hover:bg-neutral-800",
                    isActive ? "text-red-500 bg-red-500/10" : "text-neutral-400"
                  )}
                >
                  <ShieldEllipsis className="w-4 h-4 opacity-50" />
                  <span className="hidden sm:inline text-[10px]">Manage Admins</span>
                </NavLink>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden sm:flex flex-col items-end">
            <span className="text-xs font-bold text-neutral-100">{user.displayName}</span>
            <span className="text-[10px] text-neutral-500">{user.email}</span>
          </div>
          <button 
            onClick={() => {
              logout();
              navigate('/login');
            }}
            className="p-2 text-neutral-400 hover:text-red-500 transition-colors"
            title="Sign Out"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
