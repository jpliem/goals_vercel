import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

// Environment variables validation
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const hasRequiredEnvVars = supabaseUrl && supabaseServiceKey

// Create admin client that bypasses RLS (only if we have env vars)
let supabaseAdmin: ReturnType<typeof createClient> | null = null

if (hasRequiredEnvVars) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  } catch (error) {
    console.error("Failed to initialize Supabase Admin client:", error)
    supabaseAdmin = null
  }
}

export async function POST(request: NextRequest) {
  try {
    const { email, password, full_name, department, team = null, role = "Employee" } = await request.json()

    // Validation
    if (!email || !password || !full_name || !department) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      )
    }

    if (password.length < 6) {
      return NextResponse.json(
        { error: "Password must be at least 6 characters long" },
        { status: 400 }
      )
    }

    // Validate role
    if (!["Employee", "Head", "Admin"].includes(role)) {
      return NextResponse.json(
        { error: "Invalid role" },
        { status: 400 }
      )
    }

    if (!supabaseAdmin) {
      // Mock mode - always return success for development
      return NextResponse.json({ 
        message: "User registered successfully (mock mode)",
        user: {
          id: `user-mock-${Date.now()}`,
          email: email.toLowerCase().trim(),
          full_name: full_name.trim(),
          department,
          team,
          role
        }
      })
    }

    // Check if user already exists
    const { data: existingUser } = await supabaseAdmin
      .from("users")
      .select("email")
      .eq("email", email.toLowerCase().trim())
      .single()

    if (existingUser) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 409 }
      )
    }

    // Create new user
    const { data: newUser, error } = await supabaseAdmin
      .from("users")
      .insert([
        {
          email: email.toLowerCase().trim(),
          password, // In production, you should hash this
          full_name: full_name.trim(),
          department,
          team: team || null,
          role,
          skills: [],
          is_active: true
        }
      ])
      .select()
      .single()

    if (error) {
      console.error("Database error:", error)
      return NextResponse.json(
        { error: "Failed to create user" },
        { status: 500 }
      )
    }

    // Return success (without password)
    const { password: _, ...userWithoutPassword } = newUser
    return NextResponse.json({
      message: "User registered successfully",
      user: userWithoutPassword
    })

  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}