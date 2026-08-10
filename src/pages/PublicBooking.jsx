import { useEffect, useMemo, useState } from "react"
import { useParams } from "react-router-dom"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"
import Logo from "../components/Logo"


function PublicBooking() {
  const { username } = useParams()

  const [business, setBusiness] = useState(null)
  const [services, setServices] = useState([])
  const [availability, setAvailability] = useState([])

  const [clientName, setClientName] = useState("")
  const [serviceId, setServiceId] = useState("")
  const [date, setDate] = useState("")
  const [time, setTime] = useState("")
  const [phone, setPhone] = useState("")
  const [email, setEmail] = useState("")
  const [notes, setNotes] = useState("")

  const [submitted, setSubmitted] = useState(false)
  const [submittedBooking, setSubmittedBooking] = useState(null)

  const [pageLoading, setPageLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [businessError, setBusinessError] = useState("")

  const [unavailableTimes, setUnavailableTimes] = useState([])
  const [loadingTimes, setLoadingTimes] = useState(false)

  const today = getLocalDateString(new Date())

  const fieldClass =
    "block w-full min-w-0 rounded-2xl border border-[var(--yorly-border)] bg-[var(--yorly-surface-soft)] px-4 py-4 text-[var(--yorly-text)] outline-none transition-colors duration-200 placeholder:text-[var(--yorly-muted)] focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20"

  useEffect(() => {
    fetchBookingPage()
  }, [username])

  useEffect(() => {
  const fetchUnavailableTimes = async () => {
    setUnavailableTimes([])
    setTime("")

    if (!business?.id || !date) {
      return
    }

    setLoadingTimes(true)

    try {
      const { data, error } = await supabase.rpc(
        "get_unavailable_times",
        {
          owner_id: business.user_id,
          selected_date: date,
        }
      )

    if (error) {
  if (error.code === "23505") {
    toast.error(
      "That appointment time was just taken. Please choose another time."
    )
    setTime("")
    return
  }

  throw error
}

      const unavailable = (data || []).map((item) =>
        item.time_value.slice(0, 5)
      )
console.log("Unavailable times:", unavailable)

      setUnavailableTimes(unavailable)
    } catch (error) {
      console.error(error)
      toast.error("Could not load appointment availability.")
    } finally {
      setLoadingTimes(false)
    }
  }

  fetchUnavailableTimes()
}, [business?.id, date])

  const fetchBookingPage = async () => {
    setPageLoading(true)
    setBusinessError("")
    setBusiness(null)
    setServices([])
    setAvailability([])

    if (!username) {
      setBusinessError("This booking page could not be found.")
      setPageLoading(false)
      return
    }

    try {
const { data: profileData, error: profileError } = await supabase
  .from("business_profiles")
  .select("*")
  .eq("username", username)
  .eq("is_public", true)
  .maybeSingle()

console.log("Username:", username)
console.log("Profile:", profileData)
console.log("Profile Error:", profileError)

if (profileError) {
  throw profileError
}

if (!profileData) {
  setBusinessError("This booking page could not be found.")
  return
}

const [
  { data: serviceData, error: serviceError },
  { data: availabilityData, error: availabilityError },
] = await Promise.all([
  supabase
    .from("services")
    .select("id, name, description, price, duration, active")
    .eq("user_id", profileData.user_id)
    .eq("active", true)
    .order("created_at", { ascending: true }),

  supabase
    .from("availability")
    .select("day_of_week, is_available, start_time, end_time")
    .eq("user_id", profileData.user_id)
    .order("day_of_week", { ascending: true }),
])

if (serviceError) {
  throw serviceError
}

if (availabilityError) {
  throw availabilityError
}

setBusiness(profileData)
setServices(serviceData || [])
setAvailability(availabilityData || [])
} catch (error) {
  console.error("Booking page error:", error)

  setBusinessError(
    error?.message || "Unable to load this booking page."
  )
} finally {
  setPageLoading(false)
}
  }

  const selectedService = useMemo(() => {
    return services.find((item) => item.id === serviceId) || null
  }, [services, serviceId])

  const selectedDayAvailability = useMemo(() => {
    if (!date) return null

    const dayOfWeek = new Date(`${date}T00:00:00`).getDay()

    return (
      availability.find(
        (day) => Number(day.day_of_week) === dayOfWeek
      ) || null
    )
  }, [date, availability])

const availableTimes = useMemo(() => {
  if (
    !selectedService ||
    !selectedDayAvailability ||
    !selectedDayAvailability.is_available
  ) {
    return []
  }

  const generatedSlots = generateTimeSlots(
    selectedDayAvailability.start_time,
    selectedDayAvailability.end_time,
    Number(selectedService.duration)
  )

  return generatedSlots.filter(
    (slot) => !unavailableTimes.includes(slot)
  )
}, [
  selectedService,
  selectedDayAvailability,
  unavailableTimes,
])
  const handleServiceChange = (event) => {
    setServiceId(event.target.value)
    setTime("")
  }

  const handleDateChange = (event) => {
    setDate(event.target.value)
    setTime("")
  }

  const resetForm = () => {
    setClientName("")
    setServiceId("")
    setDate("")
    setTime("")
    setPhone("")
    setEmail("")
    setNotes("")
  }

  const handleBooking = async (event) => {
    event.preventDefault()

    if (
      !business ||
      !selectedService ||
      !clientName.trim() ||
      !date ||
      !time ||
      !phone.trim() ||
      !email.trim()
    ) {
      toast.error("Please complete all required fields.")
      return
    }

    if (
      !selectedDayAvailability ||
      !selectedDayAvailability.is_available
    ) {
      toast.error("The business is closed on that day.")
      return
    }

    if (!availableTimes.includes(time)) {
      toast.error("Please choose an available appointment time.")
      return
    }

    setSubmitting(true)

const bookingDetails = {
  clientName: clientName.trim(),
  service: selectedService.name,
  price: Number(selectedService.price),
  duration: Number(selectedService.duration),
  date,
  time,
  email: email.trim(),
  phone: phone.trim(),
}

try {
  const { data: booking, error: bookingError } = await supabase
  .from("bookings")
.insert({
  user_id: business.user_id,
  client_name: bookingDetails.clientName,
  service: bookingDetails.service,
  service_id: serviceId,
  date: bookingDetails.date,
  time: bookingDetails.time,
  email: bookingDetails.email,
  phone: bookingDetails.phone,
  notes: notes.trim(),
  amount: bookingDetails.price,
  status: "Pending Payment",
  payment_status: "Pending",
})
  .select("id")
  .single()

if (bookingError) {
  throw bookingError
}

const { data, error } = await supabase.functions.invoke(
  "create-checkout-session",
  {
  body: {
  bookingId: booking.id,
},
  }
)

if (error) {
  throw error
}

if (!data?.url) {
  throw new Error("Stripe did not return a checkout URL.")
}

window.location.href = data.url
} catch (error) {
  console.error("Checkout error:", error)

  if (error?.code === "23505") {
    toast.error(
      "That appointment time was just taken. Please choose another time."
    )
    setTime("")
    return
  }

  toast.error(error?.message || "Unable to start payment.")
} finally {
  setSubmitting(false)
}
  }

  if (pageLoading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--yorly-background)] px-4 text-[var(--yorly-text)]">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />

          <p className="mt-4 text-[var(--yorly-muted)]">
            Loading booking page...
          </p>
        </div>
      </main>
    )
  }

  if (businessError || !business) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--yorly-background)] px-4 text-[var(--yorly-text)]">
        <section className="w-full max-w-md rounded-3xl border border-[var(--yorly-border)] bg-[var(--yorly-surface)] p-8 text-center">
          <h1 className="text-2xl font-bold">
            Booking page unavailable
          </h1>

          <p className="mt-3 text-[var(--yorly-muted)]">
            {businessError || "This booking page could not be found."}
          </p>
        </section>
      </main>
    )
  }

  if (submitted && submittedBooking) {
    return (
      <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-[var(--yorly-background)] px-4 py-10 text-[var(--yorly-text)]">
        <div className="pointer-events-none absolute left-[-8rem] top-[-8rem] h-96 w-96 rounded-full bg-blue-500/10 blur-[120px]" />

        <div className="pointer-events-none absolute bottom-[-10rem] right-[-8rem] h-[28rem] w-[28rem] rounded-full bg-purple-500/10 blur-[140px]" />

        <section className="relative w-full max-w-xl rounded-[2rem] border border-[var(--yorly-border)] bg-[var(--yorly-surface)] p-7 text-center shadow-2xl sm:p-10">
          <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full border border-green-500/30 bg-green-500/10 text-4xl text-green-500">
            ✓
          </div>

          <p className="mb-2 text-sm font-semibold tracking-wide text-[var(--yorly-primary)]">
            Appointment Confirmed
          </p>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
            You’re booked!
          </h1>

          <p className="mx-auto mt-4 max-w-md text-[var(--yorly-muted)]">
            Your appointment with {business.business_name} has been reserved.
A confirmation email has been sent with your appointment details.
          </p>

          <div className="mt-8 rounded-2xl border border-[var(--yorly-border)] bg-[var(--yorly-surface-soft)] p-5 text-left">
            <h2 className="mb-4 font-semibold">
              Appointment details
            </h2>

            <div className="space-y-4">
              <ConfirmationRow
                label="Business"
                value={business.business_name}
              />

              <ConfirmationRow
                label="Service"
                value={submittedBooking.service}
              />

              <ConfirmationRow
                label="Price"
                value={`$${submittedBooking.price.toFixed(2)}`}
              />

              <ConfirmationRow
                label="Duration"
                value={formatDuration(submittedBooking.duration)}
              />

              <ConfirmationRow
                label="Date"
                value={formatBookingDate(submittedBooking.date)}
              />

              <ConfirmationRow
                label="Time"
                value={formatBookingTime(submittedBooking.time)}
              />

              <ConfirmationRow
                label="Name"
                value={submittedBooking.clientName}
              />

              <ConfirmationRow
                label="Email"
                value={submittedBooking.email}
              />
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              setSubmitted(false)
              setSubmittedBooking(null)
            }}
            className="mt-8 w-full rounded-2xl bg-blue-600 px-5 py-4 font-semibold text-white transition hover:bg-blue-700"
          >
            Book Another Appointment
          </button>
        </section>
      </main>
    )
  }

  return (
    <main className="relative min-h-screen overflow-hidden bg-[var(--yorly-background)] px-4 py-8 text-[var(--yorly-text)] sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute left-[-10rem] top-[-10rem] h-[30rem] w-[30rem] rounded-full bg-blue-500/10 blur-[140px]" />

      <div className="pointer-events-none absolute bottom-[-12rem] right-[-10rem] h-[32rem] w-[32rem] rounded-full bg-purple-500/10 blur-[150px]" />

      <div className="relative mx-auto grid w-full max-w-6xl grid-cols-1 gap-6 lg:grid-cols-[0.9fr_1.1fr]">
        <section className="flex flex-col rounded-[2rem] border border-[var(--yorly-border)] bg-[var(--yorly-surface)] p-6 shadow-sm sm:p-8 lg:p-10">
          <div className="mb-10">
           {business.logo_url ? (
  <img
    src={business.logo_url}
    alt={`${business.business_name} logo`}
    className="h-24 w-24 rounded-2xl object-contain"
  />
) : (
 <Logo className="h-12 w-auto" />
)}
          </div>

          <div>
            <p className="mb-3 text-sm font-semibold tracking-wide text-[var(--yorly-primary)]">
              {business.business_category || "Professional services"}
            </p>

            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              Book with {business.business_name}
            </h1>

            <p className="mt-5 max-w-lg text-lg leading-8 text-[var(--yorly-muted)]">
              {business.description ||
                "Select your preferred service, date, and time. Your appointment will be submitted for confirmation."}
            </p>
            <SocialLinks business={business} />
          </div>

          <div className="mt-10 space-y-4">
            <BusinessDetail
              icon="✓"
              title="Choose your service"
              description="Select from the services this business currently offers."
            />

            <BusinessDetail
              icon="◷"
              title="Choose an available time"
              description="Appointment options are based on the business schedule."
            />

            <BusinessDetail
              icon="🔒"
              title="Secure booking"
              description="Your contact details are used only for your appointment."
            />
          </div>

          <div className="mt-auto pt-10">
            <p className="text-sm text-[var(--yorly-subtle)]">
              Booking powered by Yorly
            </p>
          </div>
        </section>

        <form
          onSubmit={handleBooking}
          className="rounded-[2rem] border border-[var(--yorly-border)] bg-[var(--yorly-surface)] p-5 shadow-xl sm:p-8 lg:p-10"
        >
          <div className="mb-8">
            <p className="mb-2 text-sm font-semibold tracking-wide text-[var(--yorly-primary)]">
              Appointment Details
            </p>

            <h2 className="text-3xl font-bold tracking-tight">
              Reserve your time
            </h2>

            <p className="mt-3 text-[var(--yorly-muted)]">
              Choose a service, pick an available time, and instantly reserve your appointment.
            </p>
          </div>

          <div className="space-y-6">
            <FormField label="Choose a service" required>
              <select
                required
                value={serviceId}
                onChange={handleServiceChange}
                className={`${fieldClass} appearance-none`}
              >
                <option value="">Select a service</option>

                {services.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} — ${Number(item.price).toFixed(2)}
                  </option>
                ))}
              </select>

              {selectedService && (
                <div className="mt-3 rounded-2xl border border-[var(--yorly-border)] bg-[var(--yorly-surface-soft)] p-4">
                  <div className="flex flex-wrap items-center gap-3">
                    <span className="font-semibold">
                      ${Number(selectedService.price).toFixed(2)}
                    </span>

                    <span className="text-sm text-[var(--yorly-muted)]">
                      {formatDuration(selectedService.duration)}
                    </span>
                  </div>

                  {selectedService.description && (
                    <p className="mt-2 text-sm leading-6 text-[var(--yorly-muted)]">
                      {selectedService.description}
                    </p>
                  )}
                </div>
              )}
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Preferred date" required>
                <input
                  type="date"
                  required
                  min={today}
                  value={date}
                  onChange={handleDateChange}
                  disabled={!selectedService}
                  style={{ colorScheme: "inherit" }}
                  className={fieldClass}
                />

                {date &&
                  selectedDayAvailability &&
                  !selectedDayAvailability.is_available && (
                    <p className="mt-2 text-sm text-red-500">
                      {business.business_name} is closed on this day.
                    </p>
                  )}

                {date && !selectedDayAvailability && (
                  <p className="mt-2 text-sm text-red-500">
                    No availability has been set for this day.
                  </p>
                )}
              </FormField>

              <FormField label="Preferred time" required>
                <select
                  required
                  value={time}
                  onChange={(event) => setTime(event.target.value)}
                  disabled={
  loadingTimes ||
  !date ||
  availableTimes.length === 0
}
                  className={`${fieldClass} appearance-none`}
                >
                  <option value="">
  {loadingTimes
    ? "Checking availability..."
    : date
      ? availableTimes.length > 0
        ? "Select a time"
        : "No times available"
      : "Choose a date first"}
