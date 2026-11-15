import { useState } from 'react'
import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import Icon from '../common/Icon'
import { Logo } from './PublicLayout'
import { useAuth } from '../../auth/AuthProvider'

const NAV = {
  player: [
    { to: '/player', label: 'Dashboard', icon: 'home', end: true },
    { to: '/venues', label: 'Find a court', icon: 'search' },
    { to: '/my-bookings', label: 'My bookings', icon: 'calendar' },
    { to: '/profile', label: 'Profile', icon: 'user' },
  ],
  owner: [
    { to: '/owner', label: 'Dashboard', icon: 'home', end: true },
    { to: '/owner/facilities', label: 'Facilities', icon: 'building' },
    { to: '/owner/courts', label: 'Courts', icon: 'grid' },
    { to: '/owner/availability', label: 'Availability', icon: 'clock' },
    { to: '/owner/bookings', label: 'Bookings', icon: 'calendar' },
    { to: '/owner/analytics', label: 'Analytics', icon: 'chart' },
    { to: '/profile', label: 'Profile', icon: 'user' },
  ],
  admin: [
    { to: '/admin', label: 'Dashboard', icon: 'home', end: true },
    { to: '/admin/facilities', label: 'Facility approvals', icon: 'shield' },
    { to: '/admin/users', label: 'Users', icon: 'users' },
    { to: '/admin/bookings', label: 'Bookings', icon: 'calendar' },
    { to: '/admin/reports', label: 'Analytics', icon: 'chart' },
    { to: '/profile', label: 'Profile', icon: 'user' },
  ],
}

export default function DashboardLayout() {
  const { user, logout } = useAuth()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const items = NAV[user?.role] || []

  const link = ({ isActive }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium ${isActive ? 'bg-court text-white' : 'text-navy hover:bg-white/70'}`

  const sidebar = (
    <nav className="flex h-full flex-col gap-1 p-4" aria-label="Dashboard">
      <div className="mb-4 px-2"><Logo /></div>
      {items.map((i) => (
        <NavLink key={i.to + i.label} to={i.to} end={i.end} className={link} onClick={() => setOpen(false)}>
          <Icon name={i.icon} className="h-5 w-5" />{i.label}
        </NavLink>
      ))}
      <button onClick={async () => { await logout(); navigate('/') }}
        className="mt-auto flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-navy hover:bg-white/70">
        <Icon name="logout" className="h-5 w-5" />Log out
      </button>
    </nav>
  )

  return (
    <div className="flex min-h-screen bg-lavender/40">
      <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-lavender md:block">{sidebar}</aside>
      {open && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-navy/50" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 w-64 bg-lavender">{sidebar}</aside>
        </div>
      )}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between border-b border-slate-200 bg-white/70 px-4 py-3">
          <button className="rounded-lg p-2 text-navy md:hidden" onClick={() => setOpen(true)} aria-label="Open menu"><Icon name="menu" /></button>
          <p className="ml-auto text-sm text-slate-600">
            <span className="font-semibold text-navy">{user?.name || user?.email}</span>
            <span className="ml-2 rounded-full bg-mint px-2 py-0.5 text-xs font-semibold capitalize text-court">{user?.role}</span>
          </p>
        </header>
        <main className="mx-auto w-full max-w-6xl flex-1 p-4 sm:p-6"><Outlet /></main>
      </div>
    </div>
  )
}
