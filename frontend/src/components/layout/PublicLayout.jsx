import { useState } from 'react'
import { Link, NavLink, Outlet } from 'react-router-dom'
import Icon from '../common/Icon'
import Button from '../common/Button'
import { useAuth } from '../../auth/AuthProvider'
import { homeFor } from '../../auth/roleUtils'

const YEAR = new Date().getFullYear()

export const Logo = ({ light }) => (
  <Link to="/" className={`flex items-center gap-2 text-xl font-extrabold ${light ? 'text-white' : 'text-navy'}`}>
    <span className="grid h-9 w-9 place-items-center rounded-xl bg-court text-white"><Icon name="ball" className="h-5 w-5" /></span>
    QuickCourt
  </Link>
)

const linkCls = ({ isActive }) =>
  `rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-mint text-court' : 'text-navy hover:bg-navy/5'}`

export default function PublicLayout() {
  const { user, logout } = useAuth()
  const [open, setOpen] = useState(false)
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-slate-200 bg-sand/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3">
          <Logo />
          <nav className="hidden items-center gap-1 md:flex" aria-label="Main">
            <NavLink to="/" end className={linkCls}>Home</NavLink>
            <NavLink to="/venues" className={linkCls}>Explore Venues</NavLink>
            <NavLink to="/about" className={linkCls}>About</NavLink>
            {!user && <NavLink to="/login" className={linkCls}>Login</NavLink>}
          </nav>
          <div className="hidden items-center gap-2 md:flex">
            {user ? (
              <>
                <Button to={homeFor(user.role)} variant="outline" size="sm">My dashboard</Button>
                <Button variant="ghost" size="sm" onClick={logout}>Log out</Button>
              </>
            ) : (
              <>
                <Button to="/register" variant="outline" size="sm">Sign Up</Button>
                <Button to="/venues" size="sm">Book a Court</Button>
              </>
            )}
          </div>
          <button className="rounded-lg p-2 text-navy md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Toggle menu" aria-expanded={open}>
            <Icon name={open ? 'x' : 'menu'} />
          </button>
        </div>
        {open && (
          <div className="space-y-1 border-t border-slate-200 px-4 py-3 md:hidden" onClick={() => setOpen(false)}>
            <NavLink to="/" end className={linkCls}>Home</NavLink>
            <NavLink to="/venues" className={linkCls}>Explore Venues</NavLink>
            <NavLink to="/about" className={linkCls}>About</NavLink>
            {user ? (
              <>
                <NavLink to={homeFor(user.role)} className={linkCls}>My dashboard</NavLink>
                <button className="px-3 py-2 text-sm font-medium text-navy" onClick={logout}>Log out</button>
              </>
            ) : (
              <>
                <NavLink to="/login" className={linkCls}>Login</NavLink>
                <NavLink to="/register" className={linkCls}>Sign Up</NavLink>
              </>
            )}
          </div>
        )}
      </header>
      <main className="flex-1"><Outlet /></main>
      <Footer />
    </div>
  )
}

function Footer() {
  return (
    <footer className="bg-navy text-slate-300">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-12 sm:grid-cols-3">
        <div>
          <Logo light />
          <p className="mt-3 max-w-xs text-sm">Find a court, pick a slot, and play. Local sports booking made simple.</p>
        </div>
        <nav aria-label="Footer">
          <h4 className="mb-3 text-sm font-semibold text-white">Explore</h4>
          <ul className="space-y-2 text-sm">
            <li><Link className="hover:text-white" to="/venues">Venues</Link></li>
            <li><Link className="hover:text-white" to="/register">Create an account</Link></li>
            <li><Link className="hover:text-white" to="/login">Login</Link></li>
            <li><Link className="hover:text-white" to="/about">About</Link></li>
          </ul>
        </nav>
        <div>
          <h4 className="mb-3 text-sm font-semibold text-white">Contact</h4>
          {/* TODO: replace with the real support contact details */}
          <p className="flex items-center gap-2 text-sm"><Icon name="mail" className="h-4 w-4" /> support@quickcourt.example</p>
        </div>
      </div>
      <p className="border-t border-white/10 py-4 text-center text-xs">© {YEAR} QuickCourt. Payments in this app are a demonstration only.</p>
    </footer>
  )
}
