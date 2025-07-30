import { NextRequest, NextResponse } from "next/server"
import { requireAuth } from "@/lib/auth"
import { supabaseAdmin } from "@/lib/database"

export async function GET(request: NextRequest) {
  try {
    // Check authentication and admin access
    const user = await requireAuth()
    
    if (user.role !== "Admin") {
      return NextResponse.json(
        { error: "Admin access required" },
        { status: 403 }
      )
    }

    if (!supabaseAdmin) {
      return NextResponse.json(
        { error: "Database not available" },
        { status: 500 }
      )
    }

    // Fetch all goals
    const { data: allGoals, error: goalsError } = await supabaseAdmin
      .from('goals')
      .select(`
        id,
        subject,
        description,
        status,
        priority,
        department,
        created_at,
        target_date,
        owner:users!goals_owner_id_fkey(full_name)
      `)
      .order('created_at', { ascending: false })

    if (goalsError) {
      console.error("Database error fetching goals:", goalsError)
      return NextResponse.json(
        { error: "Failed to fetch goals" },
        { status: 500 }
      )
    }

    if (!allGoals) {
      return NextResponse.json({
        goals: [],
        total: 0,
        analyzed: 0,
        not_analyzed: 0
      })
    }

    // Fetch latest analysis for each goal
    const { data: analyses, error: analysisError } = await supabaseAdmin
      .from('goal_ai_analysis')
      .select(`
        goal_id,
        id,
        analysis_type,
        created_at,
        analysis_result,
        tokens_used,
        processing_time_ms,
        ai_config:ai_configurations!goal_ai_analysis_ai_config_id_fkey(
          name,
          model_name
        )
      `)
      .in('goal_id', allGoals.map(g => g.id))
      .order('created_at', { ascending: false })

    if (analysisError) {
      console.error("Database error fetching analyses:", analysisError)
      return NextResponse.json(
        { error: "Failed to fetch analysis data" },
        { status: 500 }
      )
    }

    // Group analyses by goal_id and get the latest one for each goal
    const latestAnalysesByGoal = (analyses || []).reduce((acc, analysis: any) => {
      if (!acc[analysis.goal_id] || new Date(analysis.created_at) > new Date(acc[analysis.goal_id].created_at)) {
        acc[analysis.goal_id] = analysis
      }
      return acc
    }, {} as Record<string, any>)

    // Attach latest analysis to each goal
    const goalsWithAnalysis = allGoals.map((goal: any) => ({
      ...goal,
      latest_analysis: latestAnalysesByGoal[goal.id] || null
    }))

    const analyzedCount = Object.keys(latestAnalysesByGoal).length

    return NextResponse.json({
      goals: goalsWithAnalysis,
      total: allGoals.length,
      analyzed: analyzedCount,
      not_analyzed: allGoals.length - analyzedCount
    })

  } catch (error) {
    console.error("Error in goals-with-analysis API:", error)
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    )
  }
}