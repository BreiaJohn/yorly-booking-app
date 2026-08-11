import "jsr:@supabase/functions-js/edge-runtime.d.ts"

const resendApiKey = Deno.env.get("RESEND_API_KEY")

if (!resendApiKey) {
  throw new Error("RESEND_API_KEY is not set")
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
    })
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({
        success: false,
        error: "Method not allowed",
      }),
      {
        status: 405,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }

  try {
    const {
      fullName,
      email,
      businessName,
      businessType,
      goals,
    } = await req.json()

    if (
      !fullName?.trim() ||
      !email?.trim() ||
      !businessType?.trim() ||
      !goals?.trim()
    ) {
      throw new Error("Required application fields are missing")
    }

    const resendResponse = await fetch(
      "https://api.resend.com/emails",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          "Content-Type": "application/json",
          "User-Agent": "Yorly/1.0",
        },
        body: JSON.stringify({
          from: "Yorly Beta <hello@yorly.co>",
          to: ["hello@yorly.co"],
          reply_to: email.trim().toLowerCase(),
          subject: `New Yorly beta application — ${fullName.trim()}`,
          html: `
  <!doctype html>
  <html>
    <body style="margin:0;padding:0;background:#020817;font-family:Arial,Helvetica,sans-serif;color:#e5e7eb;">
      <div style="padding:40px 16px;">
        <div style="max-width:640px;margin:0 auto;background:#0d172b;border:1px solid #243047;border-radius:24px;overflow:hidden;">

          <div style="padding:34px 34px 28px;background:linear-gradient(135deg,#2563eb,#7c3aed);color:#ffffff;">
            <div style="font-size:12px;font-weight:700;letter-spacing:.14em;text-transform:uppercase;opacity:.9;">
              Yorly Beta
            </div>

            <h1 style="margin:10px 0 0;font-size:28px;line-height:1.25;">
              New beta application
            </h1>

            <p style="margin:10px 0 0;font-size:15px;line-height:1.6;opacity:.9;">
              A new business owner is interested in testing Yorly.
            </p>
          </div>

          <div style="padding:32px 34px;">

            <div style="margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">
                Name
              </div>

              <div style="font-size:18px;font-weight:700;color:#ffffff;">
                ${escapeHtml(fullName)}
              </div>
            </div>

            <div style="margin-bottom:24px;">
              <div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">
                Email
              </div>

              <div style="font-size:16px;color:#cbd5e1;">
                <a
  href="mailto:${escapeHtml(email)}"
  style="color:#ffffff;text-decoration:none;"
>
  ${escapeHtml(email)}
</a>
              </div>
            </div>

            <div style="display:flex;gap:18px;flex-wrap:wrap;margin-bottom:24px;">
              <div style="flex:1;min-width:220px;background:#111c33;border:1px solid #243047;border-radius:16px;padding:18px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">
                  Business
                </div>

                <div style="font-size:16px;font-weight:600;color:#ffffff;">
                  ${escapeHtml(businessName || "Not provided")}
                </div>
              </div>

              <div style="flex:1;min-width:220px;background:#111c33;border:1px solid #243047;border-radius:16px;padding:18px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#94a3b8;margin-bottom:6px;">
                  Business type
                </div>

                <div style="font-size:16px;font-weight:600;color:#ffffff;">
                  ${escapeHtml(businessType)}
                </div>
              </div>
            </div>

            <div>
              <div style="font-size:12px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#a78bfa;margin-bottom:10px;">
  What they want help with
</div>

<div style="background:#111c33;border:1px solid #243047;border-radius:16px;padding:20px;font-size:15px;line-height:1.7;color:#dbe4f0;white-space:pre-wrap;">
  ${escapeHtml(goals)}
</div>


<div style="margin-top:30px;text-align:center;">
  <a
    href="mailto:${escapeHtml(email)}"
    style="
      display:inline-block;
      background:linear-gradient(135deg,#2563eb,#7c3aed);
      color:#ffffff;
      padding:14px 28px;
      border-radius:12px;
      text-decoration:none;
      font-weight:700;
      font-size:15px;
    "
  >
    Reply to Applicant
  </a>
</div>

<div style="margin-top:28px;padding-top:20px;border-top:1px solid #243047;font-size:13px;line-height:1.6;color:#94a3b8;">
  Reply directly to this email to contact ${escapeHtml(fullName)}.
</div>

          </div>

          <div style="padding:18px 34px;background:#08111f;border-top:1px solid #243047;text-align:center;font-size:12px;color:#64748b;">
            Sent automatically from Yorly Beta
          </div>

        </div>
      </div>
    </body>
  </html>
`,
        }),
      }
    )

    const responseText = await resendResponse.text()

    console.log("Resend status:", resendResponse.status)
    console.log("Resend response:", responseText)

    if (!resendResponse.ok) {
      throw new Error(
        `Resend failed: ${resendResponse.status} ${responseText}`
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  } catch (error) {
    console.error("Beta application email error:", error)

    return new Response(
      JSON.stringify({
        success: false,
        error:
          error instanceof Error
            ? error.message
            : "Unable to send beta application email",
      }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    )
  }
})

function escapeHtml(value: unknown) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;")
}