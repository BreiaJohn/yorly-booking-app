import { useEffect, useState } from "react"
import { Navigate } from "react-router-dom"
import { supabase } from "../lib/supabase"

export default function AdminDashboard() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(true)

  const [stats, setStats] = useState({
    businesses: 0,
    bookings: 0,
    betaApplications: 0,
    revenue: 0,
  })

  const ADMIN_EMAIL = "hello@yorly.co"

  useEffect(() => {
    const loadAdminDashboard = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()

      setSession(session)

      console.log("ADMIN SESSION EMAIL:", session?.user?.email)

      if (!session?.user) {
        setLoading(false)
        return
      }

      if (session.user.email !== ADMIN_EMAIL) {
        setLoading(false)
        return
      }

      const [
        businessResult,
        bookingResult,
        betaResult,
        revenueResult,
      ] = await Promise.all([
        supabase
          .from("business_profiles")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("bookings")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("beta_applications")
          .select("*", { count: "exact", head: true }),

        supabase
          .from("bookings")
          .select("amount")
          .eq("payment_status", "Paid"),
      ])

      const totalRevenue = (revenueResult.data || []).reduce(
        (sum, booking) => sum + Number(booking.amount || 0),
        0
      )

      setStats({
        businesses: businessResult.count || 0,
        bookings: bookingResult.count || 0,
        betaApplications: betaResult.count || 0,
        revenue: totalRevenue,
      })

      setLoading(false)
    }

    loadAdminDashboard()
  }, [])

  if (loading) {
    return (
      <main className="min-h-screen bg-[#020817] text-white flex items-center justify-center">
        <p className="text-slate-400">Loading Yorly Admin...</p>
      </main>
    )
  }

  if (!session?.user) {
    return <Navigate to="/login" replace />
  }

  if (session.user.email !== ADMIN_EMAIL) {
    return <Navigate to="/dashboard" replace />
  }

  return (
    <main className="min-h-screen bg-[#020817] text-white">
      <div className="mx-auto max-w-7xl px-6 py-10">
        <div className="mb-10">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-purple-400">
            Yorly Admin
          </p>

          <h1 className="mt-2 text-4xl font-bold">
            Founder Dashboard
          </h1>

          <p className="mt-3 text-slate-400">
            Monitor businesses, bookings, revenue, and beta activity.
          </p>
        </div>

        <section className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Businesses"
            value={stats.businesses}
          />

          <StatCard
            label="Bookings"
            value={stats.bookings}
          />

          <StatCard
            label="Revenue Processed"
            value={`$${stats.revenue.toLocaleString()}`}
          />

          <StatCard
            label="Beta Applications"
            value={stats.betaApplications}
          />
        </section>

        <section className="mt-8 grid gap-6 lg:grid-cols-2">
          <AdminPanel
            title="Recent Businesses"
            description="We’ll load your newest business accounts here."
          />

          <AdminPanel
            title="Recent Beta Applications"
            description="We’ll load your newest beta applicants here."
          />

          <AdminPanel
            title="Recent Bookings"
            description="We’ll show platform-wide booking activity here."
          />

          <AdminPanel
            title="System Health"
            description="Stripe, Resend, and webhook health will live here."
          />
        </section>
      </div>
    </main>
  )
}

function StatCard({ label, value }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d172b] p-6">
      <p className="text-sm font-medium text-slate-400">
        {label}
      </p>

      <p className="mt-3 text-3xl font-bold">
        {value}
      </p>
    </div>
  )
}

function AdminPanel({ title, description }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d172b] p-6">
      <h2 className="text-xl font-semibold">
        {title}
      </h2>

      <p className="mt-2 text-sm leading-6 text-slate-400">
        {description}
      </p>
    </div>
  )
}