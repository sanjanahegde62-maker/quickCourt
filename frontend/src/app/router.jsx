import { Navigate, Route, Routes } from 'react-router-dom'
import ProtectedRoute from '../auth/ProtectedRoute'
import PublicLayout from '../components/layout/PublicLayout'
import DashboardLayout from '../components/layout/DashboardLayout'

import Landing from '../features/venues/Landing'
import Venues from '../features/venues/Venues'
import VenueDetails from '../features/venues/VenueDetails'
import About from '../features/venues/About'
import NotFound from '../features/venues/NotFound'
import Login from '../features/auth/Login'
import Register from '../features/auth/Register'
import VerifyOtp from '../features/auth/VerifyOtp'
import ForgotPassword from '../features/auth/ForgotPassword'
import Profile from '../features/profile/Profile'

import PlayerDashboard from '../features/bookings/PlayerDashboard'
import BookCourt from '../features/bookings/BookCourt'
import Checkout from '../features/bookings/Checkout'
import Confirmation from '../features/bookings/Confirmation'
import MyBookings from '../features/bookings/MyBookings'
import BookingDetails from '../features/bookings/BookingDetails'

import OwnerDashboard from '../features/owner/OwnerDashboard'
import OwnerFacilities from '../features/owner/OwnerFacilities'
import OwnerFacilityDetail from '../features/owner/OwnerFacilityDetail'
import OwnerCourts from '../features/owner/OwnerCourts'
import OwnerAvailability from '../features/owner/OwnerAvailability'
import OwnerBookings from '../features/owner/OwnerBookings'
import OwnerAnalytics from '../features/owner/OwnerAnalytics'

import AdminDashboard from '../features/admin/AdminDashboard'
import AdminFacilities from '../features/admin/AdminFacilities'
import AdminUsers from '../features/admin/AdminUsers'
import AdminBookings from '../features/admin/AdminBookings'
import AdminReports from '../features/admin/AdminReports'

export default function AppRoutes() {
  return (
    <Routes>
      <Route element={<PublicLayout />}>
        <Route index element={<Landing />} />
        <Route path="venues" element={<Venues />} />
        <Route path="venues/:facilityId" element={<VenueDetails />} />
        <Route path="about" element={<About />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="forgot-password" element={<ForgotPassword />} />
        <Route path="verify-otp" element={<VerifyOtp />} />
        <Route path="*" element={<NotFound />} />
      </Route>

      {/* Player */}
      <Route element={<ProtectedRoute roles={['player']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="player" element={<PlayerDashboard />} />
          <Route path="book/:courtId" element={<BookCourt />} />
          <Route path="checkout/:bookingId" element={<Checkout />} />
          <Route path="bookings/:bookingId/confirmation" element={<Confirmation />} />
          <Route path="my-bookings" element={<MyBookings />} />
          <Route path="bookings/:bookingId" element={<BookingDetails />} />
        </Route>
      </Route>

      {/* Owner */}
      <Route element={<ProtectedRoute roles={['owner']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="owner" element={<OwnerDashboard />} />
          <Route path="owner/facilities" element={<OwnerFacilities />} />
          <Route path="owner/facilities/:facilityId" element={<OwnerFacilityDetail />} />
          <Route path="owner/courts" element={<OwnerCourts />} />
          <Route path="owner/availability" element={<OwnerAvailability />} />
          <Route path="owner/bookings" element={<OwnerBookings />} />
          <Route path="owner/analytics" element={<OwnerAnalytics />} />
        </Route>
      </Route>

      {/* Admin */}
      <Route element={<ProtectedRoute roles={['admin']} />}>
        <Route element={<DashboardLayout />}>
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/facilities" element={<AdminFacilities />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/bookings" element={<AdminBookings />} />
          <Route path="admin/reports" element={<AdminReports />} />
        </Route>
      </Route>

      {/* Profile: any signed-in role */}
      <Route element={<ProtectedRoute />}>
        <Route element={<DashboardLayout />}>
          <Route path="profile" element={<Profile />} />
        </Route>
      </Route>

      <Route path="home" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
