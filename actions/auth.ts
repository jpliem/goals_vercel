"use server"

import { cookies } from "next/headers"
import { redirect } from "next/navigation"
import { getUserByEmail, createUser, updateUserPassword } from "@/lib/database"

export async function login(formData: FormData) {
  const email = (formData.get("email") as string)?.toLowerCase()?.trim()
  const password = formData.get("password") as string

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  try {
    const user = await getUserByEmail(email)
    if (!user) {
      return { error: "Invalid credentials" }
    }

    // Simple password comparison for localhost development
    const isValidPassword = password === user.password

    if (!isValidPassword) {
      return { error: "Invalid credentials" }
    }

    // Set session cookie
    console.log("🍪 login: Setting session cookie")
    const cookieStore = await cookies()
    const sessionData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
    }
    
    console.log("🍪 login: Session data:", sessionData)
    
    cookieStore.set(
      "session",
      JSON.stringify(sessionData),
      {
        httpOnly: true,
        secure: (process.env.NODE_ENV as string) === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax", // Add sameSite for better compatibility
      },
    )
    
    console.log("🍪 login: Session cookie set successfully")

    // Return success instead of redirecting here
    return { success: true, user: { id: user.id, email: user.email, full_name: user.full_name, role: user.role, department: user.department } }
  } catch (error) {
    console.error("Login error:", error)
    return { error: "An error occurred during login" }
  }
}

export async function register(formData: FormData) {
  const fullName = formData.get("fullName") as string
  const email = (formData.get("email") as string)?.toLowerCase()?.trim()
  const password = formData.get("password") as string
  const role = formData.get("role") as string
  const department = formData.get("department") as string

  if (!fullName || !email || !password || !role) {
    return { error: "All required fields must be filled" }
  }

  // Validate email format
  if (!email.includes("@")) {
    return { error: "Please enter a valid email address" }
  }

  // Validate role
  if (!["Employee", "Head", "Admin"].includes(role)) {
    return { error: "Invalid role selected" }
  }

  try {
    // Check if user already exists
    const existingUser = await getUserByEmail(email)
    if (existingUser) {
      return { error: "An account with this email already exists" }
    }

    // Create new user
    const result = await createUser({
      full_name: fullName,
      email: email,
      password: password,
      role: role as 'Admin' | 'Head' | 'Employee',
      department: department || undefined
    })

    if (result.error) {
      return { error: result.error }
    }

    const newUser = result.data
    if (!newUser) {
      return { error: "Failed to create account" }
    }

    console.log("✅ User registered successfully:", newUser.email)
    return { success: true, user: newUser }
  } catch (error) {
    console.error("Registration error:", error)
    return { error: "An error occurred during registration" }
  }
}

export async function changePassword(formData: FormData) {
  const currentPassword = formData.get("currentPassword") as string
  const newPassword = formData.get("newPassword") as string

  if (!currentPassword || !newPassword) {
    return { error: "Current password and new password are required" }
  }

  if (newPassword.length < 6) {
    return { error: "New password must be at least 6 characters long" }
  }

  try {
    // Get current user from session
    const cookieStore = await cookies()
    const sessionCookie = cookieStore.get("session")
    
    if (!sessionCookie) {
      return { error: "You must be logged in to change your password" }
    }

    const user = JSON.parse(sessionCookie.value)

    // Verify current password by getting the user
    const currentUser = await getUserByEmail(user.email)
    if (!currentUser) {
      return { error: "User not found" }
    }

    if (currentUser.password !== currentPassword) {
      return { error: "Current password is incorrect" }
    }

    // Update password
    const updateResult = await updateUserPassword(user.id, newPassword)
    if (!updateResult.success) {
      return { error: updateResult.error || "Failed to update password" }
    }

    console.log("✅ Password changed successfully for user:", user.email)
    return { success: true }
  } catch (error) {
    console.error("Change password error:", error)
    return { error: "An error occurred while changing your password" }
  }
}

export async function logout() {
  const cookieStore = await cookies()
  cookieStore.delete("session")
  redirect("/login")
}

export async function debugSwitchUser(userId: string) {
  // Only allow in development environment
  if (process.env.NODE_ENV === 'production') {
    return { error: "Debug user switching is not available in production" }
  }

  try {
    // Get user by ID from database
    const { getUserById } = await import("@/lib/goal-database")
    const result = await getUserById(userId)
    
    if (result.error || !result.data) {
      return { error: "User not found" }
    }

    const user = result.data

    // Set session cookie with the new user data
    console.log("🐛 debugSwitchUser: Switching to user:", user.email)
    const cookieStore = await cookies()
    const sessionData = {
      id: user.id,
      email: user.email,
      full_name: user.full_name,
      role: user.role,
      department: user.department,
    }
    
    console.log("🐛 debugSwitchUser: Session data:", sessionData)
    
    cookieStore.set(
      "session",
      JSON.stringify(sessionData),
      {
        httpOnly: true,
        secure: (process.env.NODE_ENV as string) === "production",
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: "/",
        sameSite: "lax",
      },
    )
    
    console.log("🐛 debugSwitchUser: Session switched successfully")
    return { success: true, user: sessionData }
  } catch (error) {
    console.error("Debug user switch error:", error)
    return { error: "An error occurred while switching users" }
  }
}
