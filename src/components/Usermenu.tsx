import { useRef, useState, useEffect } from 'react'
import { LogOut, User, ChevronDown, LayoutDashboard, Sparkles } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

interface UserMenuProps {
  onOpenProfile: () => void
}

export default function UserMenu({ onOpenProfile }: UserMenuProps) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const handleSignOut = async () => {
    await supabase.auth.signOut()
    setOpen(false)
  }

  if (!user) return null

  // Full name — no splitting
  const displayName =
    user.user_metadata?.full_name ||
    user.email?.split('@')[0] ||
    'You'

  const avatarUrl = user.user_metadata?.avatar_url as string | undefined
  const initials = displayName.charAt(0).toUpperCase()

  return (
    <div ref={menuRef} className="relative">
      <style>{`
        @keyframes menuIn {
          from { opacity:0; transform: translateY(-8px) scale(0.96) }
          to   { opacity:1; transform: translateY(0) scale(1) }
        }
        .menu-item {
          display: flex;
          align-items: center;
          gap: 12px;
          width: 100%;
          padding: 10px 14px;
          border-radius: 12px;
          font-size: 13.5px;
          font-weight: 500;
          color: #374151;
          transition: background 0.15s ease, transform 0.15s ease;
          text-align: left;
          cursor: pointer;
          background: none;
          border: none;
        }
        .menu-item:hover {
          background: #f5f3ff;
          color: #6d28d9;
          transform: translateX(2px);
        }
        .menu-item:hover .menu-icon {
          background: #ede9fe;
          color: #7c3aed;
        }
        .menu-item-danger { color: #ef4444 !important; }
        .menu-item-danger:hover { background: #fef2f2 !important; color: #dc2626 !important; }
        .menu-item-danger:hover .menu-icon { background: #fee2e2 !important; color: #ef4444 !important; }
        .menu-icon {
          width: 32px;
          height: 32px;
          border-radius: 9px;
          background: #f3f4f6;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
          transition: background 0.15s ease, color 0.15s ease;
          color: #6b7280;
        }
      `}</style>

      {/* Trigger pill */}
      <button
        onClick={() => setOpen(p => !p)}
        className="flex items-center gap-2.5 pl-2 pr-3.5 py-1.5 rounded-full bg-white border border-gray-200 shadow-sm hover:shadow-md hover:border-purple-200 transition-all duration-200"
      >
        {avatarUrl ? (
          <img src={avatarUrl} alt={displayName} className="w-7 h-7 rounded-full object-cover ring-2 ring-purple-100" />
        ) : (
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-[#C6A0F6] to-[#7c3aed] flex items-center justify-center text-xs font-bold text-white">
            {initials}
          </div>
        )}
        <span className="text-sm font-bold text-gray-800 max-w-[160px] truncate">
          {displayName}
        </span>
        <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className="absolute right-0 top-full mt-3 w-64 bg-white rounded-2xl overflow-hidden z-50"
          style={{
            animation: 'menuIn 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
            boxShadow: '0 8px 40px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.05)',
          }}
        >
          {/* User info header */}
          <div className="px-4 py-4 bg-gradient-to-br from-[#f5f3ff] to-[#faf5ff] border-b border-purple-50">
            <div className="flex items-center gap-3">
              {avatarUrl ? (
                <img src={avatarUrl} alt={displayName} className="w-10 h-10 rounded-xl object-cover" />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#C6A0F6] to-[#7c3aed] flex items-center justify-center text-sm font-bold text-white">
                  {initials}
                </div>
              )}
              <div className="min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{displayName}</p>
                <p className="text-xs text-gray-400 truncate">{user.email}</p>
              </div>
            </div>
          </div>

          {/* Nav items */}
          <div className="p-2">
            <button
              className="menu-item"
              onClick={() => { setOpen(false); navigate('/dashboard') }}
            >
              <span className="menu-icon"><LayoutDashboard className="w-4 h-4" /></span>
              Dashboard
            </button>

            <button
              className="menu-item"
              onClick={() => { setOpen(false); navigate('/dashboard') }}
            >
              <span className="menu-icon"><User className="w-4 h-4" /></span>
              Profile & Meal Plans
            </button>

            <button
              className="menu-item"
              onClick={() => setOpen(false)}
            >
              <span className="menu-icon"><Sparkles className="w-4 h-4" /></span>
              Generate New Plan
            </button>
          </div>

          {/* Sign out */}
          <div className="px-2 pb-2 pt-1 border-t border-gray-50">
            <button className="menu-item menu-item-danger" onClick={handleSignOut}>
              <span className="menu-icon"><LogOut className="w-4 h-4" /></span>
              Sign out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}