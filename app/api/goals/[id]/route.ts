import { NextRequest, NextResponse } from "next/server"
import { getGoalById } from "@/lib/goal-database"
import { getCurrentUserProfile } from "@/lib/auth"

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const userSession = await getCurrentUserProfile()
    
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await params
    const goalResult = await getGoalById(id)

    if (goalResult.error) {
      return NextResponse.json({ error: goalResult.error.toString() }, { status: 500 })
    }

    return NextResponse.json(goalResult.data)
  } catch (error) {
    console.error("Error fetching goal:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}