</option>

                  {availableTimes.map((slot) => (
                    <option key={slot} value={slot}>
                      {formatBookingTime(slot)}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            {services.length === 0 && (
              <div className="rounded-2xl border border-yellow-500/20 bg-yellow-500/10 p-4 text-sm text-yellow-600">
                This business has not added any services yet.
              </div>
            )}

            <div className="border-t border-[var(--yorly-border)] pt-6">
              <h3 className="text-xl font-semibold">
                Your information
              </h3>

              <p className="mt-1 text-sm text-[var(--yorly-muted)]">
                The business will use this information to contact you
                about your appointment.
              </p>
            </div>

            <FormField label="Full name" required>
              <input
                type="text"
                required
                autoComplete="name"
                placeholder="Enter your full name"
                value={clientName}
                onChange={(event) => setClientName(event.target.value)}
                className={fieldClass}
              />
            </FormField>

            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
              <FormField label="Email address" required>
                <input
                  type="email"
                  required
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className={fieldClass}
                />
              </FormField>

              <FormField label="Phone number" required>
                <input
                  type="tel"
                  required
                  autoComplete="tel"
                  placeholder="(555) 555-5555"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  className={fieldClass}
                />
              </FormField>
            </div>

            <FormField label="Notes">
              <textarea
                placeholder="Special requests, questions, or details..."
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={4}
                className={`${fieldClass} resize-none`}
              />
            </FormField>

            <button
              type="submit"
              disabled={
                submitting ||
                services.length === 0 ||
                availableTimes.length === 0
              }
              className="w-full rounded-2xl bg-blue-600 px-5 py-4 font-semibold text-white transition-all duration-300 hover:-translate-y-0.5 hover:bg-blue-700 hover:shadow-[0_0_25px_rgba(37,99,235,0.22)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting
                ? "Submitting Booking..."
                : "Book Appointment"}
            </button>

            <p className="text-center text-xs leading-5 text-[var(--yorly-subtle)]">
              Your selected appointment time will be reserved immediately.
            </p>
          </div>
        </form>
      </div>
    </main>
  )
}

