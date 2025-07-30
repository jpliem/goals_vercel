// AI prompt building utilities (non-server actions)

// Helper function to build pure goal data without analysis instructions
export function buildPureGoalData(goalData: any): string {
  const currentDate = new Date().toISOString().split('T')[0]
  const isOverdue = goalData.target_date && new Date(goalData.target_date) < new Date()
  
  return `
GOAL ANALYSIS REQUEST

Goal: ${goalData.subject}
Department: ${goalData.department}
Status: ${goalData.status}
Priority: ${goalData.priority}
Start Date: ${goalData.start_date || 'Not set'}
Target Date: ${goalData.target_date || 'Not set'}
Current Date: ${currentDate}
${isOverdue ? '⚠️ OVERDUE' : ''}

Description: ${goalData.description}

${goalData.target_metrics ? `Target Metrics: ${goalData.target_metrics}` : ''}
${goalData.success_criteria ? `Success Criteria: ${goalData.success_criteria}` : ''}

Tasks (${goalData.tasks?.length || 0}):
${goalData.tasks?.map((task: any, index: number) => 
  `${index + 1}. [${task.status.toUpperCase()}] ${task.title} (${task.pdca_phase} phase)${task.completion_notes ? ` - ${task.completion_notes}` : ''}`
).join('\n') || 'No tasks defined'}

Comments & Updates (${goalData.comments?.length || 0}):
${goalData.comments?.map((comment: any, index: number) => 
  `${index + 1}. ${comment.user?.full_name || 'Unknown'} (${new Date(comment.created_at).toLocaleDateString()}): ${comment.comment}`
).join('\n') || 'No comments'}

Team:
- Owner: ${goalData.owner?.full_name || 'Unknown'}
- Assignees: ${goalData.assignees?.map((a: any) => a.user?.full_name).join(', ') || 'None'}
- Supporting Departments: ${goalData.support?.map((s: any) => s.support_name).join(', ') || 'None'}
`.trim()
}

// Helper function to build analysis prompt based on type
export function buildAnalysisPrompt(goalData: any, analysisType: string): string {
  const currentDate = new Date().toISOString().split('T')[0]
  const isOverdue = goalData.target_date && new Date(goalData.target_date) < new Date()
  
  const baseInfo = `
GOAL ANALYSIS REQUEST

Goal: ${goalData.subject}
Department: ${goalData.department}
Status: ${goalData.status}
Priority: ${goalData.priority}
Start Date: ${goalData.start_date || 'Not set'}
Target Date: ${goalData.target_date || 'Not set'}
Current Date: ${currentDate}
${isOverdue ? '⚠️ OVERDUE' : ''}

Description: ${goalData.description}

${goalData.target_metrics ? `Target Metrics: ${goalData.target_metrics}` : ''}
${goalData.success_criteria ? `Success Criteria: ${goalData.success_criteria}` : ''}

Tasks (${goalData.tasks?.length || 0}):
${goalData.tasks?.map((task: any, index: number) => 
  `${index + 1}. [${task.status.toUpperCase()}] ${task.title} (${task.pdca_phase} phase)${task.completion_notes ? ` - ${task.completion_notes}` : ''}`
).join('\n') || 'No tasks defined'}

Comments & Updates (${goalData.comments?.length || 0}):
${goalData.comments?.map((comment: any, index: number) => 
  `${index + 1}. ${comment.user?.full_name || 'Unknown'} (${new Date(comment.created_at).toLocaleDateString()}): ${comment.comment}`
).join('\n') || 'No comments'}

Team:
- Owner: ${goalData.owner?.full_name || 'Unknown'}
- Assignees: ${goalData.assignees?.map((a: any) => a.user?.full_name).join(', ') || 'None'}
- Supporting Departments: ${goalData.support?.map((s: any) => s.support_name).join(', ') || 'None'}
`

  switch (analysisType) {
    case 'risk_assessment':
      return baseInfo + `
Please provide a comprehensive risk assessment for this goal, including:
1. Identified risks and potential blockers
2. Risk severity and likelihood
3. Mitigation strategies
4. Early warning indicators to monitor`

    case 'optimization_suggestions':
      return baseInfo + `
Please analyze this goal and provide optimization suggestions:
1. Areas for improvement in goal structure or approach
2. Task organization and sequencing recommendations
3. Resource allocation suggestions
4. Timeline optimization opportunities`

    case 'progress_review':
      return baseInfo + `
Please provide a detailed progress review:
1. Current progress assessment against timeline
2. Task completion analysis by PDCA phase
3. Identification of bottlenecks or delays
4. Recommendations for acceleration`

    case 'task_breakdown':
      return baseInfo + `
Please suggest additional tasks or task improvements:
1. Missing tasks for successful goal completion
2. Task dependencies and sequencing
3. PDCA phase alignment recommendations
4. Resource and timeline estimates for new tasks`

    default: // 'custom'
      return baseInfo + `
Please provide a comprehensive analysis of this goal including:
1. Overall assessment of goal structure and progress
2. Risk identification and mitigation strategies
3. Optimization opportunities and recommendations
4. Next steps and action items for improved success`
  }
}

// Helper function to build meta-analysis data for template substitution
export function buildMetaAnalysisData(analyses: any[]): string {
  const analysisContent = analyses.map((analysis, index) => {
    const goal = analysis.goals as any
    return `
ANALYSIS ${index + 1}:
Goal: ${goal?.subject || 'Unknown Goal'}
Department: ${goal?.department || 'Unknown'}
Status: ${goal?.status || 'Unknown'}
Analysis Type: ${analysis.analysis_type}
Date: ${new Date(analysis.created_at as string).toLocaleDateString()}

Analysis Content:
${analysis.analysis_result}

---`
  }).join('\n')

  return `META-ANALYSIS REQUEST

Total Analyses: ${analyses.length}
Generated: ${new Date().toLocaleDateString()}

${analysisContent}

END OF ANALYSIS DATA`
}