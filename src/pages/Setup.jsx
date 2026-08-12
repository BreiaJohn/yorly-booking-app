import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { supabase } from "../lib/supabase"
import toast from "react-hot-toast"

function Setup() {
  const navigate = useNavigate()

  const [businessName, setBusinessName] = useState("")
  const [username, setUsername] = useState("")
  const [businessCategory, setBusinessCategory] = useState("")
  const [phone, setPhone] = useState("")
  const [description, setDescription] = useState("")
  const [businessEmail, setBusinessEmail] = useState("")
  const [logoUrl, setLogoUrl] = useState("")

  const [isLoadingProfile, setIsLoadingProfile] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingLogo, setIsUploadingLogo] = useState(false)

  useEffect(() => {
    loadProfile()
  }, [])

  const loadProfile = async () => {
    setIsLoadingProfile(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        toast.error("Please log in again.")
        navigate("/login")
        return
      }

      setBusinessEmail(user.email || "")

      const { data, error } = await supabase
        .from("profiles")
        .select(
          `
            business_name,
            username,
            business_category,
            phone,
            description,
            business_email,
            logo_url
          `
        )
        .eq("id", user.id)
        .single()

      if (error) {
        throw error
      }

      setBusinessName(data?.business_name || "")
      setUsername(data?.username || "")
      setBusinessCategory(data?.business_category || "")
      setPhone(data?.phone || "")
      setDescription(data?.description || "")
      setBusinessEmail(data?.business_email || user.email || "")
      setLogoUrl(data?.logo_url || "")
    } catch (error) {
      console.error("Profile loading error:", error)
      toast.error("Could not load your business profile.")
    } finally {
      setIsLoadingProfile(false)
    }
  }

  const formatUsername = (value) => {
    return value
      .toLowerCase()
      .trim()
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9_-]/g, "")
  }

  const handleUsernameChange = (event) => {
    setUsername(formatUsername(event.target.value))
  }

  const handleLogoUpload = async (event) => {
    const file = event.target.files?.[0]

    if (!file) {
      return
    }

    const allowedTypes = [
      "image/png",
      "image/jpeg",
      "image/webp",
      "image/svg+xml",
    ]

    if (!allowedTypes.includes(file.type)) {
      toast.error("Please upload a PNG, JPG, WEBP, or SVG image.")
      event.target.value = ""
      return
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Logo must be smaller than 5 MB.")
      event.target.value = ""
      return
    }

    setIsUploadingLogo(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Please log in again.")
      }

      const extension =
        file.name.split(".").pop()?.toLowerCase() || "png"

      const filePath = `${user.id}/logo-${Date.now()}.${extension}`

      const { error: uploadError } = await supabase.storage
        .from("business-logos")
        .upload(filePath, file, {
          cacheControl: "3600",
          upsert: false,
        })

      if (uploadError) {
        throw uploadError
      }

      const { data: publicUrlData } = supabase.storage
        .from("business-logos")
        .getPublicUrl(filePath)

      const publicUrl = publicUrlData?.publicUrl

      if (!publicUrl) {
        throw new Error("Could not create a public logo URL.")
      }

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          logo_url: publicUrl,
        })
        .eq("id", user.id)

      if (profileError) {
        throw profileError
      }

      setLogoUrl(publicUrl)
      toast.success("Business logo uploaded!")
    } catch (error) {
      console.error("Logo upload error:", error)
      toast.error(error.message || "Could not upload your logo.")
    } finally {
      setIsUploadingLogo(false)
      event.target.value = ""
    }
  }

  const handleRemoveLogo = async () => {
    if (!logoUrl) {
      return
    }

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Please log in again.")
      }

      const { error } = await supabase
        .from("profiles")
        .update({
          logo_url: null,
        })
        .eq("id", user.id)

      if (error) {
        throw error
      }

      setLogoUrl("")
      toast.success("Business logo removed.")
    } catch (error) {
      console.error("Logo removal error:", error)
      toast.error(error.message || "Could not remove your logo.")
    }
  }

  const handleSubmit = async (event) => {
    event.preventDefault()

    if (!businessName.trim()) {
      toast.error("Please enter your business name.")
      return
    }

    if (!username) {
      toast.error("Please choose a booking username.")
      return
    }

    if (!businessCategory) {
      toast.error("Please choose a business category.")
      return
    }

    setIsSaving(true)

    try {
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error("Your session expired. Please log in again.")
      }

      const { data: existingUsername, error: usernameError } =
  await supabase
    .from("business_profiles")
    .select("id")
    .eq("username", username)
    .neq("user_id", user.id)
    .maybeSingle()

if (usernameError) {
  throw usernameError
}

if (existingUsername) {
  toast.error("That booking username is already taken.")
  return
}

// Keep the regular profile updated
const { error: profileError } = await supabase
  .from("profiles")
  .update({
    business_name: businessName.trim(),
    username,
    business_category: businessCategory,
    phone: phone.trim(),
    description: description.trim(),
    business_email: businessEmail.trim(),
    logo_url: logoUrl || null,
  })
  .eq("id", user.id)

if (profileError) {
  throw profileError
}

// See if this user already has a business_profiles row
const { data: existingBusiness, error: businessLookupError } =
  await supabase
    .from("business_profiles")
    .select("id")
    .eq("user_id", user.id)
    .maybeSingle()

if (businessLookupError) {
  throw businessLookupError
}

let businessSaveError

if (existingBusiness) {
  const { error } = await supabase
    .from("business_profiles")
    .update({
      business_name: businessName.trim(),
      username,
      description: description.trim(),
      logo_url: logoUrl || null,
      is_public: true,
    })
    .eq("user_id", user.id)

  businessSaveError = error
} else {
  const { error } = await supabase
    .from("business_profiles")
    .insert({
      user_id: user.id,
      business_name: businessName.trim(),
      username,
      description: description.trim(),
      logo_url: logoUrl || null,
      is_public: true,
    })

  businessSaveError = error
}

if (businessSaveError) {
  throw businessSaveError
}

toast.success("Business details saved!")
navigate("/setup/services")
    } catch (error) {
      console.error("Business profile save error:", error)

      if (error.code === "23505") {
        toast.error("That booking username is already taken.")
      } else {
        toast.error(
          error.message || "Could not save your business details."
        )
      }
    } finally {
      setIsSaving(false)
    }
  }

  const bookingLink = username
    ? `${window.location.origin}/book/${username}`
    : `${window.location.origin}/book/yourname`

  if (isLoadingProfile) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[#020617] px-4 text-white">
        <div className="text-center">
          <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-blue-500/20 border-t-blue-500" />

          <p className="mt-4 text-slate-400">
            Loading your business profile...
          </p>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[#020617] px-4 py-10 text-white">
      <div className="mx-auto w-full max-w-3xl">
        <header className="mb-8 text-center">
          <p className="text-sm font-bold uppercase tracking-[0.35em] text-blue-400">
            yorly
          </p>

          <h1 className="mt-4 text-3xl font-bold sm:text-4xl">
            Let&apos;s build your business
          </h1>

          <p className="mt-3 text-slate-400">
            Add the details clients will see on your booking page.
          </p>
        </header>

        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between text-sm">
            <span className="font-semibold text-blue-400">
              Step 1 of 4
            </span>

            <span className="text-slate-500">
              Business details
            </span>
          </div>

          <div className="h-2 overflow-hidden rounded-full bg-slate-800">
            <div className="h-full w-1/4 rounded-full bg-blue-500" />
          </div>
        </div>

        <section className="rounded-3xl border border-blue-400/20 bg-[#0F172A] p-6 shadow-2xl sm:p-8">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="mb-2 block text-sm font-semibold text-slate-300">
                Business logo
              </label>

              <div className="flex flex-col gap-4 rounded-2xl border border-blue-400/20 bg-[#020617]/60 p-4 sm:flex-row sm:items-center">
                <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-blue-400/20 bg-[#0F172A]">
                  {logoUrl ? (
                    <img
                      src={logoUrl}
                      alt="Business logo preview"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="px-3 text-center text-xs text-slate-500">
                      No logo uploaded
                    </span>
                  )}
                </div>

                <div className="flex-1">
                  <div className="flex flex-col gap-3 sm:flex-row">
                    <label
                      htmlFor="businessLogo"
                      className={`inline-flex cursor-pointer items-center justify-center rounded-2xl px-5 py-3 font-semibold text-white transition ${
                        isUploadingLogo
                          ? "cursor-not-allowed bg-blue-500/50"
                          : "bg-blue-500 hover:bg-blue-400"
                      }`}
                    >
                      {isUploadingLogo
                        ? "Uploading..."
                        : logoUrl
                          ? "Replace Logo"
                          : "Choose Logo"}
                    </label>

                    <input
                      id="businessLogo"
                      type="file"
                      accept="image/png,image/jpeg,image/webp,image/svg+xml"
                      onChange={handleLogoUpload}
                      disabled={isUploadingLogo}
                      className="hidden"
                    />

                    {logoUrl && (
                      <button
                        type="button"
                        onClick={handleRemoveLogo}
                        disabled={isUploadingLogo}
                        className="rounded-2xl border border-red-500/30 bg-red-500/10 px-5 py-3 font-semibold text-red-400 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        Remove Logo
                      </button>
                    )}
                  </div>

                  <p className="mt-3 text-xs text-slate-500">
                    PNG, JPG, WEBP, or SVG. Maximum size 5 MB.
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label
                htmlFor="businessName"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Business name
              </label>

              <input
                id="businessName"
                type="text"
                value={businessName}
                onChange={(event) =>
                  setBusinessName(event.target.value)
                }
                placeholder="Styled by Tasha"
                required
                className="w-full rounded-2xl border border-blue-400/20 bg-[#020617]/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
              />
            </div>

            <div>
              <label
                htmlFor="username"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Booking username
              </label>

              <input
                id="username"
                type="text"
                value={username}
                onChange={handleUsernameChange}
                placeholder="styledbytasha"
                required
                className="w-full rounded-2xl border border-blue-400/20 bg-[#020617]/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
              />

              <p className="mt-2 text-xs text-slate-500">
                Use letters, numbers, underscores, or hyphens.
              </p>
            </div>

            <div className="rounded-2xl border border-blue-400/20 bg-blue-500/5 p-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-blue-400">
                Your booking link
              </p>

              <p className="mt-2 break-all text-sm text-slate-300">
                {bookingLink}
              </p>
            </div>

            <div>
              <label
                htmlFor="businessCategory"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Business category
              </label>

              <select
                id="businessCategory"
                value={businessCategory}
                onChange={(event) =>
                  setBusinessCategory(event.target.value)
                }
                required
                className="w-full rounded-2xl border border-blue-400/20 bg-[#020617] px-4 py-3 text-white outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
              >
                <option value="">Choose a category</option>
                <option value="Hair Stylist">Hair Stylist</option>
                <option value="Braider">Braider</option>
                <option value="Barber">Barber</option>
                <option value="Nail Technician">
                  Nail Technician
                </option>
                <option value="Makeup Artist">Makeup Artist</option>
                <option value="Lash Artist">Lash Artist</option>
                <option value="Esthetician">Esthetician</option>
                <option value="Massage Therapist">
                  Massage Therapist
                </option>
                <option value="Personal Trainer">
                  Personal Trainer
                </option>
                <option value="Photographer">Photographer</option>
                <option value="Tattoo Artist">Tattoo Artist</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div className="grid gap-6 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="phone"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Phone number
                </label>

                <input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  placeholder="(555) 555-5555"
                  className="w-full rounded-2xl border border-blue-400/20 bg-[#020617]/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
                />
              </div>

              <div>
                <label
                  htmlFor="businessEmail"
                  className="mb-2 block text-sm font-semibold text-slate-300"
                >
                  Business email
                </label>

                <input
                  id="businessEmail"
                  type="email"
                  value={businessEmail}
                  onChange={(event) =>
                    setBusinessEmail(event.target.value)
                  }
                  placeholder="owner@example.com"
                  required
                  className="w-full rounded-2xl border border-blue-400/20 bg-[#020617]/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor="description"
                className="mb-2 block text-sm font-semibold text-slate-300"
              >
                Business description
              </label>

              <textarea
                id="description"
                value={description}
                onChange={(event) =>
                  setDescription(event.target.value)
                }
                placeholder="Tell clients what you specialize in."
                rows={5}
                maxLength={300}
                className="w-full resize-none rounded-2xl border border-blue-400/20 bg-[#020617]/60 px-4 py-3 text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400 focus:ring-2 focus:ring-blue-400/40"
              />

              <p className="mt-2 text-right text-xs text-slate-500">
                {description.length}/300
              </p>
            </div>

            <button
              type="submit"
              disabled={isSaving || isUploadingLogo}
              className="w-full rounded-2xl bg-blue-500 px-5 py-3.5 font-semibold text-white transition hover:bg-blue-400 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSaving
                ? "Saving..."
                : "Continue to services"}
            </button>
          </form>
        </section>
      </div>
    </main>
  )
}

export default Setup