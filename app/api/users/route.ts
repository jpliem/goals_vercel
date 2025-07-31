import { requireAuth } from '@/lib/auth'
import { getUsers } from '@/lib/goal-database'

export async function GET() {
  try {
    console.log('🔍 API /users endpoint called')
    const user = await requireAuth()
    
    if (user.role !== 'Admin') {
      console.log('❌ Access denied: User role is', user.role)
      return Response.json({ error: 'Admin access required' }, { status: 403 })
    }
    
    console.log('✅ Admin access confirmed, fetching users...')
    const result = await getUsers()
    console.log('📊 API returning users:', { 
      count: result.data?.length || 0,
      hasError: !!result.error 
    })
    
    return Response.json(result)
  } catch (error) {
    console.error('❌ API /users error:', error)
    return Response.json({ error: 'Failed to fetch users' }, { status: 500 })
  }
}