function normalizeExternalUrl(url) {
  if (!url) return ""

  const trimmedUrl = url.trim()

  if (
    trimmedUrl.startsWith("http://") ||
    trimmedUrl.startsWith("https://")
  ) {
    return trimmedUrl
  }

  return `https://${trimmedUrl}`
}

function generateTimeSlots(startTime, endTime, duration) {
  if (!startTime || !endTime || !duration) {
    return []
  }

  const startMinutes = timeToMinutes(startTime)
  const endMinutes = timeToMinutes(endTime)
  const slots = []

  let currentMinutes = startMinutes

  while (currentMinutes + duration <= endMinutes) {
    slots.push(minutesToTime(currentMinutes))
    currentMinutes += 30
  }

  return slots
}

function timeToMinutes(timeString) {
  const [hours, minutes] = timeString.slice(0, 5).split(":").map(Number)

  return hours * 60 + minutes
}

function minutesToTime(totalMinutes) {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
    2,
    "0"
  )}`
}

function getLocalDateString(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")

  return `${year}-${month}-${day}`
}

function formatBookingDate(dateString) {
  if (!dateString) return ""

  return new Date(`${dateString}T00:00:00`).toLocaleDateString(
    "en-US",
    {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    }
  )
}

function formatBookingTime(timeString) {
  if (!timeString) return ""

  const [hours, minutes] = timeString.slice(0, 5).split(":")
  const date = new Date()

  date.setHours(Number(hours), Number(minutes), 0, 0)

  return date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  })
}

function formatDuration(minutes) {
  const numericMinutes = Number(minutes)

  if (numericMinutes < 60) {
    return `${numericMinutes} minutes`
  }

  const hours = Math.floor(numericMinutes / 60)
  const remainingMinutes = numericMinutes % 60

  if (remainingMinutes === 0) {
    return `${hours} ${hours === 1 ? "hour" : "hours"}`
  }

  return `${hours} ${
    hours === 1 ? "hour" : "hours"
  } ${remainingMinutes} minutes`
}

function FormField({ label, required = false, children }) {
  return (
    <div>
      <label className="mb-2 block text-sm font-medium text-[var(--yorly-text)]">
        {label}

        {required && (
          <span className="ml-1 text-red-500" aria-hidden="true">
            *
          </span>
        )}
      </label>

      {children}
    </div>
  )
}

function SocialLinks({ business }) {
  const links = [
    {
      label: "Instagram",
      url: business.instagram,
    },
    {
      label: "Facebook",
      url: business.facebook,
    },
    {
      label: "TikTok",
      url: business.tiktok,
    },
    {
      label: "Website",
      url: business.website,
    },
  ].filter((item) => item.url)

  if (links.length === 0) {
    return null
  }

  return (
    <div className="mt-6 flex flex-wrap gap-3">
      {links.map((item) => (
        <a
          key={item.label}
          href={normalizeExternalUrl(item.url)}
          target="_blank"
          rel="noreferrer"
          className="rounded-xl border border-[var(--yorly-border)] bg-[var(--yorly-surface-soft)] px-4 py-2 text-sm font-semibold text-[var(--yorly-text)] transition hover:border-blue-500/40 hover:text-[var(--yorly-primary)]"
        >
          {item.label}
        </a>
      ))}
    </div>
  )
}

function BusinessDetail({ icon, title, description }) {
  return (
    <div className="flex gap-4 rounded-2xl border border-[var(--yorly-border)] bg-[var(--yorly-surface-soft)] p-4">
      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 font-semibold text-[var(--yorly-primary)]">
        {icon}
      </div>

      <div>
        <h3 className="font-semibold">{title}</h3>

        <p className="mt-1 text-sm leading-6 text-[var(--yorly-muted)]">
          {description}
        </p>
      </div>
    </div>
  )
}

function ConfirmationRow({ label, value }) {
  return (
    <div className="flex flex-col gap-1 border-b border-[var(--yorly-border)] pb-3 last:border-b-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
      <span className="text-sm text-[var(--yorly-muted)]">
        {label}
      </span>

      <span className="font-medium sm:text-right">{value}</span>
    </div>
  )
}

export default PublicBooking