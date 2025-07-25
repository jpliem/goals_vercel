import { NextRequest, NextResponse } from "next/server"
import { getGoals } from "@/lib/goal-database"
import { getCurrentUserProfile } from "@/lib/auth"

export async function GET(request: NextRequest) {
  try {
    const userSession = await getCurrentUserProfile()
    
    if (!userSession) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const department = searchParams.get('department')
    const assigneeId = searchParams.get('assigneeId')

    const goalsResult = await getGoals({
      userId: userSession.id,
      status: status || undefined,
      department: department || undefined
    })

    if (goalsResult.error) {
      return NextResponse.json({ error: goalsResult.error.toString() }, { status: 500 })
    }

    return NextResponse.json(goalsResult.data)
  } catch (error) {
    console.error("Error fetching goals:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}