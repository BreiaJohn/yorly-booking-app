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

  const [betaApplications, setBetaApplications] = useState([])

  const [businesses, setBusinesses] = useState([])

  const [recentBookings, setRecentBookings] = useState([])

  const ADMIN_EMAIL = "hello@yorly.co"

  useEffect(() => {
    const loadAdminDashboard = async () => {
      try {
        const {
          data: { session },
          error: sessionError,
        } = await supabase.auth.getSession()

        if (sessionError) {
          throw sessionError
        }

        setSession(session)

        console.log(
          "ADMIN SESSION EMAIL:",
          session?.user?.email
        )

        if (!session?.user) {
          return
        }

        if (session.user.email !== ADMIN_EMAIL) {
          return
        }

        const [
          businessResult,
          bookingResult,
          betaCountResult,
          revenueResult,
          betaApplicationsResult,
          recentBusinessesResult,
          recentBookingsResult,
        ] = await Promise.all([
          supabase
            .from("business_profiles")
            .select("*", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("bookings")
            .select("*", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("beta_applications")
            .select("*", {
              count: "exact",
              head: true,
            }),

          supabase
            .from("bookings")
            .select("amount")
            .eq("payment_status", "Paid"),

          supabase
            .from("beta_applications")
            .select("*")
            .order("created_at", {
              ascending: false,
            }),

            supabase
            .from("business_profiles")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),

            supabase
            .from("bookings")
            .select("*")
            .order("created_at", { ascending: false })
            .limit(5),
        ])

        

        if (businessResult.error) {
          throw businessResult.error
        }

        if (bookingResult.error) {
          throw bookingResult.error
        }

        if (betaCountResult.error) {
          throw betaCountResult.error
        }

        if (revenueResult.error) {
          throw revenueResult.error
        }

        if (betaApplicationsResult.error) {
          throw betaApplicationsResult.error
        }
        if (recentBusinessesResult.error) {
          throw recentBusinessesResult.error
}

        const totalRevenue = (
          revenueResult.data || []
        ).reduce(
          (sum, booking) =>
            sum + Number(booking.amount || 0),
          0
        )

        setStats({
          businesses: businessResult.count || 0,
          bookings: bookingResult.count || 0,
          betaApplications:
            betaCountResult.count || 0,
          revenue: totalRevenue,
        })

        setBetaApplications(
          betaApplicationsResult.data || []
        )

        setBusinesses(
          recentBusinessesResult.data || [])

        setRecentBookings(
          recentBookingsResult.data || [])

        console.log(
          "Beta Applications:",
          betaApplicationsResult.data || []
        )
      } catch (error) {
        console.error(
          "Admin dashboard load error:",
          error
        )
      } finally {
        setLoading(false)
      }
    }

    loadAdminDashboard()
  }, [])

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020817] text-white">
        <p className="text-slate-400">
          Loading Yorly Admin...
        </p>
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
            Monitor businesses, bookings, revenue,
            and beta activity.
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
       <div className="rounded-2xl border border-slate-800 bg-[#0d172b] p-6">
  <h2 className="text-xl font-semibold">Recent Businesses</h2>

  <div className="mt-6 space-y-4">
    {businesses.length === 0 ? (
      <p className="text-slate-400">No businesses yet.</p>
    ) : (
      businesses.map((business) => (
        <div
          key={business.id}
          className="flex items-center justify-between rounded-xl border border-slate-700 p-4"
        >
          <div>
            <p className="font-semibold">
              {business.business_name}
            </p>

            <p className="text-sm text-slate-400">
              @{business.username}
            </p>
          </div>

          <span className="text-xs text-slate-500">
            {new Date(business.created_at).toLocaleDateString()}
          </span>
        </div>
      ))
    )}
  </div>
</div>

          <BetaApplicationsPanel
            applications={betaApplications}
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

function BetaApplicationsPanel({ applications }) {
  return (
    <div className="rounded-2xl border border-slate-800 bg-[#0d172b] p-6">
      <div className="mb-5">
        <h2 className="text-xl font-semibold">
          Recent Beta Applications
        </h2>

        <p className="mt-2 text-sm text-slate-400">
          Newest applications first.
        </p>
      </div>

      {applications.length === 0 ? (
        <p className="text-sm text-slate-500">
          No beta applications yet.
        </p>
      ) : (
        <div className="space-y-4">
          {applications.slice(0, 5).map((application) => (
            <div
              key={application.id}
              className="rounded-xl border border-slate-800 bg-[#08111f] p-4"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-semibold text-white">
                    {application.full_name}
                  </p>

                  <p className="mt-1 text-sm text-slate-400">
                    {application.business_name ||
                      "Business name not provided"}
                  </p>
                </div>

                <span className="rounded-full bg-purple-500/10 px-3 py-1 text-xs font-semibold text-purple-300">
                  {application.business_type}
                </span>
              </div>

              <p className="mt-3 text-sm text-slate-400">
                {application.email}
              </p>

              {application.goals && (
                <p className="mt-3 line-clamp-2 text-sm leading-6 text-slate-300">
                  {application.goals}
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}