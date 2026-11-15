import { describe, expect, it, vi } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'

vi.mock('../services/api/auth.api', () => ({ getMe: vi.fn(), login: vi.fn(), logout: vi.fn(), updateMe: vi.fn() }))
vi.mock('../services/api/courts.api', () => ({ getCourt: vi.fn(), getAvailability: vi.fn() }))
vi.mock('../services/api/bookings.api', () => ({ createBooking: vi.fn() }))
vi.mock('../services/api/venues.api', () => ({ getFacility: vi.fn() }))

import * as authApi from '../services/api/auth.api'
import * as courtsApi from '../services/api/courts.api'
import * as bookingsApi from '../services/api/bookings.api'
import { AuthProvider } from '../auth/AuthProvider'
import { ToastProvider } from '../components/common/Toast'
import ProtectedRoute from '../auth/ProtectedRoute'
import BookCourt from '../features/bookings/BookCourt'

const Page = ({ t }) => <p>{t}</p>

function renderApp(initial, user) {
  if (user) { sessionStorage.setItem('qc_token', 't'); authApi.getMe.mockResolvedValue(user) }
  return render(
    <MemoryRouter initialEntries={[initial]}>
      <ToastProvider><AuthProvider>
        <Routes>
          <Route path="/login" element={<Page t="LOGIN PAGE" />} />
          <Route path="/player" element={<Page t="PLAYER HOME" />} />
          <Route path="/owner" element={<Page t="OWNER HOME" />} />
          <Route element={<ProtectedRoute roles={['admin']} />}><Route path="/admin" element={<Page t="ADMIN AREA" />} /></Route>
          <Route element={<ProtectedRoute roles={['player']} />}>
            <Route path="/book/:courtId" element={<BookCourt />} />
          </Route>
        </Routes>
      </AuthProvider></ToastProvider>
    </MemoryRouter>,
  )
}

describe('route protection', () => {
  it('sends signed-out visitors to login', async () => {
    renderApp('/admin')
    expect(await screen.findByText('LOGIN PAGE')).toBeInTheDocument()
  })
  it('sends a player away from the admin area to their own home', async () => {
    renderApp('/admin', { id: 1, role: 'player' })
    expect(await screen.findByText('PLAYER HOME')).toBeInTheDocument()
  })
  it('lets an admin in', async () => {
    renderApp('/admin', { id: 1, role: 'admin' })
    expect(await screen.findByText('ADMIN AREA')).toBeInTheDocument()
  })
})

describe('booking conflict (HTTP 409)', () => {
  it('tells the player, refreshes availability, and does not navigate to payment', async () => {
    const slot = { slotId: 7, startTime: '18:00:00', endTime: '19:00:00', price: 450, status: 'AVAILABLE', available: true }
    courtsApi.getCourt.mockResolvedValue({ id: 5, name: 'Court 1', sportType: 'BADMINTON' })
    courtsApi.getAvailability.mockResolvedValue([slot])
    bookingsApi.createBooking.mockRejectedValue({ normalized: true, status: 409, message: 'conflict' })

    renderApp('/book/5', { id: 1, role: 'player' })
    await userEvent.click(await screen.findByRole('button', { name: /18:00/ }))
    const callsBefore = courtsApi.getAvailability.mock.calls.length
    await userEvent.click(screen.getByRole('button', { name: /confirm booking/i }))

    expect(await screen.findByText(/just booked by someone else/i)).toBeInTheDocument()
    await waitFor(() => expect(courtsApi.getAvailability.mock.calls.length).toBeGreaterThan(callsBefore))
    expect(bookingsApi.createBooking).toHaveBeenCalledTimes(1)
  })
})
