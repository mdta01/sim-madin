import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  
  if (!authHeader?.startsWith("Bearer ")) {
    return NextResponse.json({ error: "No Bearer token" })
  }
  
  const token = authHeader.slice(7)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  
  // Step 1: Test direct HTTP call to Supabase
  try {
    const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: {
        "apikey": anonKey || serviceKey,
        "Authorization": `Bearer ${token}`,
      },
    })
    
    const responseStatus = response.status
    const responseBody = await response.text()
    
    return NextResponse.json({
      step1: "Supabase Auth API call",
      responseStatus,
      responseBody: responseBody.slice(0, 200),
      supabaseUrl: supabaseUrl,
      hasAnonKey: !!anonKey,
      hasServiceKey: !!serviceKey,
      usedApiKey: (anonKey || serviceKey)?.slice(0, 20) + "...",
    })
  } catch (err: any) {
    return NextResponse.json({
      step1: "FAILED",
      error: err.message,
      stack: err.stack?.slice(0, 200),
    })
  }
}
