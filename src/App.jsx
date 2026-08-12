import { Route, Routes, useLocation } from "react-router-dom"
import { Toaster } from "react-hot-toast"

import Navbar from "./components/Navbar"
import ProtectedRoute from "./components/ProtectedRoute"

import Home from "./pages/Home"
import Login from "./pages/Login"
import Signup from "./pages/Signup"
import Beta from "./pages/Beta"

import Setup from "./pages/Setup"
import SetupServices from "./pages/SetupServices"
import SetupAvailability from "./pages/SetupAvailability"

import Dashboard from "./pages/Dashboard"
import Bookings from "./pages/Bookings"
import Services from "./pages/Services"
import Clients from "./pages/Clients"
import Payments from "./pages/Payments"
import Settings from "./pages/Settings"
import AdminDashboard from "./pages/AdminDashboard"

import PublicBooking from "./pages/PublicBooking"
import PaymentSuccess from "./pages/PaymentSuccess"

function App() {
  const location = useLocation()

  const routesWithoutNavbar = [
    "/login",
    "/signup",
    "/beta",
    "/setup",
    "/dashboard",
    "/bookings",
    "/services",
    "/clients",
    "/payments",
    "/settings",
    "/payment-success",
    "/book",
  ]

  const shouldHideNavbar = routesWithoutNavbar.some((route) =>
    location.pathname.startsWith(route)
  )

  return (
    <>
      <Toaster position="top-right" />

      <div className="min-h-screen overflow-x-hidden bg-[var(--yorly-bg)]">
        {!shouldHideNavbar && <Navbar />}

        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/beta" element={<Beta />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/book" element={<PublicBooking />} />
          <Route path="/book/:username" element={<PublicBooking />} />

          {/* Setup routes */}
    <Route
            path="/setup/services"
            element={
              <ProtectedRoute>
                <SetupServices />
              </ProtectedRoute>
            }
          />

          <Route
            path="/setup/availability"
            element={
              <ProtectedRoute>
                <SetupAvailability />
              </ProtectedRoute>
            }
          />

          {/* Dashboard routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/bookings"
            element={
              <ProtectedRoute>
                <Bookings />
              </ProtectedRoute>
            }
          />

          <Route
            path="/services"
            element={
              <ProtectedRoute>
                <Services />
              </ProtectedRoute>
            }
          />

          <Route
            path="/clients"
            element={
              <ProtectedRoute>
                <Clients />
              </ProtectedRoute>
            }
          />

          <Route
            path="/payments"
            element={
              <ProtectedRoute>
                <Payments />
              </ProtectedRoute>
            }
          />

          <Route path="/admin" element={<AdminDashboard />} />

          <Route
            path="/settings"
            element={
              <ProtectedRoute>
                <Settings />
              </ProtectedRoute>
            }
          />

          {/* setuproutes */}
          <Route
  path="/setup"
  element={
    <ProtectedRoute>
      <Setup />
    </ProtectedRoute>
  }
/>

<Route
  path="/setup/services"
  element={
    <ProtectedRoute>
      <SetupServices />
    </ProtectedRoute>
  }
/>

<Route
  path="/setup/availability"
  element={
    <ProtectedRoute>
      <SetupAvailability />
    </ProtectedRoute>
  }
/>
        </Routes>
        
      </div>
    </>
  )
}

export default App