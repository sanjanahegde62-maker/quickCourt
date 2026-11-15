import Button from '../../components/common/Button'

export default function About() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14">
      <h1 className="text-3xl font-bold">About QuickCourt</h1>
      <p className="mt-4 text-slate-700">QuickCourt connects players with local sports facilities. Browse venues, see real-time availability, book a slot, and keep track of your games, all in one place.</p>
      <p className="mt-3 text-slate-700">Facility owners manage their courts and bookings from a dedicated dashboard, and administrators review new facilities before they appear to players.</p>
      <p className="mt-3 rounded-xl bg-amber-50 p-4 text-sm text-amber-900">QuickCourt currently uses a simulated payment system for demonstration purposes. No real money is deducted or transferred. Bookings are confirmed after successful simulated payment.</p>
      <Button to="/venues" className="mt-6">Explore venues</Button>
    </div>
  )
}
