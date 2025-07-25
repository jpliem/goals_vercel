import { createClient } from "@supabase/supabase-js";
import type { Database, AIAnalysisData } from "./supabase";
import { getTwoWeeksFocusRequestsCompatible, getFocusRequestsRangeCompatible, cleanupOldFocusDataCompatible } from "./database-focus-migration";

// Environment variables validation

// Validate environment variables
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

// Check if we have the required environment variables
const hasRequiredEnvVars = supabaseUrl && supabaseServiceKey

if (!hasRequiredEnvVars) {
  console.warn("Missing Supabase environment variables. Using mock data mode.")
}

// Create admin client that bypasses RLS (only if we have env vars)
let supabaseAdmin: ReturnType<typeof createClient> | null = null
let supabaseConnectionStatus: 'connected' | 'disconnected' | 'checking' = 'checking'

if (hasRequiredEnvVars) {
  try {
    supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
    
    // Test the connection immediately with timeout
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Connection test timeout')), 5000)
    )
    
    const testPromise = supabaseAdmin
      .from('users')
      .select('count', { count: 'exact', head: true })
    
    Promise.race([testPromise, timeoutPromise])
      .then((result: any) => {
        if (result.error) {
          console.warn("⚠️ Supabase connection test failed:", result.error.message)
          supabaseConnectionStatus = 'disconnected'
        } else {
          supabaseConnectionStatus = 'connected'
        }
      })
      .catch((err: any) => {
        console.warn("⚠️ Supabase connection test error:", err.message || err)
        supabaseConnectionStatus = 'disconnected'
      })
      
  } catch (error) {
    console.error("✗ Failed to initialize Supabase Admin client:", error)
    supabaseAdmin = null
    supabaseConnectionStatus = 'disconnected'
  }
} else {
  supabaseConnectionStatus = 'disconnected'
}

// Export connection status for UI components
export function getSupabaseConnectionStatus(): 'connected' | 'disconnected' | 'checking' {
  return supabaseConnectionStatus
}

// Simple SQL function using Supabase client or mock data
export function getSQL() {
  const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    try {
      // If no Supabase client, use mock data
      if (!supabaseAdmin) {

        // Parse the query to determine what operation to perform
        const query = strings.join("?").toLowerCase()

        // Handle user login query
        if (query.includes("select") && query.includes("users") && query.includes("where email")) {
          const email = values[0]

          const user = findMockUserByEmail(email)
          return user ? [user] : []
        }

        // Handle user registration - check if exists
        if (query.includes("select id from users where email")) {
          const email = values[0]
          console.log("Checking if mock user exists with email:", email)
          
          const user = findMockUserByEmail(email)
          return user ? [{ id: user.id }] : []
        }

        // Handle user creation
        if (query.includes("insert into users")) {
          // For mock data, just return a success response
          console.log("Mock user creation for values:", values)
          return [{ id: `mock-${Date.now()}` }]
        }

        // Default empty result for unsupported queries
        console.log("Unsupported mock query:", query)
        return []
      }

      // If we have Supabase admin client, we would implement actual SQL queries here
      // For now, just log that this needs implementation
      console.log("getSQL called with Supabase client - query:", strings.join("?"))
      throw new Error("Direct SQL queries with Supabase client not implemented")
      
    } catch (error) {
      console.error("SQL query error:", error)
      throw error
    }
  }

  return sql
}


type Tables = Database["public"]["Tables"]
type Request = Tables["requests"]["Row"]
type Application = Tables["applications"]["Row"]
type UserRecord = Tables["users"]["Row"]
type RequestComment = Tables["request_comments"]["Row"]
type RequestAttachment = Tables["request_attachments"]["Row"]
type DepartmentPermission = Tables["department_permissions"]["Row"]

export type { UserRecord, DepartmentPermission, Application, RequestComment, RequestAttachment }

// Mock data for development when Supabase is not available
const mockUsers: UserRecord[] = [
  {
    id: 'user-admin',
    email: 'admin@company.com',
    full_name: 'System Administrator',
    password: 'admin123',
    role: 'Admin',
    department: 'IT',
    skills: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-pic1',
    email: 'john.doe@company.com',
    full_name: 'John Doe',
    password: 'password123',
    role: 'PIC',
    department: 'Development',
    skills: ['JavaScript', 'React', 'Node.js'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-pic2',
    email: 'jane.smith@company.com',
    full_name: 'Jane Smith',
    password: 'password123',
    role: 'PIC',
    department: 'Development',
    skills: ['Python', 'Django', 'PostgreSQL'],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  },
  {
    id: 'user-requestor1',
    email: 'user@company.com',
    full_name: 'Test User',
    password: 'password123',
    role: 'Requestor',
    department: 'Business',
    skills: [],
    is_active: true,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  }
]

function findMockUserByEmail(email: string): UserRecord | null {
  return mockUsers.find(user => user.email.toLowerCase() === email?.toLowerCase()) || null
}

// Mock requests for development
const mockRequests: RequestWithDetails[] = []

function findMockRequestById(id: string): RequestWithDetails | null {
  return mockRequests.find(request => request.id === id) || null
}

// Mock applications for development
const mockApplications: Application[] = []

function getMockPICUsers(): UserRecord[] {
  return mockUsers.filter(user => user.role === 'PIC' || user.role === 'Admin')
}

export interface RequestWithDetails extends Request {
  application: Application | null // Allow null for new_application type requests
  requestor: UserRecord
  current_pic: UserRecord | null
  tech_lead: UserRecord | null
  executor: UserRecord | null
  assigned_by_user: UserRecord | null
  comments: (RequestComment & { user: UserRecord })[]
  attachments: RequestAttachment[]
  executors: RequestExecutor[] // Multi-executor assignments
  isFocused?: boolean // Whether this request is marked as focus
}

export interface PaginationParams {
  page: number
  limit: number
}

export interface PaginatedResult<T> {
  data: T[]
  totalCount: number
  totalPages: number
  currentPage: number
  pageSize: number
  hasNextPage: boolean
  hasPreviousPage: boolean
}

// Helper function to get user's department permissions
export async function getUserDepartmentPermissions(userId: string): Promise<{ data: string[] | null; error: Error | null }> {
  try {
    if (!supabaseAdmin) {
      return { data: [], error: null };
    }

    const { data, error } = await supabaseAdmin
      .from("department_permissions")
      .select("department")
      .eq("user_id", userId)
      .order("department");

    if (error) {
      console.error("Error fetching department permissions:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: data?.map((d) => d.department as string) || [], error: null };
  } catch (error) {
    console.error("Error in getUserDepartmentPermissions:", error);
    return { data: null, error: error as Error };
  }
}

// Helper function to get all users with their department permissions for export
export async function getUsersWithDepartmentPermissionsForExport(): Promise<{ data: Map<string, string[]> | null; error: Error | null }> {
  try {
    if (!supabaseAdmin) {
      return { data: new Map(), error: null };
    }

    const { data, error } = await supabaseAdmin
      .from("department_permissions")
      .select("user_id, department")
      .order("user_id, department");

    if (error) {
      console.error("Error fetching department permissions for export:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Group by user_id
    const permissionsMap = new Map<string, string[]>();
    data?.forEach((row) => {
      const userId = row.user_id as string;
      const department = row.department as string;

      if (!permissionsMap.has(userId)) {
        permissionsMap.set(userId, []);
      }
      permissionsMap.get(userId)!.push(department);
    });

    return { data: permissionsMap, error: null };
  } catch (error) {
    console.error("Error in getUsersWithDepartmentPermissionsForExport:", error);
    return { data: null, error: error as Error };
  }
}

export async function getRequests(options: {
  userId?: string;
  userRole?: string;
  pagination?: PaginationParams;
  departmentFilter?: string[];
  assignedToMe?: boolean;
}): Promise<{ data: PaginatedResult<RequestWithDetails> | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data
    if (!supabaseAdmin) {
      console.log("Using mock data for getRequests");

      let filteredRequests: RequestWithDetails[];
      
      // Add focus status to mock data (randomly assign for testing)
      const mockRequestsWithFocus = mockRequests.map(request => ({
        ...request,
        isFocused: Math.random() < 0.2 // 20% chance of being focused for testing
      }));
      
      // Apply role-based filtering to mock data
      if (options.userRole === "Requestor") {
        filteredRequests = mockRequestsWithFocus.filter((request) => {
          // Show user's own requests
          if (request.requestor_id === options.userId) return true;

          // Show requests from departments user has permissions for
          if (options.departmentFilter && options.departmentFilter.length > 0 && request.requestor?.department) {
            return options.departmentFilter.includes(request.requestor.department);
          }

          return false;
        });
      } else if (options.userRole === "PIC") {
        if (options.assignedToMe) {
          filteredRequests = mockRequestsWithFocus.filter(
            (request) =>
              request.current_pic_id === options.userId ||
              request.tech_lead_id === options.userId ||
              request.executor_id === options.userId ||
              // Check multi-executor assignments in mock data
              ((request as any).executors && (request as any).executors.some((e: any) => e.user_id === options.userId))
          );
        } else {
          filteredRequests = mockRequestsWithFocus.filter(
            (request) =>
              request.current_pic_id === options.userId ||
              request.tech_lead_id === options.userId ||
              request.executor_id === options.userId ||
              // Check multi-executor assignments in mock data
              ((request as any).executors && (request as any).executors.some((e: any) => e.user_id === options.userId))
          );
        }
      } else {
        // Admin sees all requests
        filteredRequests = mockRequestsWithFocus;
      }

      // Apply pagination to mock data
      if (options.pagination) {
        const offset = (options.pagination.page - 1) * options.pagination.limit;
        const paginatedData = filteredRequests.slice(offset, offset + options.pagination.limit);
        return {
          data: {
            data: paginatedData,
            totalCount: filteredRequests.length,
            totalPages: Math.ceil(filteredRequests.length / options.pagination.limit),
            currentPage: options.pagination.page,
            pageSize: options.pagination.limit,
            hasNextPage: options.pagination.page < Math.ceil(filteredRequests.length / options.pagination.limit),
            hasPreviousPage: options.pagination.page > 1,
          },
          error: null,
        };
      } else {
        // Return all data without pagination (backward compatibility)
        return {
          data: {
            data: filteredRequests,
            totalCount: filteredRequests.length,
            totalPages: 1,
            currentPage: 1,
            pageSize: filteredRequests.length,
            hasNextPage: false,
            hasPreviousPage: false,
          },
          error: null,
        };
      }
    }

    // Use Supabase
    console.log("Using Supabase for getRequests");

    let query = supabaseAdmin
      .from("requests")
      .select(`
        *,
        application:applications(*),
        requestor:users!requests_requestor_id_fkey(*),
        current_pic:users!requests_current_pic_id_fkey(*),
        tech_lead:users!requests_tech_lead_id_fkey(*),
        executor:users!requests_executor_id_fkey(*),
        assigned_by_user:users!requests_assigned_by_fkey(*),
        comments:request_comments(*, user:users(*)).order(created_at.desc),
        attachments:request_attachments(*)
      `)
      .order("created_at", { ascending: false });

    // Apply role-based and department-based filtering
    if (options.userRole === "Requestor" && options.userId) {
      // Requestor users can see:
      // 1. Their own requests
      // 2. Requests from departments they have permissions for
      let requestorFilter = `requestor_id.eq.${options.userId}`;

      // If Requestor has department permissions, also include requests from those departments
      if (options.departmentFilter && options.departmentFilter.length > 0) {
        const { data: deptUsers } = await supabaseAdmin
          .from("users")
          .select("id")
          .in("department", options.departmentFilter);

        if (deptUsers && deptUsers.length > 0) {
          const deptUserIds = deptUsers.map((u) => u.id);
          requestorFilter += `,requestor_id.in.(${deptUserIds.join(",")})`;
        }
      }

      query = query.or(requestorFilter);
    } else if (options.userRole === "PIC" && options.userId) {
      // PIC users can see requests where they are or were:
      // 1. Assigned as current PIC
      // 2. Assigned as tech lead
      // 3. Assigned as executor (legacy single executor)
      // 4. Assigned as multi-executor
      
      
      // First get requests where user is assigned as multi-executor
      const { data: multiExecutorRequests, error: multiExecutorError } = await supabaseAdmin
        .from("request_executors")
        .select("request_id")
        .eq("user_id", options.userId);
      
      
      const multiExecutorRequestIds = multiExecutorRequests?.map(re => re.request_id) || [];
      
      // Build filter conditions separately for better debugging and reliability
      const filterParts = [
        `current_pic_id.eq.${options.userId}`,
        `tech_lead_id.eq.${options.userId}`,
        `executor_id.eq.${options.userId}`
      ];
      
      // Add multi-executor request IDs as separate conditions
      if (multiExecutorRequestIds.length > 0) {
        // Add each multi-executor request ID as a separate condition
        multiExecutorRequestIds.forEach(requestId => {
          filterParts.push(`id.eq.${requestId}`);
        });
      }

      // If PIC has department permissions, also include requests from those departments
      if (options.departmentFilter && options.departmentFilter.length > 0) {
        const { data: deptUsers } = await supabaseAdmin
          .from("users")
          .select("id")
          .in("department", options.departmentFilter);

        if (deptUsers && deptUsers.length > 0) {
          const deptUserIds = deptUsers.map((u) => u.id);
          deptUserIds.forEach(userId => {
            filterParts.push(`requestor_id.eq.${userId}`);
          });
        }
      }

      const picFilter = filterParts.join(',');
      
      query = query.or(picFilter);
    }
    // Admin role: Always see all requests (no filtering)
    // Admins have system-wide oversight and don't need department permissions

    // Add pagination if provided
    if (options.pagination) {
      const offset = (options.pagination.page - 1) * options.pagination.limit;
      query = query.range(offset, offset + options.pagination.limit - 1);
    }

    const { data, error, count } = await query;

    if (error) {
      console.error("❌ Error fetching requests:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Manually fetch executors data for all requests
    const requestIds = data?.map((r: any) => r.id) || [];
    const { data: allExecutors, error: executorsError } = await supabaseAdmin
      .from("request_executors")
      .select(`
        *,
        users!request_executors_user_id_fkey (
          id,
          full_name,
          email,
          role
        )
      `)
      .in("request_id", requestIds);


    // Group executors by request_id
    const executorsByRequest = new Map();
    if (allExecutors) {
      allExecutors.forEach((executor: any) => {
        const requestId = executor.request_id;
        if (!executorsByRequest.has(requestId)) {
          executorsByRequest.set(requestId, []);
        }
        executorsByRequest.get(requestId).push(executor);
      });
    }

    // Fetch focus data for all requests
    const { data: focusData, error: focusError } = await getTwoWeeksFocusRequests();
    const focusRequestIds = new Set(focusData?.map((f: any) => f.request_id) || []);

    // Ensure proper handling of requests with null application_id, add executors, and add focus status
    const processedData =
      data?.map((request: any) => ({
        ...request,
        application: request.application || null, // Ensure null instead of undefined
        executors: executorsByRequest.get(request.id) || [], // Add executors data
        isFocused: focusRequestIds.has(request.id), // Add focus status
      })) || [];
      

    // Get total count for pagination
    let totalCount = processedData.length;
    if (options.pagination) {
      // We need to get the total count separately when using pagination
      let countQuery = supabaseAdmin.from("requests").select("*", { count: "exact", head: true });

      // Apply same filters for count as the main query
      if (options.userRole === "Requestor" && options.userId) {
        countQuery = countQuery.eq("requestor_id", options.userId);
      } else if (options.userRole === "PIC" && options.userId) {
        // Include multi-executor assignments in count query as well
        const { data: multiExecutorRequests } = await supabaseAdmin
          .from("request_executors")
          .select("request_id")
          .eq("user_id", options.userId);
        
        const multiExecutorRequestIds = multiExecutorRequests?.map(re => re.request_id) || [];
        
        // Build filter conditions separately for better debugging and reliability (count query)
        const filterParts = [
          `current_pic_id.eq.${options.userId}`,
          `tech_lead_id.eq.${options.userId}`,
          `executor_id.eq.${options.userId}`
        ];
        
        // Add multi-executor request IDs as separate conditions
        if (multiExecutorRequestIds.length > 0) {
          multiExecutorRequestIds.forEach(requestId => {
            filterParts.push(`id.eq.${requestId}`);
          });
        }

        // If PIC has department permissions, also include requests from those departments
        if (options.departmentFilter && options.departmentFilter.length > 0) {
          const { data: deptUsers } = await supabaseAdmin
            .from("users")
            .select("id")
            .in("department", options.departmentFilter);

          if (deptUsers && deptUsers.length > 0) {
            const deptUserIds = deptUsers.map((u) => u.id);
            deptUserIds.forEach(userId => {
              filterParts.push(`requestor_id.eq.${userId}`);
            });
          }
        }

        const picFilter = filterParts.join(',');

        countQuery = countQuery.or(picFilter);
      }
      // Admin role: No filtering needed for count query

      const { count: totalRecords } = await countQuery;
      totalCount = totalRecords || 0;
    }

    if (options.pagination) {
      return {
        data: {
          data: processedData as RequestWithDetails[],
          totalCount,
          totalPages: Math.ceil(totalCount / options.pagination.limit),
          currentPage: options.pagination.page,
          pageSize: options.pagination.limit,
          hasNextPage: options.pagination.page < Math.ceil(totalCount / options.pagination.limit),
          hasPreviousPage: options.pagination.page > 1,
        },
        error: null,
      };
    } else {
      // Return all data without pagination (backward compatibility)
      return {
        data: {
          data: processedData as RequestWithDetails[],
          totalCount,
          totalPages: 1,
          currentPage: 1,
          pageSize: totalCount,
          hasNextPage: false,
          hasPreviousPage: false,
        },
        error: null,
      };
    }
  } catch (error) {
    console.error("Error in getRequests:", error);
    return { data: null, error: error as Error };
  }
}

// Get all requests in the system (no filtering) - used for analytics and admin functions
export async function getAllSystemRequests(): Promise<{ data: RequestWithDetails[] | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data
    if (!supabaseAdmin) {
      console.log("Using mock data for getAllSystemRequests");
      return { data: mockRequests, error: null };
    }

    // Use Supabase
    console.log("Using Supabase for getAllSystemRequests");
    const result = await supabaseAdmin
      .from("requests")
      .select(`
        *,
        application:applications(id, name, description, context, tech_lead_id),
        requestor:users!requests_requestor_id_fkey(id, email, full_name, role, department),
        current_pic:users!requests_current_pic_id_fkey(id, email, full_name, role, department),
        tech_lead:users!requests_tech_lead_id_fkey(id, email, full_name, role, department),
        executor:users!requests_executor_id_fkey(id, email, full_name, role, department),
        assigned_by_user:users!requests_assigned_by_fkey(id, email, full_name, role, department),
        comments:request_comments(id, comment, created_at, user_id, users(full_name)).order(created_at.desc),
        attachments:request_attachments(id, filename, file_path, file_size, created_at, uploaded_by, users(full_name)),
        executors:request_executors(
          id,
          user_id,
          assigned_at,
          assigned_by,
          task_status,
          completed_at,
          completed_by,
          notes,
          users!request_executors_user_id_fkey (
            id,
            full_name,
            email,
            role
          )
        )
      `)
      .order('created_at', { ascending: false });

    if (result.error) {
      console.error("❌ Supabase getAllSystemRequests error:", result.error);
      return { data: null, error: result.error };
    }

    return { data: (result.data as any) as RequestWithDetails[], error: null };
  } catch (error) {
    console.error("❌ getAllSystemRequests error:", error);
    return { data: null, error: error as Error };
  }
}

// Admin-specific functions for multi-admin support


export async function getRequestById(id: string): Promise<{ data: RequestWithDetails | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data
    if (!supabaseAdmin) {
      console.log("Using mock data for getRequestById:", id);
      const request = findMockRequestById(id);
      return { data: request || null, error: null };
    }

    // Use Supabase
    console.log("Using Supabase for getRequestById:", id);

    const { data, error } = await supabaseAdmin
      .from("requests")
      .select(
        `
        *,
        application:applications(*),
        requestor:users!requests_requestor_id_fkey(*),
        current_pic:users!requests_current_pic_id_fkey(*),
        tech_lead:users!requests_tech_lead_id_fkey(*),
        executor:users!requests_executor_id_fkey(*),
        assigned_by_user:users!requests_assigned_by_fkey(*),
        comments:request_comments(*, user:users(*)).order(created_at.desc),
        attachments:request_attachments(*),
        executors:request_executors(
          id,
          user_id,
          assigned_at,
          assigned_by,
          task_status,
          completed_at,
          completed_by,
          notes,
          users!request_executors_user_id_fkey (
            id,
            full_name,
            email,
            role
          )
        )
      `
      )
      .eq("id", id)
      .single();

    if (error) {
      console.error("Error fetching request:", error);
      return { data: null, error: new Error(error.message) };
    }

    // Ensure proper handling of request with null application_id
    if (data) {
      const processedData = {
        ...(data as any),
        application: (data as any).application || null, // Ensure null instead of undefined
      };
      return { data: processedData as unknown as RequestWithDetails, error: null };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error("Error in getRequestById:", error);
    return { data: null, error: error as Error };
  }
}

export async function getApplications(): Promise<{ data: Application[] | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data
    if (!supabaseAdmin) {
      console.log("Using mock data for getApplications");
      return { data: mockApplications, error: null };
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin.from("applications").select("*").order("name");

    if (error) {
      console.error("Error fetching applications:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as any) as Application[], error: null };
  } catch (error) {
    console.error("Error in getApplications:", error);
    return { data: null, error: error as Error };
  }
}

export async function getUsers(): Promise<{ data: UserRecord[] | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data
    if (!supabaseAdmin) {
      console.log("Using mock data for getUsers");
      return { data: mockUsers, error: null };
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin.from("users").select("*").order("full_name");

    if (error) {
      console.error("Error fetching users:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as any) as UserRecord[], error: null };
  } catch (error) {
    console.error("Error in getUsers:", error);
    return { data: null, error: error as Error };
  }
}

export async function getPICUsers(): Promise<{ data: UserRecord[] | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data
    if (!supabaseAdmin) {
      console.log("Using mock data for getPICUsers");
      return { data: getMockPICUsers(), error: null };
    }

    // Use Supabase - fetch both PIC and Admin users
    const { data, error } = await supabaseAdmin
      .from("users")
      .select("*")
      .in("role", ["PIC", "Admin"])
      .order("full_name");

    if (error) {
      console.error("Error fetching PIC users:", error);
      return { data: null, error: new Error(error.message) };
    }

    return { data: (data as any) as UserRecord[], error: null };
  } catch (error) {
    console.error("Error in getPICUsers:", error);
    return { data: null, error: error as Error };
  }
}

export async function createRequest(requestData: {
  request_type?: string;
  application_id?: string | null;
  proposed_application_name?: string | null;
  subject: string;
  description: string;
  priority: string;
  requested_deadline?: string;
  requestor_id: string;
  workflow_history?: any[];
  status?: string;
  tech_lead_id?: string | null;
  current_pic_id?: string | null;
}): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, use mock data with auto-assignment
    if (!supabaseAdmin) {
      console.log("Using mock data for createRequest with auto-assignment");

      let techLeadId = null;
      let status = "New";

      // Handle tech lead assignment based on request type
      if (requestData.request_type === "enhancement" && requestData.application_id) {
        // Enhancement requests with application_id: auto-assign tech lead
        const application = mockApplications.find((app) => app.id === requestData.application_id);
        techLeadId = application?.tech_lead_id || null;
        status = techLeadId ? "Initial Analysis" : "New";
      } else if (requestData.request_type === "new_application") {
        // New application requests: always start with "New" status, no auto-assignment
        status = "New";
        techLeadId = null;
      } else if (requestData.request_type === "hardware") {
        // Hardware requests: always start with "New" status, no auto-assignment
        status = "New";
        techLeadId = null;
      }

      return {
        data: {
          id: `mock-${Date.now()}`,
          ...requestData,
          request_type: (requestData.request_type as "enhancement" | "new_application" | "hardware") || "enhancement",
          status: (requestData.status as any) || status,
          tech_lead_id: requestData.tech_lead_id !== undefined ? requestData.tech_lead_id : techLeadId,
          current_pic_id: requestData.current_pic_id !== undefined ? requestData.current_pic_id : techLeadId,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          adjusted_deadline: null,
        } as any as Request,
        error: null,
      };
    }

    // Use Supabase with auto-assignment

    let techLeadId = requestData.tech_lead_id;
    let currentPicId = requestData.current_pic_id;
    let status = requestData.status || "New";

    // Handle tech lead assignment based on request type
    if (requestData.request_type === "enhancement" && requestData.application_id) {
      // Enhancement requests with application_id: auto-assign tech lead
      const { data: application, error: appError } = await supabaseAdmin
        .from("applications")
        .select("tech_lead_id")
        .eq("id", requestData.application_id)
        .single();

      if (appError) {
        console.error("Error fetching application for tech lead assignment:", appError);
        return { data: null, error: new Error(appError.message) };
      }

      // Auto-assign tech lead if not explicitly provided
      if (techLeadId === undefined) {
        techLeadId = application.tech_lead_id as string | null;
      }
      if (currentPicId === undefined) {
        currentPicId = application.tech_lead_id as string | null;
      }
      if (!requestData.status && application.tech_lead_id) {
        status = "Initial Analysis";
      }
    } else if (requestData.request_type === "new_application") {
      // New application requests: always start with "New" status, no auto-assignment
      if (!requestData.status) {
        status = "New";
      }
      // Don't auto-assign tech lead for new applications
      if (techLeadId === undefined) {
        techLeadId = null;
      }
      if (currentPicId === undefined) {
        currentPicId = null;
      }
    } else if (requestData.request_type === "hardware") {
      // Hardware requests: always start with "New" status, no auto-assignment
      if (!requestData.status) {
        status = "New";
      }
      // Don't auto-assign tech lead for hardware requests
      if (techLeadId === undefined) {
        techLeadId = null;
      }
      if (currentPicId === undefined) {
        currentPicId = null;
      }
    }

    // Prepare request data
    const enhancedRequestData = {
      ...requestData,
      request_type: requestData.request_type || "enhancement",
      tech_lead_id: techLeadId,
      current_pic_id: currentPicId,
      status: status,
      workflow_history: requestData.workflow_history || [],
    };

    // Insert the request
    const { data, error } = await supabaseAdmin.from("requests").insert([enhancedRequestData]).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in createRequest:", error);
    return { data: null, error: error as Error };
  }
}

// Helper function to determine current PIC based on status and request data
export function getCurrentPicForStatus(status: string, request: any): string | null {
  switch (status) {
    case "New":
    case "Initial Analysis":
      return request.tech_lead_id
    case "Pending Assignment":
      return null // No specific PIC during assignment phase
    case "In Progress":
    case "Rework":
      return request.executor_id
    case "Code Review":
      return request.tech_lead_id
    case "Pending UAT":
      return request.requestor_id
    case "Pending Deployment":
      return request.executor_id || request.tech_lead_id
    case "Pending Clarification":
      // For clarification, the PIC is explicitly set to who needs to respond
      // Return null here to allow explicit PIC assignment via currentPicId parameter
      return null
    case "Closed":
      return null
    default:
      return null
  }
}

export async function updateRequestStatus(requestId: string, status: string, currentPicId?: string, additionalFields?: {
  internal_deadline?: string;
  previous_status?: string;
  rejection_type?: string;
  rejection_reason?: string;
  clarification_requests?: any[];
  workflow_history?: any[];
  application_id?: string;
  tech_lead_id?: string;
  tech_lead_notes?: string;
}): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for updateRequestStatus");
      return { data: { id: requestId, status } as any, error: null };
    }

    // First get the current request to determine the appropriate current_pic_id
    const { data: currentRequest, error: requestError } = await getRequestById(requestId);
    if (requestError || !currentRequest) {
      return { data: null, error: new Error("Request not found") };
    }

    // Use Supabase
    const updateData: any = { status };

    // Auto-assign current_pic_id based on status if not explicitly provided
    if (currentPicId !== undefined) {
      updateData.current_pic_id = currentPicId;
    } else {
      const autoPicId = getCurrentPicForStatus(status, currentRequest);
      if (autoPicId) {
        updateData.current_pic_id = autoPicId;
      }
    }

    // Add additional fields if provided
    if (additionalFields) {
      if (additionalFields.internal_deadline !== undefined) {
        updateData.internal_deadline = additionalFields.internal_deadline;
      }
      if (additionalFields.previous_status !== undefined) {
        updateData.previous_status = additionalFields.previous_status;
      }
      if (additionalFields.rejection_type !== undefined) {
        updateData.rejection_type = additionalFields.rejection_type;
      }
      if (additionalFields.rejection_reason !== undefined) {
        updateData.rejection_reason = additionalFields.rejection_reason;
      }
      if (additionalFields.clarification_requests !== undefined) {
        updateData.clarification_requests = additionalFields.clarification_requests;
      }
      if (additionalFields.workflow_history !== undefined) {
        updateData.workflow_history = additionalFields.workflow_history;
      }
      if (additionalFields.application_id !== undefined) {
        updateData.application_id = additionalFields.application_id;
      }
      if (additionalFields.tech_lead_id !== undefined) {
        updateData.tech_lead_id = additionalFields.tech_lead_id;
      }
      if (additionalFields.tech_lead_notes !== undefined) {
        updateData.tech_lead_notes = additionalFields.tech_lead_notes;
      }
    }

    const { data, error } = await supabaseAdmin.from("requests").update(updateData).eq("id", requestId).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in updateRequestStatus:", error);
    return { data: null, error: error as Error };
  }
}

export async function assignUserToRequest(requestId: string, assignedUserId: string, assignedBy: string, role: "current_pic" | "tech_lead" | "executor", reason?: string): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for assignUserToRequest");
      return { data: { id: requestId, [`${role}_id`]: assignedUserId } as any, error: null };
    }

    // Get current request to update assignment history
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from("requests")
      .select("pic_assignment_history")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      console.error("Error fetching current request for assignment:", fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    // Update assignment history
    const currentHistory = Array.isArray(currentRequest.pic_assignment_history) ? currentRequest.pic_assignment_history : [];
    const newAssignment = {
      user_id: assignedUserId,
      assigned_by: assignedBy,
      role: role,
      assigned_at: new Date().toISOString(),
      unassigned_at: null,
      assignment_reason: reason || null,
    };

    const updatedHistory = [...currentHistory, newAssignment];

    // Update the request with new assignment
    const updateData: any = {
      [`${role}_id`]: assignedUserId,
      assigned_by: assignedBy,
      pic_assignment_history: updatedHistory,
    };

    // If assigning current_pic, also update current_pic_id
    if (role === "current_pic") {
      updateData.current_pic_id = assignedUserId;
    }

    const { data, error } = await supabaseAdmin.from("requests").update(updateData).eq("id", requestId).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in assignUserToRequest:", error);
    return { data: null, error: error as Error };
  }
}

export async function updateRequestWithRejection(requestId: string, newStatus: string, rejectionReason: string, rejectionType: "Minor Fix" | "Major Change" | "Requirements Issue", rejectedBy: string): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for updateRequestWithRejection");
      return { data: { id: requestId, status: newStatus } as any, error: null };
    }

    const updateData = {
      status: newStatus,
      rejection_reason: rejectionReason,
      rejection_type: rejectionType,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabaseAdmin.from("requests").update(updateData).eq("id", requestId).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in updateRequestWithRejection:", error);
    return { data: null, error: error as Error };
  }
}

export async function addClarificationRequest(requestId: string, requestedBy: string, requestedFrom: string, question: string): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for addClarificationRequest");
      return { data: { id: "mock-clarification", question } as any, error: null };
    }

    // Get current clarification requests
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from("requests")
      .select("clarification_requests")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      console.error("Error fetching current request for clarification:", fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    // Add new clarification request
    const currentRequests = Array.isArray(currentRequest.clarification_requests) ? currentRequest.clarification_requests : [];
    const newClarification = {
      id: `clarification-${Date.now()}`,
      requested_by: requestedBy,
      requested_from: requestedFrom,
      question: question,
      status: "pending" as const,
      created_at: new Date().toISOString(),
    };

    const updatedRequests = [...currentRequests, newClarification];

    // Update request status to "Pending Clarification"
    const { data, error } = await supabaseAdmin
      .from("requests")
      .update({
        status: "Pending Clarification",
        clarification_requests: updatedRequests,
      })
      .eq("id", requestId)
      .select()
      .single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in addClarificationRequest:", error);
    return { data: null, error: error as Error };
  }
}

export async function respondToClarificationRequest(requestId: string, clarificationId: string, response: string, respondedBy: string): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for respondToClarificationRequest");
      return { data: { id: clarificationId, response } as any, error: null };
    }

    // Get current clarification requests and workflow history
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from("requests")
      .select("clarification_requests, workflow_history")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      console.error("Error fetching current request for clarification response:", fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    // Update the specific clarification request
    const currentRequests = Array.isArray(currentRequest.clarification_requests) ? currentRequest.clarification_requests : [];
    const clarificationToUpdate = currentRequests.find((c: any) => c.id === clarificationId);

    if (!clarificationToUpdate) {
      return { data: null, error: new Error("Clarification request not found") };
    }

    const updatedRequests = currentRequests.map((clarification: any) =>
      clarification.id === clarificationId
        ? {
            ...clarification,
            response,
            status: "responded" as const,
            responded_at: new Date().toISOString(),
          }
        : clarification
    );

    // Get user who requested clarification for workflow history
    const requesterName = clarificationToUpdate.requested_by || "Unknown";

    // Update the request with updated clarifications and workflow history
    const { data, error } = await supabaseAdmin
      .from("requests")
      .update({
        clarification_requests: updatedRequests,
        workflow_history: [
          ...(Array.isArray(currentRequest.workflow_history) ? currentRequest.workflow_history : []),
          {
            id: `history-${Date.now()}`,
            timestamp: new Date().toISOString(),
            user_id: respondedBy,
            user_name: "User", // This will be overridden in the action with actual user name
            action: "clarification_response",
            from_status: "Pending Clarification",
            to_status: "Pending Clarification",
            comment: `Responded to clarification request`,
          },
        ],
      })
      .eq("id", requestId)
      .select()
      .single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in respondToClarificationRequest:", error);
    return { data: null, error: error as Error };
  }
}

export async function deleteClarificationRequest(requestId: string, clarificationId: string, deletedBy: string): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for deleteClarificationRequest");
      return { data: { id: clarificationId } as any, error: null };
    }

    // Get current clarification requests and workflow history
    const { data: currentRequest, error: fetchError } = await supabaseAdmin
      .from("requests")
      .select("clarification_requests, workflow_history, status, previous_status")
      .eq("id", requestId)
      .single();

    if (fetchError) {
      console.error("Error fetching current request for clarification deletion:", fetchError);
      return { data: null, error: new Error(fetchError.message) };
    }

    // Remove the specific clarification request
    const currentRequests = Array.isArray(currentRequest.clarification_requests) ? currentRequest.clarification_requests : [];
    const clarificationToDelete = currentRequests.find((c: any) => c.id === clarificationId);

    if (!clarificationToDelete) {
      return { data: null, error: new Error("Clarification request not found") };
    }

    const updatedRequests = currentRequests.filter((clarification: any) => clarification.id !== clarificationId);

    // Check if this was the last pending clarification
    const remainingPendingClarifications = updatedRequests.filter((c: any) => c.status === "pending");
    let statusUpdate: any = {
      clarification_requests: updatedRequests,
      workflow_history: [
        ...(Array.isArray(currentRequest.workflow_history) ? currentRequest.workflow_history : []),
        {
          id: `history-${Date.now()}`,
          timestamp: new Date().toISOString(),
          user_id: deletedBy,
          user_name: "User", // This will be overridden in the action with actual user name
          action: "clarification_deleted",
          from_status: currentRequest.status,
          to_status: currentRequest.status,
          comment: `Deleted clarification request`,
        },
      ],
    };

    // If no pending clarifications remain and we're in "Pending Clarification" status, restore previous status
    if (remainingPendingClarifications.length === 0 && currentRequest.status === "Pending Clarification" && currentRequest.previous_status) {
      statusUpdate.status = currentRequest.previous_status;
      statusUpdate.previous_status = null;
      statusUpdate.workflow_history[statusUpdate.workflow_history.length - 1].to_status = currentRequest.previous_status;
      statusUpdate.workflow_history[statusUpdate.workflow_history.length - 1].comment = `Deleted clarification request and restored status to ${currentRequest.previous_status}`;
    }

    // Update the request
    const { data, error } = await supabaseAdmin
      .from("requests")
      .update(statusUpdate)
      .eq("id", requestId)
      .select()
      .single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in deleteClarificationRequest:", error);
    return { data: null, error: error as Error };
  }
}

export async function updateRequestDetails(requestId: string, requestData: {
  subject?: string;
  description?: string;
  priority?: string;
  application_id?: string;
  requested_deadline?: string;
  executor_id?: string;
  tech_lead_id?: string;
  tech_lead_notes?: string;
  status?: string;
  adjusted_deadline?: string;
  workflow_history?: any[];
  ai_analysis_status?: string;
}): Promise<{ data: Request | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for updateRequestDetails");
      return { data: { id: requestId, ...requestData } as any, error: null };
    }

    // Get current request if status is being updated
    let updateData: any = { ...requestData };
    if (requestData.status) {
      const { data: currentRequest, error: requestError } = await getRequestById(requestId);
      if (currentRequest) {
        const autoPicId = getCurrentPicForStatus(requestData.status, currentRequest);
        if (autoPicId && !updateData.current_pic_id) {
          updateData.current_pic_id = autoPicId;
        }
      }
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin.from("requests").update(updateData).eq("id", requestId).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in updateRequestDetails:", error);
    return { data: null, error: error as Error };
  }
}

export async function deleteRequest(requestId: string): Promise<{ error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for deleteRequest (soft delete)");
      return { error: null };
    }

    // Use Supabase - soft delete by updating status
    const { error } = await supabaseAdmin.from("requests").update({ status: "Closed" }).eq("id", requestId);

    return { error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in deleteRequest:", error);
    return { error: error as Error };
  }
}

export async function trueDeleteRequest(requestId: string): Promise<{ error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for trueDeleteRequest (hard delete)");
      return { error: null };
    }

    // Step 1: Delete notifications first (explicit deletion to avoid RLS issues with CASCADE)
    const { error: notificationError } = await supabaseAdmin
      .from("notifications")
      .delete()
      .eq("request_id", requestId);

    if (notificationError) {
      console.error("Error deleting notifications:", notificationError);
      return { error: new Error(`Failed to delete notifications: ${notificationError.message}`) };
    }

    // Step 2: Delete the request (other cascades will work normally)
    const { error: requestError } = await supabaseAdmin
      .from("requests")
      .delete()
      .eq("id", requestId);

    if (requestError) {
      console.error("Error deleting request:", requestError);
      return { error: new Error(`Failed to delete request: ${requestError.message}`) };
    }

    console.log(`Successfully deleted request ${requestId} and related notifications`);
    return { error: null };
  } catch (error) {
    console.error("Error in trueDeleteRequest:", error);
    return { error: error as Error };
  }
}



export async function addComment(requestId: string, comment: string, userId: string): Promise<{ data: RequestComment | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for addComment");
      return {
        data: {
          id: `comment-${Date.now()}`,
          request_id: requestId,
          user_id: userId,
          comment,
          created_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin
      .from("request_comments")
      .insert([
        {
          request_id: requestId,
          user_id: userId,
          comment,
        },
      ])
      .select()
      .single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in addComment:", error);
    return { data: null, error: error as Error };
  }
}

export function getAttachmentUrl(filePath: string): string {
  // If the filePath is already a full URL (starts with http), return it directly
  if (filePath.startsWith('http')) {
    return filePath
  }
  
  // If no Supabase client, return a mock URL
  if (!supabaseAdmin) {
    // Handle mock data file paths (mock/filename) and uploaded file paths
    if (filePath.startsWith('mock/')) {
      return `/api/mock-attachment/${encodeURIComponent(filePath)}`
    } else {
      // For uploaded files in mock mode, use mock-files endpoint
      return `/api/mock-files/${encodeURIComponent(filePath)}`
    }
  }

  try {
    // First try to get public URL (works if bucket is public)
    const { data } = supabaseAdmin.storage
      .from("request-attachments")
      .getPublicUrl(filePath)
    
    return data.publicUrl
  } catch (error) {
    console.error("Error getting attachment URL:", error)
    // Return a fallback URL instead of "#" for better error handling
    return `/api/mock-files/${encodeURIComponent(filePath)}`
  }
}

// Remove the duplicate uploadAttachment function and keep the correct one
export async function uploadAttachment(file: File, requestId: string, userId: string): Promise<{ data: RequestAttachment | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for uploadAttachment");
      return {
        data: {
          id: `attachment-${Date.now()}`,
          request_id: requestId,
          filename: file.name,
          file_path: `mock/${file.name}`,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: userId,
          created_at: new Date().toISOString(),
        },
        error: null,
      };
    }

    // Use Supabase
    const fileExt = file.name.split(".").pop();
    const fileName = `${requestId}/${Date.now()}.${fileExt}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin.storage.from("request-attachments").upload(fileName, file);

    if (uploadError) {
      return { data: null, error: new Error(uploadError.message) };
    }

    // Save attachment record to database
    const { data, error } = await supabaseAdmin
      .from("request_attachments")
      .insert([
        {
          request_id: requestId,
          filename: file.name,
          file_path: uploadData.path,
          file_size: file.size,
          content_type: file.type,
          uploaded_by: userId,
        },
      ])
      .select()
      .single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in uploadAttachment:", error);
    return { data: null, error: error as Error };
  }
}

export async function createApplication(applicationData: {
  name: string;
  tech_lead_id: string;
  description?: string;
  context?: string;
}): Promise<{ data: Application | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for createApplication");
      return {
        data: {
          id: `app-${Date.now()}`,
          ...applicationData,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        } as any,
        error: null,
      };
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin.from("applications").insert([applicationData]).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in createApplication:", error);
    return { data: null, error: error as Error };
  }
}

export async function updateApplication(id: string, applicationData: {
  name?: string;
  tech_lead_id?: string;
  description?: string;
  context?: string;
}): Promise<{ data: Application | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for updateApplication");
      return { data: { id, ...applicationData } as any, error: null };
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin.from("applications").update(applicationData).eq("id", id).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in updateApplication:", error);
    return { data: null, error: error as Error };
  }
}

export async function deleteApplication(id: string): Promise<{ error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for deleteApplication");
      return { error: null };
    }

    // Use Supabase
    const { error } = await supabaseAdmin.from("applications").delete().eq("id", id);

    return { error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in deleteApplication:", error);
    return { error: error as Error };
  }
}

export async function updateUserRole(userId: string, role: string): Promise<{ data: UserRecord | null; error: Error | null }> {
  try {
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for updateUserRole");
      return { data: { id: userId, role } as any, error: null };
    }

    // Use Supabase
    const { data, error } = await supabaseAdmin.from("users").update({ role }).eq("id", userId).select().single();

    return { data: data as any, error: error ? new Error(error.message) : null };
  } catch (error) {
    console.error("Error in updateUserRole:", error);
    return { data: null, error: error as Error };
  }
}



// Analytics functions
export interface DashboardAnalytics {
  myOpenRequests: number
  totalOpenRequests: number
  requestsByStatus: Array<{ status: string; count: number }>
  requestsByPriority: Array<{ priority: string; count: number }>
  requestsByApplication?: Array<{ application: string; count: number }>
  averageResolutionTime?: number
  overdueRequests?: number
  requestsTrend?: Array<{ date: string; count: number }>
}

// Employee Performance Analytics Interfaces
// Advanced workflow efficiency interfaces
export interface WorkflowEfficiencyMetrics {
  stageSpecificCycleTimes: {
    analysisTime: number    // Initial Analysis → Complete (in hours)
    developmentTime: number // In Progress → Code Review (in hours)
    qaTime: number         // Code Review → UAT (in hours)
    uatTime: number        // Pending UAT → Deployment (in hours)
  }
  queueTimes: {
    picAssignmentQueue: number // New → Assigned (in hours)
    devQueue: number          // Analysis → In Progress (in hours)
    qaQueue: number           // Code Review → Pending UAT (in hours)
  }
  teamVelocity: number // Complexity-weighted completed tasks per month
  cycleTimeEfficiency: number // Active time / (Active time + Queue time) %
}

export interface AdvancedQualityMetrics {
  workflowRegressionRate: number // % backward movements in workflow
  firstTimePassRate: number     // % passing QA/UAT first try
  reworkFrequency: number       // Average rework cycles per request
  qualityGateSuccess: {
    codeReview: number // % passing code review first time
    uat: number        // % passing UAT first time
    deployment: number // % successful deployments
  }
}

export interface AIIntegrationMetrics {
  adoptionRate: number           // % tasks using AI analysis
  estimationAccuracy: number    // AI estimate vs actual time correlation (0-1)
  analysisCompleteness: number   // % AI analyses with complete data
  techLeadSatisfaction: number   // Based on tech lead usage patterns
}

export interface CurrentTaskStatus {
  inProgressTasks: Array<{
    requestId: string
    subject: string
    priority: string
    complexityPoints: number
    daysOngoing: number
    stage: string
  }>
  blockedTasks: Array<{
    requestId: string
    subject: string
    blockingReason: 'clarification_pending' | 'dependency_waiting' | 'external_dependency' | 'resource_unavailable'
    blockedSince: number // days
    details: string
  }>
  availableForAssignment: boolean
  totalActiveComplexityPoints: number
}

export interface PerformanceTrend {
  direction: 'improving' | 'declining' | 'stable'
  changePercentage: number
  previousPeriodScore: number
  currentPeriodScore: number
  trendIcon: '▲' | '▼' | '═'
}

export interface PerformanceScoreBreakdown {
  workflowEfficiency: { score: number; weight: 40 }
  quality: { score: number; weight: 35 }
  velocity: { score: number; weight: 25 }
  totalScore: number
  formula: string
}

// =============================================================================
// REQUESTOR-SPECIFIC PERFORMANCE INTERFACES
// =============================================================================

export interface RequestorQualityMetrics {
  clarificationRequestRate: number // % requests needing clarification
  requirementCompletenessScore: number // 0-100 based on initial detail quality
  reworkDueToRequirements: number // % rework caused by unclear requirements
  avgRequestDetailLength: number // average description length (indicator of thoroughness)
  attachmentFrequency: number // % requests with supporting documents
}

export interface RequestorUATMetrics {
  avgUATResponseTime: number // hours to respond during UAT
  uatApprovalRate: number // % requests approved without sending back
  feedbackQuality: number // 0-100 based on feedback completeness
  uatEngagement: number // % UAT phases where requestor actively participated
  changeDuringUAT: number // % requests changed significantly during UAT
}

export interface RequestorBusinessMetrics {
  requestFrequency: number // requests per month
  priorityDistribution: {
    critical: number
    high: number
    medium: number
    low: number
  }
  deadlineAdherence: number // % requests with realistic deadlines met
  businessImpactScore: number // 0-100 based on request complexity and priority
  departmentCollaboration: number // requests involving multiple departments
}

export interface RequestorPerformanceMetrics {
  // Basic requestor info
  userId: string
  userName: string
  userRole: string
  department: string
  
  // Request volume and patterns
  totalRequests: number
  activeRequests: number
  completedRequests: number
  
  // Quality metrics
  qualityMetrics: RequestorQualityMetrics
  
  // UAT performance
  uatMetrics: RequestorUATMetrics
  
  // Business metrics
  businessMetrics: RequestorBusinessMetrics
  
  // Overall performance
  businessImpactScore: number // composite score 0-100
  businessScoreBreakdown: {
    requestQuality: { score: number; weight: 40 }
    uatPerformance: { score: number; weight: 35 }
    businessValue: { score: number; weight: 25 }
    totalScore: number
    formula: string
  }
  
  // Trends and ranking
  performanceTrend: PerformanceTrend
  departmentRank: number
  overallRank: number
}

// PIC-specific performance metrics (developers)
// Simple PIC Workload Interface (current + pending work)
export interface PICInvolvementMetrics {
  userId: string
  userName: string
  userRole: string
  department: string
  totalAssigned: number      // Total requests assigned to person
  activeWork: number         // Currently working (In Progress, Code Review, etc.)
  pendingWork: number        // Assigned but waiting (Pending UAT, New, etc.)
  finishedWork: number       // Completed/Closed requests
  assignedRequests: Array<{
    requestId: string
    subject: string
    status: string
    priority: string
    workCategory: 'Active' | 'Pending' | 'Finished'
    roleType: 'Tech Lead' | 'Executor'
    teamSize?: number        // For multi-executor requests
    deadline?: string        // ISO date string for deadline (requested or adjusted)
    isOverdue?: boolean      // Whether the request is overdue
    daysCount?: number       // Days since creation (positive) or days overdue (negative)
    daysUntilOverdue?: number | null  // Days until overdue (null if already overdue or no deadline)
    isFocused?: boolean      // Whether this request is marked as focus for today
  }>
}

// Request Summary metrics for management dashboard
export interface RequestSummaryMetrics {
  weekFilter: string // ISO date string for week start
  isAllTime: boolean // Whether this is all-time data
  totalIncoming: number
  previousWeekIncoming?: number // For comparison
  weekOverWeekChange?: number // Percentage change from previous week
  statusBreakdown: {
    ongoing: number    // In Progress, Code Review, Rework, etc.
    finished: number   // Closed
    rejected: number   // Rejected
    pending: number    // New, Initial Analysis, Pending Assignment, etc.
  }
  previousWeekStatusBreakdown?: {
    ongoing: number
    finished: number
    rejected: number
    pending: number
  }
  completionRate: number // Percentage of requests that are finished
  averageTimeToComplete?: number // Days from creation to closure
  requestorBreakdown: Array<{
    requestorId: string
    requestorName: string
    department: string
    requestCount: number
    percentageOfTotal: number
  }>
  applicationBreakdown: Array<{
    applicationId: string | null
    applicationName: string
    requestCount: number
    percentageOfTotal: number
  }>
  requestTypeBreakdown: {
    enhancement: number
    new_application: number
    hardware: number
  }
  availableWeeks: Array<{
    weekStart: string
    weekLabel: string
    requestCount: number
  }>
}

export interface EmployeePerformanceMetrics {
  // Basic employee info
  userId: string
  userName: string
  userRole: string
  department: string
  
  // Core metrics (enhanced)
  totalRequests: number
  completedRequests: number
  inProgressRequests: number
  
  // Raw request data for multi-executor analysis
  userRequests?: any[] // All requests this user is involved in
  
  // Legacy metrics (kept for compatibility)
  averageCompletionTime: number // in days
  completionRate: number // percentage
  overdueCount: number
  reworkRate: number // percentage of requests that went to rework
  uatRejectionRate: number // percentage rejected in UAT
  commentFrequency: number // comments per request
  avgStageTime: {
    initialAnalysis: number
    inProgress: number
    codeReview: number
    uat: number
  }
  
  // Advanced workflow efficiency metrics
  workflowEfficiency: WorkflowEfficiencyMetrics
  
  // Quality & process integrity metrics  
  qualityMetrics: AdvancedQualityMetrics
  
  // AI integration metrics (for Tech Leads)
  aiMetrics: AIIntegrationMetrics | null
  
  // Current status and workload
  currentTaskStatus: CurrentTaskStatus
  
  // Performance tracking
  performanceScore: number // composite score 0-100
  performanceScoreBreakdown: PerformanceScoreBreakdown
  performanceTrend: PerformanceTrend
  
  // Ranking
  departmentRank: number
  overallRank: number
}

export interface DepartmentPerformanceMetrics {
  department: string
  totalEmployees: number
  totalRequests: number
  avgCompletionTime: number
  completionRate: number
  overdueCount: number
  performanceScore: number
  topPerformers: Array<{ userId: string; userName: string; score: number }>
  requestDistribution: Array<{ userId: string; userName: string; count: number }>
}

export interface SystemPerformanceOverview {
  totalActiveEmployees: number
  totalRequests: number
  avgSystemCompletionTime: number
  systemHealthScore: number // 0-100
  criticalAlerts: number
  topBottlenecks: Array<{ stage: string; avgTime: number; count: number }>
  departmentComparison: Array<{ department: string; score: number; requests: number }>
  timeFilters: {
    week: PerformanceSummary
    month: PerformanceSummary
    quarter: PerformanceSummary
    ytd: PerformanceSummary
  }
}

export interface PerformanceSummary {
  totalRequests: number
  completedRequests: number
  avgCompletionTime: number
  completionRate: number
  overdueCount: number
}

export interface QualityMetrics {
  totalReworks: number
  reworkRate: number
  avgReworkCycles: number
  uatRejections: number
  uatRejectionRate: number
  codeReviewCycles: number
  avgCodeReviewTime: number
  clarificationRequests: number
  clarificationRate: number
  topReworkReasons: Array<{ reason: string; count: number }>
}

export async function getDashboardAnalytics(
  userId: string, 
  userRole: string, 
  timeFilter: 'week' | 'month' | 'ytd' | 'all' = 'all'
): Promise<DashboardAnalytics> {
  try {
    // Get all requests based on role
    const requestsResult = await getRequests({ userId, userRole })
    const requests = requestsResult.data
    
    // Calculate date range based on filter
    const now = new Date()
    let startDate = new Date(0) // Default to all time
    
    switch (timeFilter) {
      case 'week':
        startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        break
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1)
        break
      case 'ytd':
        startDate = new Date(now.getFullYear(), 0, 1)
        break
    }
    
    // Filter requests by time
    const requestsArray = Array.isArray(requests) ? requests : (requests?.data || [])
    const filteredRequests = requestsArray.filter(r => 
      new Date(r.created_at) >= startDate
    )
    
    // Calculate metrics
    const openStatuses = ['New', 'Initial Analysis', 'Pending Assignment', 'In Progress', 
                         'Pending Clarification', 'Code Review', 'Rework', 'Pending UAT', 'Pending Deployment']
    
    const myOpenRequests = filteredRequests.filter(r => 
      r.requestor_id === userId && openStatuses.includes(r.status)
    ).length
    
    const totalOpenRequests = filteredRequests.filter(r => 
      openStatuses.includes(r.status)
    ).length
    
    // Group by status
    const statusCounts = filteredRequests.reduce((acc, req) => {
      acc[req.status] = (acc[req.status] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const requestsByStatus = Object.entries(statusCounts).map(([status, count]) => ({
      status,
      count: count as number
    }))
    
    // Group by priority
    const priorityCounts = filteredRequests.reduce((acc, req) => {
      acc[req.priority] = (acc[req.priority] || 0) + 1
      return acc
    }, {} as Record<string, number>)
    
    const requestsByPriority = ['Low', 'Medium', 'High', 'Critical'].map(priority => ({
      priority,
      count: priorityCounts[priority] || 0
    }))
    
    // Additional metrics for admin
    let additionalMetrics: Partial<DashboardAnalytics> = {}
    
    if (userRole === 'Admin') {
      // Group by application (handle requests with null application_id)
      const appCounts = filteredRequests.reduce((acc, req) => {
        const appName = req.application?.name || (req.request_type === 'new_application' ? req.proposed_application_name || 'New Application' : 'Unknown Application')
        acc[appName] = (acc[appName] || 0) + 1
        return acc
      }, {} as Record<string, number>)
      
      additionalMetrics.requestsByApplication = Object.entries(appCounts)
        .map(([application, count]) => ({ application, count: count as number }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10) // Top 10 applications
      
      // Calculate overdue requests (use same logic as management dashboard)
      additionalMetrics.overdueRequests = filteredRequests.filter(r => {
        const deadline = r.adjusted_deadline || r.internal_deadline || r.requested_deadline
        if (!deadline) return false
        const deadlineDate = new Date(deadline)
        deadlineDate.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
        return deadlineDate < now && !['Closed', 'Rejected'].includes(r.status)
      }).length
      
      // Calculate average resolution time for closed requests
      const closedRequests = filteredRequests.filter(r => ['Closed', 'Rejected'].includes(r.status))
      if (closedRequests.length > 0) {
        const totalTime = closedRequests.reduce((sum, req) => {
          const created = new Date(req.created_at).getTime()
          const closed = new Date(req.updated_at).getTime()
          return sum + (closed - created)
        }, 0)
        additionalMetrics.averageResolutionTime = Math.round(totalTime / closedRequests.length / (1000 * 60 * 60 * 24)) // in days
      }
      
      // Generate trend data for the last 7 days
      const trendData: Array<{ date: string; count: number }> = []
      for (let i = 6; i >= 0; i--) {
        const date = new Date(now.getTime() - i * 24 * 60 * 60 * 1000)
        const dateStr = date.toISOString().split('T')[0]
        const requestsArray2 = Array.isArray(requestsResult.data) ? requestsResult.data : (requestsResult.data?.data || [])
        const count = requestsArray2.filter(r => 
          r.created_at.startsWith(dateStr)
        ).length
        trendData.push({ date: dateStr, count })
      }
      additionalMetrics.requestsTrend = trendData
    }
    
    return {
      myOpenRequests,
      totalOpenRequests,
      requestsByStatus,
      requestsByPriority,
      ...additionalMetrics
    }
  } catch (error) {
    console.error('Error in getDashboardAnalytics:', error)
    return {
      myOpenRequests: 0,
      totalOpenRequests: 0,
      requestsByStatus: [],
      requestsByPriority: []
    }
  }
}

// =============================================================================
// WORKFLOW ANALYSIS UTILITY FUNCTIONS
// =============================================================================

// Debug logging configuration - set to false in production
const ENABLE_WORKFLOW_DEBUG = process.env.NODE_ENV === 'development'

function debugLog(message: string, ...args: any[]) {
  if (ENABLE_WORKFLOW_DEBUG) {
    console.log(message, ...args)
  }
}

function debugWarn(message: string, ...args: any[]) {
  if (ENABLE_WORKFLOW_DEBUG) {
    console.warn(message, ...args)
  }
}

function debugError(message: string, ...args: any[]) {
  // Always log errors regardless of debug mode
  console.error(message, ...args)
}

interface WorkflowHistoryEntry {
  id: string
  timestamp: string
  user_id: string
  user_name: string
  action: "comment" | "clarification" | "status_change" | "assignment" | "approval" | "rejection" | "rework" | 
          "deadline_override" | "deadline_set" | "executors_assigned" | "executor_assignments_edited" |
          "clarification_response" | "executor_task_completed" | "single_executor_completed"
  from_status?: string
  to_status?: string
  reason?: string
  comment?: string
  notes?: string
}

/**
 * Validates and sanitizes a workflow history entry
 */
function validateWorkflowEntry(entry: any): WorkflowHistoryEntry | null {
  try {
    // Check if entry is an object and has required properties
    if (!entry || typeof entry !== 'object') {
      // Reduce noise - only log unique issues
      if (Math.random() < 0.01) { // 1% sample rate
        debugWarn('🔍 WORKFLOW DEBUG: Invalid entry - not an object (sampled):', entry)
      }
      return null
    }

    const { id, timestamp, user_id, user_name, action } = entry
    
    // Validate essential fields (id, timestamp, action are required)
    if (!timestamp || !action) {
      // Reduce noise for common missing field combinations
      if (Math.random() < 0.05) { // 5% sample rate for missing fields
        debugWarn('🔍 WORKFLOW DEBUG: Missing essential fields (sampled):', { timestamp, action })
      }
      return null
    }

    // Validate timestamp is parseable
    const parsedDate = new Date(timestamp)
    if (isNaN(parsedDate.getTime())) {
      debugWarn('🔍 WORKFLOW DEBUG: Invalid timestamp:', timestamp)
      return null
    }

    // Expanded valid actions to include all current system actions
    const validActions = [
      'comment', 'clarification', 'status_change', 'assignment', 'approval', 'rejection', 'rework',
      'deadline_override', 'deadline_set', 'executors_assigned', 'executor_assignments_edited',
      'clarification_response', 'executor_task_completed', 'single_executor_completed'
    ]
    
    if (!validActions.includes(action)) {
      // Only log unique action types once to avoid spam
      if (!validateWorkflowEntry.loggedActions) {
        validateWorkflowEntry.loggedActions = new Set()
      }
      if (!validateWorkflowEntry.loggedActions.has(action)) {
        debugWarn('🔍 WORKFLOW DEBUG: New invalid action type discovered:', action)
        validateWorkflowEntry.loggedActions.add(action)
      }
      return null
    }

    // Handle system-generated entries (may not have user context)
    const systemActions = ['deadline_set', 'deadline_override', 'executors_assigned', 'executor_assignments_edited', 'executor_task_completed']
    const isSystemAction = systemActions.includes(action)
    
    // For system actions, provide fallback values for missing user fields
    const finalUserId = user_id || (isSystemAction ? 'system' : null)
    const finalUserName = user_name || (isSystemAction ? 'System' : null)
    const finalId = id || `${timestamp}-${action}-${Math.random().toString(36).substr(2, 9)}`
    
    // Skip entries that are missing critical user fields for non-system actions
    if (!isSystemAction && (!finalUserId || !finalUserName)) {
      return null
    }

    return {
      id: String(finalId),
      timestamp: String(timestamp),
      user_id: String(finalUserId),
      user_name: String(finalUserName),
      action: action as WorkflowHistoryEntry['action'],
      from_status: entry.from_status ? String(entry.from_status) : undefined,
      to_status: entry.to_status ? String(entry.to_status) : undefined,
      reason: entry.reason ? String(entry.reason) : undefined,
      comment: entry.comment ? String(entry.comment) : undefined,
      notes: entry.notes ? String(entry.notes) : undefined
    }
  } catch (error) {
    debugError('🔍 WORKFLOW DEBUG: Error validating entry:', error, entry)
    return null
  }
}

// Add static property to track logged actions
validateWorkflowEntry.loggedActions = new Set()

/**
 * Safely extracts and validates workflow history from a request
 */
function getSafeWorkflowHistory(request: RequestWithDetails): WorkflowHistoryEntry[] {
  try {
    const rawHistory = request.workflow_history
    
    // Handle null/undefined
    if (!rawHistory) {
      debugLog('🔍 WORKFLOW DEBUG: No workflow history found for request', request.id)
      return []
    }

    // Handle non-array values
    if (!Array.isArray(rawHistory)) {
      debugWarn('🔍 WORKFLOW DEBUG: workflow_history is not an array for request', request.id, typeof rawHistory)
      return []
    }

    // Validate and filter entries
    const validEntries = rawHistory
      .map(validateWorkflowEntry)
      .filter((entry): entry is WorkflowHistoryEntry => entry !== null)

    debugLog(`🔍 WORKFLOW DEBUG: Processed ${rawHistory.length} entries, ${validEntries.length} valid for request`, request.id)
    
    return validEntries
  } catch (error) {
    debugError('🔍 WORKFLOW DEBUG: Error processing workflow history for request', request.id, error)
    return []
  }
}

/**
 * Analyzes workflow_history JSONB to calculate stage-specific cycle times
 */
export function analyzeWorkflowEfficiency(request: RequestWithDetails): WorkflowEfficiencyMetrics {
  const workflowHistory = getSafeWorkflowHistory(request)
  
  const stageTransitions = {
    analysisTime: calculateStageTime(workflowHistory, 'Initial Analysis', ['Pending Assignment', 'In Progress']),
    developmentTime: calculateStageTime(workflowHistory, 'In Progress', ['Code Review', 'Rework']),
    qaTime: calculateStageTime(workflowHistory, 'Code Review', ['Pending UAT', 'Rework']),
    uatTime: calculateStageTime(workflowHistory, 'Pending UAT', ['Pending Deployment', 'Rework'])
  }
  
  const queueTransitions = {
    picAssignmentQueue: calculateStageTime(workflowHistory, 'New', ['Initial Analysis']),
    devQueue: calculateStageTime(workflowHistory, 'Pending Assignment', ['In Progress']),
    qaQueue: calculateStageTime(workflowHistory, 'Code Review', ['Pending UAT'])
  }
  
  // Calculate team velocity based on complexity
  const complexityPoints = getRequestComplexityPoints(request)
  const isCompleted = ['Closed', 'Rejected'].includes(request.status)
  
  const totalActiveTime = Object.values(stageTransitions).reduce((sum, time) => sum + time, 0)
  const totalQueueTime = Object.values(queueTransitions).reduce((sum, time) => sum + time, 0)
  
  // Calculate cycle time efficiency with safeguards
  let cycleTimeEfficiency = 0
  if (totalActiveTime + totalQueueTime > 0) {
    cycleTimeEfficiency = (totalActiveTime / (totalActiveTime + totalQueueTime)) * 100
  } else if (isCompleted) {
    // If a request is completed but has no workflow history, assume reasonable efficiency
    cycleTimeEfficiency = 75
  } else {
    // For incomplete requests with no workflow history, default to 50%
    cycleTimeEfficiency = 50
  }

  return {
    stageSpecificCycleTimes: stageTransitions,
    queueTimes: queueTransitions,
    teamVelocity: complexityPoints, // Always include complexity points, regardless of completion status
    cycleTimeEfficiency
  }
}

/**
 * Calculates time spent in a specific workflow stage
 */
function calculateStageTime(
  workflowHistory: WorkflowHistoryEntry[], 
  fromStatus: string, 
  toStatuses: string[]
): number {
  try {
    // Find when entering the stage (to_status matches fromStatus)
    const enterStageEntry = workflowHistory.find(entry => 
      entry.action === 'status_change' && entry.to_status === fromStatus
    )
    if (!enterStageEntry) {
      debugLog(`🔍 STAGE TIME DEBUG: No entry found for entering stage '${fromStatus}'`)
      return 0
    }
    
    // Validate enter stage timestamp
    const enterTime = new Date(enterStageEntry.timestamp)
    if (isNaN(enterTime.getTime())) {
      debugWarn(`🔍 STAGE TIME DEBUG: Invalid enter timestamp for stage '${fromStatus}':`, enterStageEntry.timestamp)
      return 0
    }
    
    // Find when exiting the stage (from_status matches fromStatus and to_status is in toStatuses)
    const exitStageEntry = workflowHistory.find(entry => {
      if (entry.action !== 'status_change' || entry.from_status !== fromStatus || !entry.to_status) {
        return false
      }
      
      if (!toStatuses.includes(entry.to_status)) {
        return false
      }
      
      // Safely parse and compare timestamps
      try {
        const exitTime = new Date(entry.timestamp)
        return !isNaN(exitTime.getTime()) && exitTime > enterTime
      } catch (error) {
        debugWarn(`🔍 STAGE TIME DEBUG: Error parsing exit timestamp:`, entry.timestamp)
        return false
      }
    })
    
    if (!exitStageEntry) {
      // Still in this stage - calculate time until now
      const now = new Date()
      const durationHours = (now.getTime() - enterTime.getTime()) / (1000 * 60 * 60)
      debugLog(`🔍 STAGE TIME DEBUG: Still in stage '${fromStatus}', duration: ${durationHours.toFixed(1)}h`)
      return Math.max(0, durationHours) // Ensure non-negative
    }
    
    // Validate exit stage timestamp
    const exitTime = new Date(exitStageEntry.timestamp)
    if (isNaN(exitTime.getTime())) {
      debugWarn(`🔍 STAGE TIME DEBUG: Invalid exit timestamp for stage '${fromStatus}':`, exitStageEntry.timestamp)
      return 0
    }
    
    const durationHours = (exitTime.getTime() - enterTime.getTime()) / (1000 * 60 * 60)
    debugLog(`🔍 STAGE TIME DEBUG: Stage '${fromStatus}' completed in ${durationHours.toFixed(1)}h`)
    return Math.max(0, durationHours) // Ensure non-negative
    
  } catch (error) {
    debugError(`🔍 STAGE TIME DEBUG: Error calculating stage time for '${fromStatus}':`, error)
    return 0
  }
}

/**
 * Analyzes quality metrics from workflow history
 */
export function analyzeQualityMetrics(requests: RequestWithDetails[]): AdvancedQualityMetrics {
  let totalRegressions = 0
  let totalQualityGateAttempts = { codeReview: 0, uat: 0, deployment: 0 }
  let successfulQualityGates = { codeReview: 0, uat: 0, deployment: 0 }
  let totalReworkCycles = 0
  
  for (const request of requests) {
    try {
      const workflowHistory = getSafeWorkflowHistory(request)
    
    // Count workflow regressions (backward movements)
    const regressions = countWorkflowRegressions(workflowHistory)
    totalRegressions += regressions
    
    // Count quality gate success rates
    const qualityGates = analyzeQualityGates(workflowHistory)
    totalQualityGateAttempts.codeReview += qualityGates.codeReviewAttempts
    totalQualityGateAttempts.uat += qualityGates.uatAttempts
    totalQualityGateAttempts.deployment += qualityGates.deploymentAttempts
    
    successfulQualityGates.codeReview += qualityGates.codeReviewSuccess ? 1 : 0
    successfulQualityGates.uat += qualityGates.uatSuccess ? 1 : 0
    successfulQualityGates.deployment += qualityGates.deploymentSuccess ? 1 : 0
    
      // Count rework cycles
      totalReworkCycles += countReworkCycles(workflowHistory)
    } catch (error) {
      debugError(`🔍 QUALITY METRICS DEBUG: Error analyzing request ${request.id}:`, error)
      // Continue processing other requests
    }
  }
  
  const totalRequests = requests.length
  const workflowRegressionRate = totalRequests > 0 ? (totalRegressions / totalRequests) * 100 : 0
  const avgReworkCycles = totalRequests > 0 ? totalReworkCycles / totalRequests : 0
  
  return {
    workflowRegressionRate,
    firstTimePassRate: 100 - workflowRegressionRate, // Simplified calculation
    reworkFrequency: avgReworkCycles,
    qualityGateSuccess: {
      codeReview: totalQualityGateAttempts.codeReview > 0 
        ? (successfulQualityGates.codeReview / totalQualityGateAttempts.codeReview) * 100 
        : 0,
      uat: totalQualityGateAttempts.uat > 0 
        ? (successfulQualityGates.uat / totalQualityGateAttempts.uat) * 100 
        : 0,
      deployment: totalQualityGateAttempts.deployment > 0 
        ? (successfulQualityGates.deployment / totalQualityGateAttempts.deployment) * 100 
        : 0
    }
  }
}

/**
 * Counts backward movements in workflow
 */
function countWorkflowRegressions(workflowHistory: WorkflowHistoryEntry[]): number {
  try {
    const statusOrder = [
      'New', 'Initial Analysis', 'Pending Assignment', 'In Progress', 
      'Code Review', 'Pending UAT', 'Pending Deployment', 'Closed'
    ]
    
    let regressions = 0
    
    // Filter for status change entries only
    const statusChanges = workflowHistory.filter(entry => {
      try {
        return entry && entry.action === 'status_change'
      } catch (error) {
        debugWarn('🔍 REGRESSION DEBUG: Error filtering entry:', error, entry)
        return false
      }
    })
    
    for (const entry of statusChanges) {
      try {
        if (entry.from_status && entry.to_status) {
          const fromIndex = statusOrder.indexOf(entry.from_status)
          const toIndex = statusOrder.indexOf(entry.to_status)
          
          // If moving to an earlier stage (regression)
          if (toIndex < fromIndex && toIndex !== -1 && fromIndex !== -1) {
            regressions++
            debugLog(`🔍 REGRESSION DEBUG: Found regression ${entry.from_status} → ${entry.to_status}`)
          }
        }
      } catch (error) {
        debugWarn('🔍 REGRESSION DEBUG: Error processing entry:', error, entry)
        // Continue processing other entries
      }
    }
    
    return regressions
  } catch (error) {
    debugError('🔍 REGRESSION DEBUG: Error counting workflow regressions:', error)
    return 0
  }
}

/**
 * Analyzes quality gate attempts and success rates
 */
function analyzeQualityGates(workflowHistory: WorkflowHistoryEntry[]) {
  try {
    let codeReviewAttempts = 0
    let codeReviewSuccess = false
    let uatAttempts = 0
    let uatSuccess = false
    let deploymentAttempts = 0
    let deploymentSuccess = false
    
    // Filter for status changes only
    const statusChanges = workflowHistory.filter(entry => {
      try {
        return entry && entry.action === 'status_change'
      } catch (error) {
        debugWarn('🔍 QUALITY GATES DEBUG: Error filtering entry:', error, entry)
        return false
      }
    })
  
    for (const entry of statusChanges) {
      try {
        // Code review attempts (entering Code Review)
        if (entry.to_status === 'Code Review') {
          codeReviewAttempts++
        }
        // Code review success (Code Review → Pending UAT)
        if (entry.from_status === 'Code Review' && entry.to_status === 'Pending UAT') {
          codeReviewSuccess = true
        }
        
        // UAT attempts (entering Pending UAT)
        if (entry.to_status === 'Pending UAT') {
          uatAttempts++
        }
        // UAT success (Pending UAT → Pending Deployment)
        if (entry.from_status === 'Pending UAT' && entry.to_status === 'Pending Deployment') {
          uatSuccess = true
        }
        
        // Deployment attempts (entering Pending Deployment)
        if (entry.to_status === 'Pending Deployment') {
          deploymentAttempts++
        }
        // Deployment success (Pending Deployment → Closed)
        if (entry.from_status === 'Pending Deployment' && entry.to_status === 'Closed') {
          deploymentSuccess = true
        }
      } catch (error) {
        debugWarn('🔍 QUALITY GATES DEBUG: Error processing entry:', error, entry)
        // Continue processing other entries
      }
    }
    
    return {
      codeReviewAttempts,
      codeReviewSuccess,
      uatAttempts,
      uatSuccess,
      deploymentAttempts,
      deploymentSuccess
    }
  } catch (error) {
    debugError('🔍 QUALITY GATES DEBUG: Error analyzing quality gates:', error)
    return {
      codeReviewAttempts: 0,
      codeReviewSuccess: false,
      uatAttempts: 0,
      uatSuccess: false,
      deploymentAttempts: 0,
      deploymentSuccess: false
    }
  }
}

/**
 * Counts total rework cycles for a request
 */
function countReworkCycles(workflowHistory: WorkflowHistoryEntry[]): number {
  try {
    return workflowHistory.filter(entry => {
      try {
        return entry && entry.action === 'status_change' && entry.to_status === 'Rework'
      } catch (error) {
        debugWarn('🔍 REWORK CYCLES DEBUG: Error filtering entry:', error, entry)
        return false
      }
    }).length
  } catch (error) {
    debugError('🔍 REWORK CYCLES DEBUG: Error counting rework cycles:', error)
    return 0
  }
}

/**
 * Analyzes current task status and blocked tasks
 */
export function analyzeCurrentTaskStatus(
  userRequests: RequestWithDetails[], 
  userId: string
): CurrentTaskStatus {
  try {
    const now = new Date()
    const inProgressTasks = []
    const blockedTasks = []
    let totalComplexityPoints = 0
    
    
    for (const request of userRequests) {
      try {
        // Skip completed requests
        if (request.status === 'Closed') continue
        
        const complexityPoints = getRequestComplexityPoints(request)
        
        // Check if user is involved in this request (expanded multi-executor check)
        const isInvolved = isUserInvolvedInRequest(request, userId)
        if (!isInvolved) continue
        
        totalComplexityPoints += complexityPoints
        
        // Check if task is blocked
        const blockingInfo = getBlockingReason(request)
        if (blockingInfo) {
          let blockedSince = 0
          try {
            const blockedSinceDate = new Date(blockingInfo.since)
            if (!isNaN(blockedSinceDate.getTime())) {
              blockedSince = Math.floor(
                (now.getTime() - blockedSinceDate.getTime()) / (1000 * 60 * 60 * 24)
              )
            }
          } catch (error) {
            debugWarn('🔍 TASK STATUS DEBUG: Error parsing blocked since date:', blockingInfo.since)
          }
          
          blockedTasks.push({
        requestId: request.id,
        subject: request.subject || 'No subject',
        blockingReason: blockingInfo.reason,
        blockedSince,
            details: blockingInfo.details
          })
        } else {
          // Task is in progress - include ALL tasks user is involved in, not just "actively working"
          let daysOngoing = 0
          
          // Calculate days since request creation (consistent with main table)
          try {
            const createdDate = new Date(request.created_at)
            if (!isNaN(createdDate.getTime())) {
              daysOngoing = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
            }
          } catch (error) {
            debugWarn('🔍 TASK STATUS DEBUG: Error parsing request creation date:', request.created_at)
          }
          
          inProgressTasks.push({
            requestId: request.id,
            subject: request.subject || 'No subject',
            priority: request.priority || 'Medium',
            complexityPoints,
            daysOngoing: Math.max(0, daysOngoing),
            stage: request.status
          })
        }
      } catch (error) {
        debugError(`🔍 TASK STATUS DEBUG: Error analyzing request ${request.id}:`, error)
        // Continue processing other requests
      }
    }
    
    const availableForAssignment = inProgressTasks.length === 0 && blockedTasks.length === 0
    
    return {
      inProgressTasks,
      blockedTasks,
      availableForAssignment,
      totalActiveComplexityPoints: Math.max(0, totalComplexityPoints)
    }
  } catch (error) {
    debugError('🔍 TASK STATUS DEBUG: Error analyzing current task status:', error)
    return {
      inProgressTasks: [],
      blockedTasks: [],
      availableForAssignment: true,
      totalActiveComplexityPoints: 0
    }
  }
}

/**
 * Determines if a user is involved in a request (broader than actively working)
 * This includes multi-executor assignments regardless of current workflow status
 */
function isUserInvolvedInRequest(request: RequestWithDetails, userId: string): boolean {
  // Check work assignments only (excludes requestor role for PIC Performance metrics)
  if (request.current_pic_id === userId) return true
  if (request.tech_lead_id === userId) return true
  if (request.executor_id === userId) return true
  
  // Check multi-executor assignments (critical for 4-person tasks)
  if (request.executors && Array.isArray(request.executors)) {
    return request.executors.some((e: any) => e.user_id === userId)
  }
  
  return false
}

/**
 * Determines if a request is blocked and why
 */
function getBlockingReason(request: RequestWithDetails): { reason: CurrentTaskStatus['blockedTasks'][0]['blockingReason'], details: string, since: string } | null {
  try {
    // Check for clarification pending - ANY request with this status is blocked
    if (request.status === 'Pending Clarification') {
      const clarificationRequests = request.clarification_requests || []
      
      let details = 'Waiting for clarification'
      let since = request.updated_at || new Date().toISOString()
      
      // Try to get more specific details if available
      try {
        const pendingClarifications = Array.isArray(clarificationRequests) 
          ? clarificationRequests.filter((cr: any) => {
              try {
                return cr && cr.status === 'pending'
              } catch (error) {
                return false
              }
            })
          : []
          
        if (pendingClarifications.length > 0) {
          const firstPending = pendingClarifications[0]
          details = `Waiting for clarification: ${firstPending.question || 'No details'}`
          since = firstPending.created_at || since
        }
      } catch (error) {
        debugWarn('🔍 BLOCKING DEBUG: Error processing clarification requests:', error)
      }
      
      return {
        reason: 'clarification_pending',
        details,
        since
      }
    }
  } catch (error) {
    debugError('🔍 BLOCKING DEBUG: Error analyzing blocking reason:', error)
  }
  
  try {
    // Check for external dependencies (simplified heuristic)
    if (request.status === 'Pending Assignment' && 
        request.tech_lead_notes && 
        typeof request.tech_lead_notes === 'string' &&
        request.tech_lead_notes.toLowerCase().includes('dependency')) {
      return {
        reason: 'dependency_waiting',
        details: 'Waiting for external dependency',
        since: request.updated_at || new Date().toISOString()
      }
    }
  } catch (error) {
    debugWarn('🔍 BLOCKING DEBUG: Error checking dependencies:', error)
  }
  
  return null
}

/**
 * Determines if a user is actively working on a request
 */
function isUserActivelyWorking(request: RequestWithDetails, userId: string): boolean {
  // If user is the current PIC, they are responsible for the request regardless of status
  if (request.current_pic_id === userId) {
    // Skip admin queue statuses
    if (request.status === 'New' || request.status === 'Pending Assignment') {
      return false
    }
    return true
  }
  
  // Check for other role-specific responsibilities when user is not current PIC
  switch (request.status) {
    case 'Initial Analysis':
      return request.tech_lead_id === userId
    case 'In Progress':
    case 'Rework':
      return request.executor_id === userId || 
             (request.executors && request.executors.some((e: any) => e.user_id === userId))
    case 'Code Review':
      return request.tech_lead_id === userId
    case 'Pending UAT':
      // During UAT, the tech lead monitors the testing process, not the requestor
      // Requestor is testing, but from PIC perspective, tech lead is responsible
      return request.tech_lead_id === userId
    case 'Pending Deployment':
      return request.tech_lead_id === userId
    case 'Pending Clarification':
      return request.current_pic_id === userId
    default:
      return false
  }
}

/**
 * Gets complexity points for a request (from AI analysis or defaults)
 */
function getRequestComplexityPoints(request: RequestWithDetails): number {
  if (request.ai_analysis && typeof request.ai_analysis === 'object') {
    const aiAnalysis = request.ai_analysis as any
    if (aiAnalysis.complexity_score) {
      return Number(aiAnalysis.complexity_score) || 1
    }
  }
  
  // Default complexity based on priority
  const priorityPoints = {
    'Critical': 5,
    'High': 3,
    'Medium': 2,
    'Low': 1
  }
  
  return priorityPoints[request.priority as keyof typeof priorityPoints] || 2
}

/**
 * Analyzes AI integration effectiveness for a user
 */
export function analyzeAIIntegrationMetrics(
  userRequests: RequestWithDetails[], 
  userRole: string
): AIIntegrationMetrics | null {
  // AI metrics only available for Tech Leads
  if (userRole !== 'PIC' && !userRole.toLowerCase().includes('tech')) {
    return null
  }
  
  const relevantRequests = userRequests.filter(r => 
    r.status !== 'New' && r.request_type !== 'new_application' // AI only used in analysis phase
  )
  
  if (relevantRequests.length === 0) {
    return {
      adoptionRate: 0,
      estimationAccuracy: 0,
      analysisCompleteness: 0,
      techLeadSatisfaction: 0
    }
  }
  
  // Calculate AI adoption rate
  const requestsWithAI = relevantRequests.filter(r => 
    r.ai_analysis && typeof r.ai_analysis === 'object'
  )
  const adoptionRate = (requestsWithAI.length / relevantRequests.length) * 100
  
  // Calculate estimation accuracy
  let totalAccuracyScore = 0
  let accuracyCount = 0
  
  for (const request of requestsWithAI) {
    const aiAnalysis = request.ai_analysis as any
    const estimatedEffort = aiAnalysis.estimated_effort
    
    if (estimatedEffort && request.status === 'Closed') {
      // Calculate actual development time from workflow history
      const workflowMetrics = analyzeWorkflowEfficiency(request)
      const actualDevelopmentHours = workflowMetrics.stageSpecificCycleTimes.developmentTime
      
      if (actualDevelopmentHours > 0) {
        // Convert estimated effort to hours (simplified mapping)
        const estimatedHours = parseEstimatedEffortToHours(estimatedEffort)
        
        if (estimatedHours > 0) {
          // Calculate accuracy ratio (closer to 1.0 = more accurate)
          const ratio = Math.min(estimatedHours, actualDevelopmentHours) / 
                       Math.max(estimatedHours, actualDevelopmentHours)
          totalAccuracyScore += ratio
          accuracyCount++
        }
      }
    }
  }
  
  const estimationAccuracy = accuracyCount > 0 ? totalAccuracyScore / accuracyCount : 0
  
  // Calculate analysis completeness
  let completenessScore = 0
  for (const request of requestsWithAI) {
    const aiAnalysis = request.ai_analysis as any
    let completenessCount = 0
    const requiredFields = ['analysis_content', 'complexity_score', 'estimated_effort', 'identified_risks']
    
    for (const field of requiredFields) {
      if (aiAnalysis[field] && aiAnalysis[field] !== '') {
        completenessCount++
      }
    }
    
    completenessScore += (completenessCount / requiredFields.length) * 100
  }
  
  const analysisCompleteness = requestsWithAI.length > 0 
    ? completenessScore / requestsWithAI.length 
    : 0
  
  // Calculate tech lead satisfaction based on usage patterns
  // If they keep using AI after initial tries, they're likely satisfied
  const recentRequests = relevantRequests.slice(-10) // Last 10 requests
  const recentAIUsage = recentRequests.filter(r => r.ai_analysis).length
  const techLeadSatisfaction = recentRequests.length > 0 
    ? (recentAIUsage / recentRequests.length) * 100 
    : adoptionRate
  
  return {
    adoptionRate: Math.round(adoptionRate * 10) / 10,
    estimationAccuracy: Math.round(estimationAccuracy * 1000) / 1000,
    analysisCompleteness: Math.round(analysisCompleteness * 10) / 10,
    techLeadSatisfaction: Math.round(techLeadSatisfaction * 10) / 10
  }
}

/**
 * Converts estimated effort string to hours (simplified mapping)
 */
function parseEstimatedEffortToHours(estimatedEffort: string): number {
  if (!estimatedEffort || typeof estimatedEffort !== 'string') return 0
  
  const effort = estimatedEffort.toLowerCase()
  
  // Simple mapping patterns
  if (effort.includes('hour')) {
    const match = effort.match(/(\d+(?:\.\d+)?)\s*hours?/)
    return match ? parseFloat(match[1]) : 0
  }
  
  if (effort.includes('day')) {
    const match = effort.match(/(\d+(?:\.\d+)?)\s*days?/)
    return match ? parseFloat(match[1]) * 8 : 0 // 8 hours per day
  }
  
  if (effort.includes('week')) {
    const match = effort.match(/(\d+(?:\.\d+)?)\s*weeks?/)
    return match ? parseFloat(match[1]) * 40 : 0 // 40 hours per week
  }
  
  // Default patterns
  const patterns = {
    'small': 4,
    'medium': 16,
    'large': 40,
    'xl': 80,
    'quick': 2,
    'simple': 4,
    'complex': 32
  }
  
  for (const [pattern, hours] of Object.entries(patterns)) {
    if (effort.includes(pattern)) {
      return hours
    }
  }
  
  return 0
}

/**
 * Calculates performance trend by comparing current vs previous period
 */
export function calculatePerformanceTrend(
  currentScore: number,
  previousScore: number
): PerformanceTrend {
  const changePercentage = previousScore > 0 
    ? ((currentScore - previousScore) / previousScore) * 100 
    : 0
  
  let direction: PerformanceTrend['direction'] = 'stable'
  let trendIcon: PerformanceTrend['trendIcon'] = '═'
  
  if (Math.abs(changePercentage) > 5) { // Significant change threshold
    if (changePercentage > 0) {
      direction = 'improving'
      trendIcon = '▲'
    } else {
      direction = 'declining'
      trendIcon = '▼'
    }
  }
  
  return {
    direction,
    changePercentage: Math.round(changePercentage * 10) / 10,
    previousPeriodScore: Math.round(previousScore * 10) / 10,
    currentPeriodScore: Math.round(currentScore * 10) / 10,
    trendIcon
  }
}

/**
 * Calculates performance score breakdown with simplified, logical formula
 */
export function calculatePerformanceScoreBreakdown(
  workflowEfficiency: WorkflowEfficiencyMetrics,
  qualityMetrics: AdvancedQualityMetrics,
  completedRequests: number,
  totalRequests: number
): PerformanceScoreBreakdown {
  // Volume Adjustment Factor - Reward handling more requests
  const volumeBonus = Math.min(10, Math.log10(Math.max(1, totalRequests)) * 3) // Up to 10% bonus for high volume
  
  // Workflow Efficiency Score (40%) - Focus on cycle time efficiency only
  let efficiencyScore = Math.min(100, Math.max(0, workflowEfficiency.cycleTimeEfficiency))
  
  // Quality Score (35%) - Adjusted for volume bias
  let qualityScore: number
  if (totalRequests >= 5) {
    // Normal calculation for users with sufficient data
    qualityScore = Math.min(100, Math.max(0,
      (qualityMetrics.firstTimePassRate * 0.6) + // First-time pass rate (60%)
      ((100 - qualityMetrics.workflowRegressionRate) * 0.4) // No regressions (40%)
    ))
  } else {
    // Conservative approach for low-volume users - cap their quality advantage
    const baseQuality = Math.min(100, Math.max(0,
      (qualityMetrics.firstTimePassRate * 0.6) + 
      ((100 - qualityMetrics.workflowRegressionRate) * 0.4)
    ))
    // Limit quality score to 85% for users with < 5 requests to prevent unfair advantage
    qualityScore = Math.min(85, baseQuality)
  }
  
  // Productivity Score (25%) - Adjusted for volume and in-progress work
  let productivityScore: number
  if (totalRequests >= 10) {
    // For high-volume workers, factor in absolute completed count
    const absoluteContribution = Math.min(25, completedRequests * 2) // Bonus for absolute contribution
    const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
    productivityScore = Math.min(100, Math.max(0, (completionRate * 0.7) + absoluteContribution))
  } else {
    // Standard completion rate for lower volume
    const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
    productivityScore = Math.min(100, Math.max(0, completionRate))
  }
  
  // Apply volume bonus to efficiency and productivity (not quality to maintain standards)
  efficiencyScore = Math.min(100, efficiencyScore + (volumeBonus * 0.5))
  productivityScore = Math.min(100, productivityScore + (volumeBonus * 0.5))
  
  // Calculate weighted total
  const totalScore = Math.round(
    (efficiencyScore * 0.40) + 
    (qualityScore * 0.35) + 
    (productivityScore * 0.25)
  )
  
  const formula = `(Efficiency ${efficiencyScore.toFixed(1)} × 40%) + (Quality ${qualityScore.toFixed(1)} × 35%) + (Productivity ${productivityScore.toFixed(1)} × 25%) ${volumeBonus > 0 ? `+ ${volumeBonus.toFixed(1)}% volume bonus` : ''}`
  
  return {
    workflowEfficiency: { score: Math.round(efficiencyScore * 10) / 10, weight: 40 },
    quality: { score: Math.round(qualityScore * 10) / 10, weight: 35 },
    velocity: { score: Math.round(productivityScore * 10) / 10, weight: 25 },
    totalScore,
    formula
  }
}

// Employee Performance Analytics Functions
export async function getEmployeePerformanceMetrics(): Promise<EmployeePerformanceMetrics[]> {
  try {
    // Get all requests and users
    const allRequestsResult = await getAllSystemRequests()
    const allUsers = await getUsers()
    
    if (!allRequestsResult.data || !allUsers) {
      console.log('❌ No data found:', { requests: !!allRequestsResult.data, users: !!allUsers })
      return []
    }
    
    const requests = allRequestsResult.data
    console.log('🔍 Analytics Debug - Total requests:', requests.length)
    console.log('🔍 Analytics Debug - Available statuses:', [...new Set(requests.map(r => r.status))])
    
    // Include all active users in analytics (not just those with assignments)
    const allActiveUsers = (allUsers.data || []).filter(u => u.is_active !== false)
    const picUserIds = new Set([
      ...requests.map(r => r.current_pic_id),
      ...requests.map(r => r.tech_lead_id),
      ...requests.map(r => r.executor_id),
      ...requests.flatMap(r => r.executors ? r.executors.map((e: any) => e.user_id) : [])
    ].filter(Boolean))
    
    // Include ALL active users, not just those with assignments
    const users = allActiveUsers
    console.log('🔍 Analytics Debug - Users who act as PICs:', picUserIds.size, 'Total active users being analyzed:', users.length)
    
    // Calculate metrics for each employee
    const employeeMetrics: EmployeePerformanceMetrics[] = []
    
    for (const user of users) {
      // Get user's requests - each request counted only once per user, regardless of multiple roles
      const userRequests = requests.filter(r => {
        // Check if user is assigned to WORK on this request (excludes requestor role)
        const isCurrentPIC = r.current_pic_id === user.id
        const isTechLead = r.tech_lead_id === user.id
        const isExecutor = r.executor_id === user.id
        const isMultiExecutor = r.executors && r.executors.some((e: any) => e.user_id === user.id)
        
        
        // Return true only if user is assigned to WORK on the request
        // Excludes requestor role - requestors create requests but don't work on them (unless also assigned)
        return isCurrentPIC || isTechLead || isExecutor || isMultiExecutor
      })
      
      if (userRequests.length === 0) {
        employeeMetrics.push({
          userId: user.id,
          userName: user.full_name,
          userRole: user.role,
          department: user.department || 'Unassigned',
          totalRequests: 0,
          completedRequests: 0,
          inProgressRequests: 0,
          
          // Raw request data for multi-executor analysis
          userRequests: [],
          
          // Legacy metrics (kept for compatibility)
          averageCompletionTime: 0,
          completionRate: 0,
          overdueCount: 0,
          reworkRate: 0,
          uatRejectionRate: 0,
          commentFrequency: 0,
          avgStageTime: {
            initialAnalysis: 0,
            inProgress: 0,
            codeReview: 0,
            uat: 0
          },
          
          // Advanced workflow efficiency metrics
          workflowEfficiency: {
            stageSpecificCycleTimes: {
              analysisTime: 0,
              developmentTime: 0,
              qaTime: 0,
              uatTime: 0
            },
            queueTimes: {
              picAssignmentQueue: 0,
              devQueue: 0,
              qaQueue: 0
            },
            teamVelocity: 0,
            cycleTimeEfficiency: 0
          },
          
          // Quality & process integrity metrics
          qualityMetrics: {
            workflowRegressionRate: 0,
            firstTimePassRate: 100,
            reworkFrequency: 0,
            qualityGateSuccess: {
              codeReview: 0,
              uat: 0,
              deployment: 0
            }
          },
          
          // AI integration metrics (for Tech Leads)
          aiMetrics: null,
          
          // Current status and workload
          currentTaskStatus: {
            inProgressTasks: [],
            blockedTasks: [],
            availableForAssignment: true,
            totalActiveComplexityPoints: 0
          },
          
          // Performance tracking
          performanceScore: 0,
          performanceScoreBreakdown: {
            workflowEfficiency: { score: 0, weight: 40 },
            quality: { score: 0, weight: 35 },
            velocity: { score: 0, weight: 25 },
            totalScore: 0,
            formula: "No data available"
          },
          performanceTrend: {
            direction: 'stable',
            changePercentage: 0,
            previousPeriodScore: 0,
            currentPeriodScore: 0,
            trendIcon: '═'
          },
          
          // Ranking
          departmentRank: 0,
          overallRank: 0
        })
        continue
      }
      
      // Use the same userRequests for current status (no separate time filtering needed)
      const allUserRequests = userRequests
      
      const totalRequests = userRequests.length
      const completedRequests = userRequests.filter(r => ['Closed', 'Rejected'].includes(r.status)).length
      // Count actual in-progress requests (consistent with currentTaskStatus)
      // Only count requests where the user is actively working
      const inProgressRequests = allUserRequests.filter(r => 
        !['Closed', 'Rejected'].includes(r.status) && isUserActivelyWorking(r, user.id)
      ).length
      
      // Calculate completion time for closed requests
      const closedRequests = userRequests.filter(r => ['Closed', 'Rejected'].includes(r.status))
      let averageCompletionTime = 0
      if (closedRequests.length > 0) {
        const totalTime = closedRequests.reduce((sum, req) => {
          const created = new Date(req.created_at).getTime()
          const updated = new Date(req.updated_at).getTime()
          return sum + (updated - created)
        }, 0)
        averageCompletionTime = totalTime / closedRequests.length / (1000 * 60 * 60 * 24) // in days
      }
      
      const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
      
      // Calculate overdue count
      const now = new Date()
      const overdueCount = userRequests.filter(r => 
        r.adjusted_deadline && 
        new Date(r.adjusted_deadline) < now && 
        r.status !== 'Closed'
      ).length
      
      // Calculate rework rate (requests that went to 'Rework' status)
      const reworkRequests = userRequests.filter(r => {
        const workflowHistory = r.workflow_history as any[]
        return workflowHistory?.some(entry => entry.status === 'Rework')
      })
      const reworkRate = totalRequests > 0 ? (reworkRequests.length / totalRequests) * 100 : 0
      
      // Calculate UAT rejection rate
      const uatRejectedRequests = userRequests.filter(r => {
        const workflowHistory = r.workflow_history as any[]
        return workflowHistory?.some(entry => 
          entry.status === 'Rework' && entry.previous_status === 'Pending UAT'
        )
      })
      const uatRejectionRate = totalRequests > 0 ? (uatRejectedRequests.length / totalRequests) * 100 : 0
      
      // Calculate comment frequency
      const totalComments = userRequests.reduce((sum, req) => 
        sum + (req.comments?.length || 0), 0
      )
      const commentFrequency = totalRequests > 0 ? totalComments / totalRequests : 0
      
      // Calculate stage times (simplified - would need more detailed workflow analysis)
      const avgStageTime = {
        initialAnalysis: 2, // placeholder - would calculate from workflow_history
        inProgress: averageCompletionTime * 0.6, // rough estimate
        codeReview: 1, // placeholder
        uat: 2 // placeholder
      }
      
      // Calculate advanced analytics using new analysis functions
      console.log(`🔍 Calculating advanced metrics for ${user.full_name} with ${userRequests.length} requests`)
      
      // Calculate workflow efficiency metrics
      const workflowEfficiencyData = userRequests.map(req => analyzeWorkflowEfficiency(req))
      const workflowEfficiency: WorkflowEfficiencyMetrics = {
        stageSpecificCycleTimes: {
          analysisTime: workflowEfficiencyData.reduce((sum, data) => sum + data.stageSpecificCycleTimes.analysisTime, 0) / Math.max(workflowEfficiencyData.length, 1),
          developmentTime: workflowEfficiencyData.reduce((sum, data) => sum + data.stageSpecificCycleTimes.developmentTime, 0) / Math.max(workflowEfficiencyData.length, 1),
          qaTime: workflowEfficiencyData.reduce((sum, data) => sum + data.stageSpecificCycleTimes.qaTime, 0) / Math.max(workflowEfficiencyData.length, 1),
          uatTime: workflowEfficiencyData.reduce((sum, data) => sum + data.stageSpecificCycleTimes.uatTime, 0) / Math.max(workflowEfficiencyData.length, 1)
        },
        queueTimes: {
          picAssignmentQueue: workflowEfficiencyData.reduce((sum, data) => sum + data.queueTimes.picAssignmentQueue, 0) / Math.max(workflowEfficiencyData.length, 1),
          devQueue: workflowEfficiencyData.reduce((sum, data) => sum + data.queueTimes.devQueue, 0) / Math.max(workflowEfficiencyData.length, 1),
          qaQueue: workflowEfficiencyData.reduce((sum, data) => sum + data.queueTimes.qaQueue, 0) / Math.max(workflowEfficiencyData.length, 1)
        },
        teamVelocity: workflowEfficiencyData.reduce((sum, data) => sum + data.teamVelocity, 0) / Math.max(workflowEfficiencyData.length, 1),
        cycleTimeEfficiency: (() => {
          if (workflowEfficiencyData.length === 0) return 50 // Default when no data
          
          // For fairer scoring, use weighted approach instead of simple average
          if (workflowEfficiencyData.length >= 5) {
            // For users with sufficient data, use median + top quartile average
            const efficiencies = workflowEfficiencyData.map(d => d.cycleTimeEfficiency).sort((a, b) => b - a)
            const medianIndex = Math.floor(efficiencies.length / 2)
            const topQuartileEnd = Math.floor(efficiencies.length * 0.25)
            
            const median = efficiencies[medianIndex]
            const topQuartileAvg = efficiencies.slice(0, Math.max(1, topQuartileEnd)).reduce((sum, val) => sum + val, 0) / Math.max(1, topQuartileEnd)
            
            // Weight: 60% median (consistent performance) + 40% top quartile (peak performance)
            return Math.min(100, Math.max(0, (median * 0.6) + (topQuartileAvg * 0.4)))
          } else {
            // For users with limited data, use simple average but cap at 90% to prevent unfair advantage
            const simpleAvg = workflowEfficiencyData.reduce((sum, data) => sum + data.cycleTimeEfficiency, 0) / workflowEfficiencyData.length
            return Math.min(90, Math.max(0, simpleAvg))
          }
        })()
      }
      
      // Calculate quality metrics 
      const qualityMetrics = analyzeQualityMetrics(userRequests)
      
      // Calculate AI integration metrics (for Tech Leads)
      const aiMetrics = analyzeAIIntegrationMetrics(userRequests, user.role)
      
      // Analyze current task status using ALL requests (not time-filtered)
      // Current tasks should show regardless of creation date
      const currentTaskStatus = analyzeCurrentTaskStatus(allUserRequests, user.id)
      
      // Calculate performance score breakdown
      const performanceScoreBreakdown = calculatePerformanceScoreBreakdown(
        workflowEfficiency,
        qualityMetrics,
        completedRequests,
        totalRequests
      )
      
      // Calculate performance trend (for now, use static comparison - will enhance later)
      const performanceTrend = calculatePerformanceTrend(
        performanceScoreBreakdown.totalScore,
        performanceScoreBreakdown.totalScore * 0.95 // Mock previous period (5% lower)
      )
      
      employeeMetrics.push({
        userId: user.id,
        userName: user.full_name,
        userRole: user.role,
        department: user.department || 'Unassigned',
        
        // Core metrics
        totalRequests,
        completedRequests,
        inProgressRequests,
        
        // Raw request data for multi-executor analysis
        userRequests: userRequests,
        
        // Legacy metrics (kept for compatibility)
        averageCompletionTime: Math.round(averageCompletionTime * 10) / 10,
        completionRate: Math.round(completionRate * 10) / 10,
        overdueCount,
        reworkRate: Math.round(reworkRate * 10) / 10,
        uatRejectionRate: Math.round(uatRejectionRate * 10) / 10,
        commentFrequency: Math.round(commentFrequency * 10) / 10,
        avgStageTime,
        
        // Advanced workflow efficiency metrics
        workflowEfficiency,
        
        // Quality & process integrity metrics
        qualityMetrics,
        
        // AI integration metrics (for Tech Leads)
        aiMetrics,
        
        // Current status and workload
        currentTaskStatus,
        
        // Performance tracking
        performanceScore: performanceScoreBreakdown.totalScore,
        performanceScoreBreakdown,
        performanceTrend,
        
        // Ranking (will be calculated after all metrics)
        departmentRank: 0,
        overallRank: 0
      })
    }
    
    // Calculate department ranks
    const departmentGroups = employeeMetrics.reduce((acc, emp) => {
      if (!acc[emp.department]) acc[emp.department] = []
      acc[emp.department].push(emp)
      return acc
    }, {} as Record<string, EmployeePerformanceMetrics[]>)
    
    Object.values(departmentGroups).forEach(deptEmployees => {
      deptEmployees.sort((a, b) => b.performanceScore - a.performanceScore)
      deptEmployees.forEach((emp, index) => {
        emp.departmentRank = index + 1
      })
    })
    
    // Calculate overall ranks
    const sortedMetrics = employeeMetrics.sort((a, b) => b.performanceScore - a.performanceScore)
    sortedMetrics.forEach((emp, index) => {
      emp.overallRank = index + 1
    })
    
    console.log('🔍 Advanced Analytics - Calculated metrics for', employeeMetrics.length, 'employees')
    console.log('🔍 Advanced Analytics - Top performer:', sortedMetrics[0]?.userName, 'with score:', sortedMetrics[0]?.performanceScore)
    
    return sortedMetrics
    
  } catch (error) {
    console.error('Error in getEmployeePerformanceMetrics:', error)
    return []
  }
}

// =============================================================================
// TWO WEEKS FOCUS TRACKING FUNCTIONS
// =============================================================================

export async function addTwoWeeksFocus(userId: string, requestId: string, markedBy: string, focusDate?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for addTwoWeeksFocus')
      return { success: false, error: 'Database not available' }
    }

    const { error } = await supabaseAdmin
      .from('two_weeks_focus_requests')
      .insert({
        user_id: userId,
        request_id: requestId,
        marked_by: markedBy,
        focus_date: focusDate || new Date().toISOString().split('T')[0]
      })

    if (error) {
      console.error('Error adding two weeks focus:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in addTwoWeeksFocus:', error)
    return { success: false, error: 'Failed to add two weeks focus' }
  }
}

export async function removeTwoWeeksFocus(userId: string, requestId: string, focusDate?: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for removeTwoWeeksFocus')
      return { success: false, error: 'Database not available' }
    }

    const { error } = await supabaseAdmin
      .from('two_weeks_focus_requests')
      .delete()
      .match({
        user_id: userId,
        request_id: requestId,
        focus_date: focusDate || new Date().toISOString().split('T')[0]
      })

    if (error) {
      console.error('Error removing two weeks focus:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in removeTwoWeeksFocus:', error)
    return { success: false, error: 'Failed to remove two weeks focus' }
  }
}

export async function getTwoWeeksFocusRequests(focusDate?: string): Promise<{ data: any[] | null; error: Error | null }> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for getTwoWeeksFocusRequests')
      return { data: [], error: null }
    }

    const { data, error } = await supabaseAdmin
      .from('two_weeks_focus_requests')
      .select('*')
      .eq('focus_date', focusDate || new Date().toISOString().split('T')[0])

    if (error) {
      console.error('Error fetching two weeks focus requests:', error)
      return { data: null, error }
    }

    return { data: data || [], error: null }
  } catch (error) {
    console.error('Error in getTwoWeeksFocusRequests:', error)
    return { data: null, error: error as Error }
  }
}

// =============================================================================
// ENHANCED FOCUS MANAGEMENT FOR 2-WEEK PLANNING
// =============================================================================

/**
 * Get focus requests across a date range for management planning
 */
export async function getFocusRequestsRange(startDate: string, endDate: string): Promise<{ data: any[] | null; error: Error | null }> {
  // Use backwards-compatible function during migration period
  return await getFocusRequestsRangeCompatible(startDate, endDate)
}

/**
 * Clean up old focus data older than specified days
 */
export async function cleanupOldFocusData(daysToKeep: number = 30): Promise<{ success: boolean; deletedCount?: number; error?: string }> {
  // Use backwards-compatible function during migration period
  return await cleanupOldFocusDataCompatible(daysToKeep)
}

/**
 * Get comprehensive management dashboard data including bottlenecks, risks, and actionable items
 */
export async function getManagementDashboardData(): Promise<{
  data: {
    workloadFunnel: any
    actionItems: any
    bottlenecks: any
    riskAssessment: any
    teamPerformance: any
  } | null
  error: Error | null
}> {
  try {
    if (!supabaseAdmin) {
      console.warn('Supabase admin client not available for getManagementDashboardData')
      return { data: null, error: new Error('Database not available') }
    }

    // Get all active requests with detailed information
    const { data: allRequests, error: requestsError } = await supabaseAdmin
      .from('requests')
      .select(`
        *,
        applications:application_id (name, tech_lead_id),
        requestor:requestor_id (full_name, department),
        tech_lead:tech_lead_id (full_name),
        executor:executor_id (full_name),
        current_pic:current_pic_id (full_name)
      `)
      .neq('status', 'Closed')
      .neq('status', 'Rejected')

    if (requestsError) {
      console.error('Error fetching requests for management dashboard:', requestsError)
      return { data: null, error: requestsError }
    }

    const requests = allRequests || []
    const now = new Date()
    
    // 1. WORKLOAD FUNNEL ANALYSIS
    const workloadFunnel = analyzeWorkloadFunnel(requests)
    
    // 2. ACTIONABLE ITEMS (Immediate attention needed)
    const actionItems = identifyActionItems(requests, now)
    
    // 3. BOTTLENECK IDENTIFICATION
    const bottlenecks = identifyBottlenecks(requests)
    
    // 4. RISK ASSESSMENT
    const riskAssessment = assessRisks(requests, now)
    
    // 5. TEAM PERFORMANCE INSIGHTS
    const teamPerformance = analyzeTeamPerformance(requests)

    return {
      data: {
        workloadFunnel,
        actionItems,
        bottlenecks,
        riskAssessment,
        teamPerformance
      },
      error: null
    }
  } catch (error) {
    console.error('Error in getManagementDashboardData:', error)
    return { data: null, error: error as Error }
  }
}

/**
 * Analyze workload funnel and capacity
 */
function analyzeWorkloadFunnel(requests: any[]) {
  const funnelStages = {
    'New': 0,
    'Initial Analysis': 0,
    'Pending Assignment': 0,
    'In Progress': 0,
    'Code Review': 0,
    'Pending UAT': 0,
    'Pending Deployment': 0,
    'Pending Clarification': 0,
    'Rework': 0
  }

  const priorityBreakdown = { 'Critical': 0, 'High': 0, 'Medium': 0, 'Low': 0 }
  
  requests.forEach(req => {
    if (funnelStages.hasOwnProperty(req.status)) {
      (funnelStages as any)[req.status]++
    }
    if (priorityBreakdown.hasOwnProperty(req.priority)) {
      (priorityBreakdown as any)[req.priority]++
    }
  })

  const totalActive = requests.length
  const inProgress = funnelStages['In Progress'] + funnelStages['Code Review'] + funnelStages['Rework']
  const waiting = funnelStages['New'] + funnelStages['Pending Assignment'] + funnelStages['Pending UAT'] + funnelStages['Pending Deployment']
  const blocked = funnelStages['Pending Clarification']

  return {
    totalActive,
    funnelStages,
    priorityBreakdown,
    capacityAnalysis: {
      inProgress,
      waiting,
      blocked,
      utilizationRate: totalActive > 0 ? Math.round((inProgress / totalActive) * 100) : 0
    }
  }
}

/**
 * Identify actionable items requiring immediate management attention
 */
function identifyActionItems(requests: any[], now: Date) {
  const overdue = requests.filter(req => {
    const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    if (!deadline) return false
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
    return deadlineDate < now && !['Closed', 'Rejected'].includes(req.status)
  }).map(req => {
    const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    return {
      id: req.id,
      subject: req.subject,
      department: req.requestor?.department || 'Unknown',
      assignee: req.executor?.full_name || req.tech_lead?.full_name || 'Unassigned',
      priority: req.priority,
      daysOverdue: Math.ceil((now.getTime() - new Date(deadline).getTime()) / (1000 * 60 * 60 * 24)),
      status: req.status
    }
  })

  const nearDeadline = requests.filter(req => {
    const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    if (!deadline) return false
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
    const daysUntil = Math.ceil((deadlineDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    return daysUntil <= 7 && daysUntil > 0 && !['Closed', 'Rejected'].includes(req.status)
  }).map(req => {
    const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    return {
      id: req.id,
      subject: req.subject,
      department: req.requestor?.department || 'Unknown',
      assignee: req.executor?.full_name || req.tech_lead?.full_name || 'Unassigned',
      priority: req.priority,
      daysUntilDeadline: Math.ceil((new Date(deadline).getTime() - now.getTime()) / (1000 * 60 * 60 * 24)),
      status: req.status
    }
  })

  const blocked = requests.filter(req => req.status === 'Pending Clarification').map(req => ({
    id: req.id,
    subject: req.subject,
    department: req.requestor?.department || 'Unknown',
    assignee: req.executor?.full_name || req.tech_lead?.full_name || 'Unassigned',
    priority: req.priority,
    status: req.status,
    previousStatus: req.previous_status
  }))

  const unassigned = requests.filter(req => 
    req.status === 'Pending Assignment' || 
    (req.status === 'In Progress' && !req.executor_id)
  ).map(req => ({
    id: req.id,
    subject: req.subject,
    department: req.requestor?.department || 'Unknown',
    priority: req.priority,
    status: req.status
  }))

  // Calculate normal active requests (not in any immediate action category)
  const overdueIds = new Set(overdue.map(req => req.id))
  const nearDeadlineIds = new Set(nearDeadline.map(req => req.id))
  const blockedIds = new Set(blocked.map(req => req.id))
  const unassignedIds = new Set(unassigned.map(req => req.id))

  const normalActive = requests.filter(req => 
    !overdueIds.has(req.id) && 
    !nearDeadlineIds.has(req.id) && 
    !blockedIds.has(req.id) && 
    !unassignedIds.has(req.id)
  ).map(req => ({
    id: req.id,
    subject: req.subject,
    department: req.requestor?.department || 'Unknown',
    assignee: req.executor?.full_name || req.tech_lead?.full_name || 'Unassigned',
    priority: req.priority,
    status: req.status
  }))

  return {
    overdue: overdue.sort((a, b) => b.daysOverdue - a.daysOverdue),
    nearDeadline: nearDeadline.sort((a, b) => a.daysUntilDeadline - b.daysUntilDeadline),
    blocked: blocked.sort((a, b) => (b.priority === 'Critical' ? 1 : 0) - (a.priority === 'Critical' ? 1 : 0)),
    unassigned: unassigned.sort((a, b) => (b.priority === 'Critical' ? 1 : 0) - (a.priority === 'Critical' ? 1 : 0)),
    normalActive: normalActive.sort((a, b) => (b.priority === 'Critical' ? 1 : 0) - (a.priority === 'Critical' ? 1 : 0))
  }
}

/**
 * Identify bottlenecks in workflow and team
 */
function identifyBottlenecks(requests: any[]) {
  // Status bottlenecks
  const statusCounts = requests.reduce((acc, req) => {
    acc[req.status] = (acc[req.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const bottleneckStatuses = Object.entries(statusCounts)
    .filter(([status, count]) => (count as number) > 5 && status !== 'In Progress')
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .map(([status, count]) => ({ status, count: count as number }))

  // Assignee bottlenecks
  const assigneeWorkload = requests.reduce((acc, req) => {
    const assignee = req.executor?.full_name || req.tech_lead?.full_name || 'Unassigned'
    if (assignee !== 'Unassigned') {
      acc[assignee] = (acc[assignee] || 0) + 1
    }
    return acc
  }, {} as Record<string, number>)

  const overloadedAssignees = Object.entries(assigneeWorkload)
    .filter(([,count]) => (count as number) > 5)
    .sort(([,a], [,b]) => (b as number) - (a as number))
    .map(([assignee, count]) => ({ assignee, count: count as number }))

  // Department bottlenecks
  const departmentCounts = requests.reduce((acc, req) => {
    const dept = req.requestor?.department || 'Unknown'
    acc[dept] = (acc[dept] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  return {
    statusBottlenecks: bottleneckStatuses,
    overloadedAssignees,
    departmentVolume: Object.entries(departmentCounts)
      .sort(([,a], [,b]) => (b as number) - (a as number))
      .map(([department, count]) => ({ department, count: count as number }))
  }
}

/**
 * Assess risks to SLA and sprint goals
 */
function assessRisks(requests: any[], now: Date) {
  const highRiskRequests = requests.filter(req => {
    const isHighPriority = ['Critical', 'High'].includes(req.priority)
    const hasDeadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    const isBlocked = req.status === 'Pending Clarification'
    const isStuck = req.status === 'Rework' // Indicates problems
    
    return isHighPriority && (hasDeadline || isBlocked || isStuck)
  }).map(req => {
    let riskFactors = []
    const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    if (deadline) {
      const deadlineDate = new Date(deadline)
      deadlineDate.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
      if (deadlineDate < now) riskFactors.push('Overdue')
    }
    if (req.status === 'Pending Clarification') riskFactors.push('Blocked')
    if (req.status === 'Rework') riskFactors.push('Quality Issues')
    if (req.priority === 'Critical') riskFactors.push('Critical Priority')
    
    return {
      id: req.id,
      subject: req.subject,
      priority: req.priority,
      status: req.status,
      department: req.requestor?.department || 'Unknown',
      assignee: req.executor?.full_name || req.tech_lead?.full_name || 'Unassigned',
      riskFactors,
      riskScore: riskFactors.length
    }
  })

  const slaViolations = requests.filter(req => {
    const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
    if (!deadline) return false
    const deadlineDate = new Date(deadline)
    deadlineDate.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
    return deadlineDate < now && !['Closed', 'Rejected'].includes(req.status)
  }).length

  return {
    highRiskRequests: highRiskRequests.sort((a, b) => b.riskScore - a.riskScore),
    slaViolations,
    totalRiskScore: highRiskRequests.reduce((sum, req) => sum + req.riskScore, 0)
  }
}

/**
 * Analyze team performance for management insights
 */
function analyzeTeamPerformance(requests: any[]) {
  const teamMembers = new Set<string>()
  const teamWorkload: Record<string, { total: number; inProgress: number; overdue: number }> = {}
  
  requests.forEach(req => {
    const assignee = req.executor?.full_name || req.tech_lead?.full_name
    if (assignee) {
      teamMembers.add(assignee)
      if (!teamWorkload[assignee]) {
        teamWorkload[assignee] = { total: 0, inProgress: 0, overdue: 0 }
      }
      teamWorkload[assignee].total++
      
      if (['In Progress', 'Code Review', 'Rework'].includes(req.status)) {
        teamWorkload[assignee].inProgress++
      }
      
      const deadline = req.adjusted_deadline || req.internal_deadline || req.requested_deadline
      if (deadline) {
        const deadlineDate = new Date(deadline)
        deadlineDate.setHours(23, 59, 59, 999) // End of deadline day for fair comparison
        if (deadlineDate < new Date() && !['Closed', 'Rejected'].includes(req.status)) {
          teamWorkload[assignee].overdue++
        }
      }
    }
  })

  const teamPerformanceData = Object.entries(teamWorkload).map(([member, workload]) => ({
    member,
    ...workload,
    utilizationRate: workload.total > 0 ? Math.round((workload.inProgress / workload.total) * 100) : 0
  })).sort((a, b) => b.total - a.total)

  return {
    teamSize: teamMembers.size,
    teamWorkload: teamPerformanceData,
    averageWorkload: teamPerformanceData.length > 0 ? 
      Math.round(teamPerformanceData.reduce((sum, member) => sum + member.total, 0) / teamPerformanceData.length) : 0
  }
}

// =============================================================================
// SIMPLE PIC INVOLVEMENT ANALYTICS (NEW APPROACH)
// =============================================================================

/**
 * Get simple PIC involvement data - counts requests per employee by role
 * This replaces the complex performance metrics for basic involvement tracking
 */
export async function getPICInvolvementData(focusDate?: string): Promise<PICInvolvementMetrics[]> {
  try {
    console.log('🔍 Starting PIC Involvement Analysis')
    
    // Step 1: Get all data
    const allRequestsResult = await getAllSystemRequests()
    const allUsersResult = await getUsers()
    const focusResult = await getTwoWeeksFocusRequestsCompatible(focusDate)
    
    if (!allRequestsResult.data || !allUsersResult.data) {
      console.log('❌ No data found for PIC involvement analysis')
      return []
    }
    
    const requests = allRequestsResult.data
    const allUsers = allUsersResult.data
    const focusRequests = focusResult.data || []
    
    // Step 2: Get PIC/Admin users only (exclude Requestors)
    const picUsers = allUsers.filter(u => 
      u.is_active !== false && 
      (u.role === 'PIC' || u.role === 'Admin')
    )
    
    console.log(`🔍 Found ${requests.length} requests and ${picUsers.length} PIC/Admin users`)
    
    // Debug: Check UAT requests
    const uatRequests = requests.filter(r => r.status === 'Pending UAT')
    console.log(`🔍 UAT Debug - Found ${uatRequests.length} requests in UAT status`)
    for (const uatReq of uatRequests) {
      console.log(`  - Request ${uatReq.id}: "${uatReq.subject}"`)
      console.log(`    Tech Lead: ${uatReq.tech_lead_id}`)
      console.log(`    Legacy Executor: ${uatReq.executor_id || 'none'}`)
    }
    
    // Step 3: Build multi-executor lookup map from request_executors table
    const multiExecutorMap = new Map<string, string[]>() // requestId -> [userIds]
    
    if (supabaseAdmin) {
      const { data: executorData, error: executorError } = await supabaseAdmin
        .from('request_executors')
        .select('request_id, user_id')
        
      if (executorError) {
        console.warn('⚠️ Could not load request_executors data:', executorError.message)
      } else if (executorData) {
        console.log(`🔍 Found ${executorData.length} multi-executor assignments`)
        
        // Count UAT requests with multi-executors
        let uatCount = 0
        
        for (const assignment of executorData) {
          const requestId = assignment.request_id as string
          const userId = assignment.user_id as string
          
          if (!multiExecutorMap.has(requestId)) {
            multiExecutorMap.set(requestId, [])
          }
          multiExecutorMap.get(requestId)!.push(userId)
          
          // Check if this request is in UAT
          const request = requests.find(r => r.id === requestId)
          if (request && request.status === 'Pending UAT') {
            uatCount++
            console.log(`🔍 UAT Multi-executor: Request ${requestId} has executor ${userId}`)
          }
        }
        
        console.log(`🔍 Found ${uatCount} multi-executor assignments for UAT requests`)
      }
    }
    
    console.log(`🔍 Built multi-executor map with ${multiExecutorMap.size} requests having multi-executors`)
    
    // Step 4: Build focus map from daily focus requests
    const focusMap = new Map<string, Set<string>>() // userId -> Set of request IDs
    for (const focus of focusRequests) {
      const userId = focus.user_id as string
      const requestId = focus.request_id as string
      
      if (!focusMap.has(userId)) {
        focusMap.set(userId, new Set())
      }
      focusMap.get(userId)!.add(requestId)
    }
    
    console.log(`🔍 Built focus map with ${focusMap.size} users having focused requests`)
    
    // Step 5: Analyze work assignments for each PIC user
    const involvementData: PICInvolvementMetrics[] = []
    
    // Helper function to determine work assignment for a user and request
    const getWorkAssignment = (request: any, userId: string) => {
      const multiExecutors = multiExecutorMap.get(request.id) || []
      let isAssigned = false
      let roleType: 'Tech Lead' | 'Executor' | null = null
      let workCategory: 'Active' | 'Pending' | 'Finished' | null = null
      let teamSize: number | undefined = undefined
      
      // Check assignment by status
      switch (request.status) {
        // Active Tech Lead work
        case 'Initial Analysis':
          if (request.tech_lead_id === userId) {
            isAssigned = true
            roleType = 'Tech Lead'
            workCategory = 'Active'
          }
          break
          
        // Code Review - Tech Lead active, Executor pending
        case 'Code Review':
          if (request.tech_lead_id === userId) {
            isAssigned = true
            roleType = 'Tech Lead'
            workCategory = 'Active'
          } else {
            const isLegacyExecutor = request.executor_id === userId
            const isMultiExecutor = multiExecutors.includes(userId)
            
            if (isMultiExecutor || isLegacyExecutor) {
              isAssigned = true
              roleType = 'Executor'
              workCategory = 'Pending'
              teamSize = multiExecutors.length > 0 ? multiExecutors.length : 1
            }
          }
          break
          
        // Active Executor work
        case 'In Progress':
        case 'Rework':
          const isLegacyExecutor = request.executor_id === userId
          const isMultiExecutor = multiExecutors.includes(userId)
          
          if (isMultiExecutor || isLegacyExecutor) {
            isAssigned = true
            roleType = 'Executor'
            workCategory = 'Active'
            teamSize = multiExecutors.length > 0 ? multiExecutors.length : 1
          }
          break
          
        // Pending Tech Lead work
        case 'New':
        case 'Pending Assignment':
          if (request.tech_lead_id === userId) {
            isAssigned = true
            roleType = 'Tech Lead'
            workCategory = 'Pending'
          }
          break

        // Pending UAT - both Tech Lead and Executor should see this
        case 'Pending UAT':
          if (request.tech_lead_id === userId) {
            isAssigned = true
            roleType = 'Tech Lead'
            workCategory = 'Pending'
          } else {
            const isLegacyExecutor = request.executor_id === userId
            const isMultiExecutor = multiExecutors.includes(userId)
            
            // Debug logging for UAT executor assignment
            if (request.status === 'Pending UAT') {
              console.log(`🔍 UAT Debug - Request ${request.id} (${request.subject}):`)
              console.log(`  - Checking user: ${userId}`)
              console.log(`  - Legacy executor_id: ${request.executor_id}`)
              console.log(`  - Is legacy executor: ${isLegacyExecutor}`)
              console.log(`  - Multi-executors for this request: ${multiExecutors.length > 0 ? multiExecutors.join(', ') : 'none'}`)
              console.log(`  - Is multi-executor: ${isMultiExecutor}`)
            }
            
            if (isMultiExecutor || isLegacyExecutor) {
              isAssigned = true
              roleType = 'Executor'
              workCategory = 'Pending'
              teamSize = multiExecutors.length > 0 ? multiExecutors.length : 1
              console.log(`  ✅ Assigned as Executor to UAT request`)
            }
          }
          break
          
        // Pending Deployment - depends on single vs multi-executor
        case 'Pending Deployment':
          const isMultiExecutorRequest = multiExecutors.length > 0
          
          if (isMultiExecutorRequest) {
            // Multi-executor: Tech Lead deploys
            if (request.tech_lead_id === userId) {
              isAssigned = true
              roleType = 'Tech Lead'
              workCategory = 'Active'
            } else if (multiExecutors.includes(userId)) {
              isAssigned = true
              roleType = 'Executor'
              workCategory = 'Pending'
              teamSize = multiExecutors.length
            }
          } else {
            // Single executor: Executor deploys
            if (request.executor_id === userId) {
              isAssigned = true
              roleType = 'Executor'
              workCategory = 'Active'
              teamSize = 1
            } else if (request.tech_lead_id === userId) {
              isAssigned = true
              roleType = 'Tech Lead'
              workCategory = 'Pending'
            }
          }
          break
          
        // Pending Clarification work
        case 'Pending Clarification':
          // Check who the clarification is for based on current workflow state
          if (request.tech_lead_id === userId) {
            isAssigned = true
            roleType = 'Tech Lead'
            workCategory = 'Pending'
          } else if (request.executor_id === userId || multiExecutors.includes(userId)) {
            isAssigned = true
            roleType = 'Executor'
            workCategory = 'Pending'
            teamSize = multiExecutors.length > 0 ? multiExecutors.length : 1
          }
          break
          
        // Finished work (completed requests)
        case 'Closed':
          // Check if user was involved in this closed request
          if (request.tech_lead_id === userId) {
            isAssigned = true
            roleType = 'Tech Lead'
            workCategory = 'Finished'
          } else if (request.executor_id === userId || multiExecutors.includes(userId)) {
            isAssigned = true
            roleType = 'Executor'
            workCategory = 'Finished'
            teamSize = multiExecutors.length > 0 ? multiExecutors.length : 1
          }
          break
      }
      
      return { isAssigned, roleType, workCategory, teamSize }
    }
    
    for (const user of picUsers) {
      let activeWork = 0
      let pendingWork = 0
      let finishedWork = 0
      const assignedRequests: PICInvolvementMetrics['assignedRequests'] = []
      
      for (const request of requests) {
        const assignment = getWorkAssignment(request, user.id)
        
        if (assignment.isAssigned && assignment.roleType && assignment.workCategory) {
          // Count work categories
          if (assignment.workCategory === 'Active') {
            activeWork++
          } else if (assignment.workCategory === 'Pending') {
            pendingWork++
          } else if (assignment.workCategory === 'Finished') {
            finishedWork++
          }
          
          // Calculate deadline and overdue status
          const now = new Date()
          const createdAt = new Date(request.created_at)
          const deadline = request.adjusted_deadline || request.requested_deadline
          let isOverdue = false
          let daysCount = 0
          let daysUntilOverdue: number | null = null
          
          // Always calculate days since creation (consistent age display)
          daysCount = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24))
          
          // Calculate overdue status and days until overdue
          if (deadline && request.status !== 'Closed' && request.status !== 'Rejected') {
            const deadlineDate = new Date(deadline)
            const timeDiff = deadlineDate.getTime() - now.getTime()
            const daysDiff = Math.ceil(timeDiff / (1000 * 60 * 60 * 24))
            
            if (daysDiff < 0) {
              isOverdue = true
              daysUntilOverdue = null // Already overdue
            } else {
              daysUntilOverdue = daysDiff
            }
          }
          
          // Check if this request is focused for this user
          const isFocused = focusMap.get(user.id)?.has(request.id) || false
          
          // Add to assigned requests
          assignedRequests.push({
            requestId: request.id,
            subject: request.subject || 'No subject',
            status: request.status || 'Unknown',
            priority: request.priority || 'Medium',
            workCategory: assignment.workCategory,
            roleType: assignment.roleType,
            teamSize: assignment.teamSize,
            deadline: deadline || undefined,
            isOverdue,
            daysCount,
            daysUntilOverdue,
            isFocused
          })
        }
      }
      
      const totalAssigned = activeWork + pendingWork + finishedWork
      
      // Include user even if they have no assignments (for complete picture)
      involvementData.push({
        userId: user.id,
        userName: user.full_name || user.email,
        userRole: user.role,
        department: user.department || 'Unknown',
        totalAssigned,
        activeWork,
        pendingWork,
        finishedWork,
        assignedRequests
      })
      
      if (totalAssigned > 0) {
        console.log(`🔍 ${user.full_name}: ${totalAssigned} total (Active: ${activeWork}, Pending: ${pendingWork}, Finished: ${finishedWork})`)
      }
    }
    
    // Sort by total assigned work (descending)
    involvementData.sort((a, b) => b.totalAssigned - a.totalAssigned)
    
    console.log(`✅ PIC Involvement Analysis complete: ${involvementData.length} users processed`)
    return involvementData
    
  } catch (error) {
    console.error('❌ Error in getPICInvolvementData:', error)
    return []
  }
}

// =============================================================================
// REQUEST SUMMARY ANALYTICS FUNCTIONS
// =============================================================================

/**
 * Get request summary metrics for management dashboard
 * Filters requests by week and provides breakdown by status, requestor, and application
 * Now includes previous week comparison and all-time option
 */
export async function getRequestSummaryMetrics(weekStartDate: string): Promise<RequestSummaryMetrics> {
  try {
    const isAllTime = weekStartDate === 'all-time'
    console.log('🔍 Starting Request Summary Analysis for:', isAllTime ? 'all-time' : weekStartDate)
    
    // Get all requests and users
    const allRequestsResult = await getAllSystemRequests()
    const allUsersResult = await getUsers()
    const allApplicationsResult = await getApplications()
    
    if (!allRequestsResult.data || !allUsersResult.data || !allApplicationsResult.data) {
      console.log('❌ No data found for request summary analysis')
      return getEmptyRequestSummary(weekStartDate, isAllTime)
    }
    
    const allRequests = allRequestsResult.data
    const allUsers = allUsersResult.data
    const allApplications = allApplicationsResult.data
    
    // Generate available weeks (weeks that have requests)
    const availableWeeks = getAvailableWeeks(allRequests)
    
    let weekRequests: typeof allRequests
    let previousWeekRequests: typeof allRequests = []
    let previousWeekIncoming = 0
    let weekOverWeekChange = 0
    
    if (isAllTime) {
      weekRequests = allRequests
    } else {
      // Calculate week boundaries (Monday to Sunday)
      const weekStart = new Date(weekStartDate)
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 7)
      
      // Get previous week for comparison
      const previousWeekStart = new Date(weekStart)
      previousWeekStart.setDate(previousWeekStart.getDate() - 7)
      const previousWeekEnd = new Date(previousWeekStart)
      previousWeekEnd.setDate(previousWeekEnd.getDate() + 7)
      
      // Filter requests by week (based on created_at)
      weekRequests = allRequests.filter(request => {
        const requestDate = new Date(request.created_at)
        return requestDate >= weekStart && requestDate < weekEnd
      })
      
      previousWeekRequests = allRequests.filter(request => {
        const requestDate = new Date(request.created_at)
        return requestDate >= previousWeekStart && requestDate < previousWeekEnd
      })
      
      previousWeekIncoming = previousWeekRequests.length
      weekOverWeekChange = previousWeekIncoming > 0 ? 
        ((weekRequests.length - previousWeekIncoming) / previousWeekIncoming) * 100 : 0
    }
    
    console.log(`🔍 Found ${weekRequests.length} requests for analysis`)
    
    // Status breakdown for current period
    const statusBreakdown = calculateStatusBreakdown(weekRequests)
    const previousWeekStatusBreakdown = isAllTime ? undefined : calculateStatusBreakdown(previousWeekRequests)
    
    // Calculate completion rate and average time to complete
    const closedRequests = weekRequests.filter(r => r.status.toLowerCase() === 'closed')
    const completionRate = weekRequests.length > 0 ? (closedRequests.length / weekRequests.length) * 100 : 0
    
    let averageTimeToComplete: number | undefined
    if (closedRequests.length > 0) {
      const totalDays = closedRequests.reduce((sum, request) => {
        const createdDate = new Date(request.created_at)
        const closedDate = new Date(request.updated_at) // Using updated_at as proxy for closed date
        const daysDiff = Math.ceil((closedDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24))
        return sum + daysDiff
      }, 0)
      averageTimeToComplete = Math.round(totalDays / closedRequests.length)
    }
    
    // Requestor breakdown with percentages
    const requestorCounts = new Map<string, { name: string; department: string; count: number }>()
    weekRequests.forEach(request => {
      const requestorId = request.requestor_id
      const requestor = allUsers.find(u => u.id === requestorId)
      if (requestor) {
        if (!requestorCounts.has(requestorId)) {
          requestorCounts.set(requestorId, {
            name: requestor.full_name || requestor.email,
            department: requestor.department || 'Unknown',
            count: 0
          })
        }
        requestorCounts.get(requestorId)!.count++
      }
    })
    
    const requestorBreakdown = Array.from(requestorCounts.entries())
      .map(([requestorId, data]) => ({
        requestorId,
        requestorName: data.name,
        department: data.department,
        requestCount: data.count,
        percentageOfTotal: weekRequests.length > 0 ? (data.count / weekRequests.length) * 100 : 0
      }))
      .sort((a, b) => b.requestCount - a.requestCount) // Sort by count descending
    
    // Application breakdown with percentages
    const applicationCounts = new Map<string, { name: string; count: number }>()
    weekRequests.forEach(request => {
      const applicationId = request.application_id
      if (applicationId) {
        const application = allApplications.find(a => a.id === applicationId)
        if (application) {
          if (!applicationCounts.has(applicationId)) {
            applicationCounts.set(applicationId, {
              name: application.name,
              count: 0
            })
          }
          applicationCounts.get(applicationId)!.count++
        }
      } else {
        // New application requests
        const key = 'new_application'
        if (!applicationCounts.has(key)) {
          applicationCounts.set(key, {
            name: 'New Applications',
            count: 0
          })
        }
        applicationCounts.get(key)!.count++
      }
    })
    
    const applicationBreakdown = Array.from(applicationCounts.entries())
      .map(([applicationId, data]) => ({
        applicationId: applicationId === 'new_application' ? null : applicationId,
        applicationName: data.name,
        requestCount: data.count,
        percentageOfTotal: weekRequests.length > 0 ? (data.count / weekRequests.length) * 100 : 0
      }))
      .sort((a, b) => b.requestCount - a.requestCount) // Sort by count descending
    
    // Request type breakdown
    const requestTypeBreakdown = {
      enhancement: 0,
      new_application: 0,
      hardware: 0
    }
    
    weekRequests.forEach(request => {
      const type = request.request_type
      if (type in requestTypeBreakdown) {
        requestTypeBreakdown[type as keyof typeof requestTypeBreakdown]++
      }
    })
    
    const summary: RequestSummaryMetrics = {
      weekFilter: weekStartDate,
      isAllTime,
      totalIncoming: weekRequests.length,
      previousWeekIncoming: isAllTime ? undefined : previousWeekIncoming,
      weekOverWeekChange: isAllTime ? undefined : weekOverWeekChange,
      statusBreakdown,
      previousWeekStatusBreakdown,
      completionRate: Math.round(completionRate * 10) / 10, // Round to 1 decimal
      averageTimeToComplete,
      requestorBreakdown,
      applicationBreakdown,
      requestTypeBreakdown,
      availableWeeks
    }
    
    console.log(`✅ Request Summary Analysis complete:`, {
      totalIncoming: summary.totalIncoming,
      completionRate: summary.completionRate,
      weekOverWeekChange: summary.weekOverWeekChange,
      availableWeeks: summary.availableWeeks.length
    })
    
    return summary
    
  } catch (error) {
    console.error('❌ Error in getRequestSummaryMetrics:', error)
    return getEmptyRequestSummary(weekStartDate, weekStartDate === 'all-time')
  }
}

/**
 * Helper function to calculate status breakdown
 */
function calculateStatusBreakdown(requests: any[]) {
  const statusBreakdown = {
    ongoing: 0,
    finished: 0,
    rejected: 0,
    pending: 0
  }
  
  requests.forEach(request => {
    const status = request.status.toLowerCase()
    if (['in progress', 'code review', 'rework', 'pending uat', 'pending deployment'].includes(status)) {
      statusBreakdown.ongoing++
    } else if (status === 'closed') {
      statusBreakdown.finished++
    } else if (status === 'rejected') {
      statusBreakdown.rejected++
    } else {
      // New, Initial Analysis, Pending Assignment, Pending Clarification
      statusBreakdown.pending++
    }
  })
  
  return statusBreakdown
}

/**
 * Helper function to get available weeks that have requests
 */
function getAvailableWeeks(allRequests: any[]): Array<{weekStart: string, weekLabel: string, requestCount: number}> {
  const weekCounts = new Map<string, number>()
  
  // Group requests by week
  allRequests.forEach(request => {
    const requestDate = new Date(request.created_at)
    const weekStart = getWeekStart(requestDate)
    const weekKey = weekStart.toISOString().split('T')[0]
    weekCounts.set(weekKey, (weekCounts.get(weekKey) || 0) + 1)
  })
  
  // Convert to array and sort by date (newest first)
  const weeks = Array.from(weekCounts.entries())
    .map(([weekStart, count]) => {
      const date = new Date(weekStart)
      const today = new Date()
      const currentWeekStart = getWeekStart(today)
      
      let weekLabel: string
      if (weekStart === currentWeekStart.toISOString().split('T')[0]) {
        weekLabel = 'This Week'
      } else {
        const weeksDiff = Math.round((currentWeekStart.getTime() - date.getTime()) / (7 * 24 * 60 * 60 * 1000))
        if (weeksDiff === 1) {
          weekLabel = 'Last Week'
        } else if (weeksDiff > 1) {
          weekLabel = `${weeksDiff} Weeks Ago`
        } else {
          weekLabel = 'Future Week' // Edge case
        }
      }
      
      return {
        weekStart,
        weekLabel,
        requestCount: count
      }
    })
    .sort((a, b) => new Date(b.weekStart).getTime() - new Date(a.weekStart).getTime())
  
  // Always include current week even if no requests
  const currentWeekStart = getWeekStart(new Date()).toISOString().split('T')[0]
  if (!weeks.find(w => w.weekStart === currentWeekStart)) {
    weeks.unshift({
      weekStart: currentWeekStart,
      weekLabel: 'This Week',
      requestCount: 0
    })
  }
  
  return weeks
}

/**
 * Helper function to get week start (Monday)
 */
function getWeekStart(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Adjust when day is Sunday
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

/**
 * Helper function to return empty request summary metrics
 */
function getEmptyRequestSummary(weekStartDate: string, isAllTime: boolean = false): RequestSummaryMetrics {
  return {
    weekFilter: weekStartDate,
    isAllTime,
    totalIncoming: 0,
    completionRate: 0,
    statusBreakdown: {
      ongoing: 0,
      finished: 0,
      rejected: 0,
      pending: 0
    },
    requestorBreakdown: [],
    applicationBreakdown: [],
    requestTypeBreakdown: {
      enhancement: 0,
      new_application: 0,
      hardware: 0
    },
    availableWeeks: []
  }
}

// =============================================================================
// REQUESTOR-SPECIFIC ANALYTICS FUNCTIONS
// =============================================================================

/**
 * Analyzes request quality metrics for a requestor
 */
export function analyzeRequestorQuality(requests: RequestWithDetails[]): RequestorQualityMetrics {
  try {
    if (requests.length === 0) {
      return {
        clarificationRequestRate: 0,
        requirementCompletenessScore: 100,
        reworkDueToRequirements: 0,
        avgRequestDetailLength: 0,
        attachmentFrequency: 0
      }
    }

    // Count requests that needed clarification
    const clarificationRequests = requests.filter(req => {
      try {
        const clarifications = req.clarification_requests || []
        return Array.isArray(clarifications) && clarifications.length > 0
      } catch (error) {
        debugWarn('🔍 REQUESTOR QUALITY DEBUG: Error checking clarifications:', error)
        return false
      }
    })
    const clarificationRequestRate = (clarificationRequests.length / requests.length) * 100

    // Analyze description quality (length as proxy for detail)
    const avgRequestDetailLength = requests.reduce((sum, req) => {
      try {
        return sum + (req.description?.length || 0)
      } catch (error) {
        return sum
      }
    }, 0) / requests.length

    // Count requests with attachments (indicates thoroughness)
    const requestsWithAttachments = requests.filter(req => {
      try {
        return req.attachments && Array.isArray(req.attachments) && req.attachments.length > 0
      } catch (error) {
        return false
      }
    })
    const attachmentFrequency = (requestsWithAttachments.length / requests.length) * 100

    // Analyze rework due to requirements (heuristic: rework from Initial Analysis or early stages)
    const reworkDueToRequirements = requests.filter(req => {
      try {
        const workflowHistory = getSafeWorkflowHistory(req)
        return workflowHistory.some(entry => 
          entry.action === 'status_change' && 
          entry.to_status === 'Rework' &&
          (entry.from_status === 'Initial Analysis' || entry.from_status === 'Pending Assignment')
        )
      } catch (error) {
        return false
      }
    })
    const reworkDueToRequirementsRate = (reworkDueToRequirements.length / requests.length) * 100

    // Calculate requirement completeness score (inverse of problems)
    const problemRate = (clarificationRequestRate + reworkDueToRequirementsRate) / 2
    const requirementCompletenessScore = Math.max(0, 100 - problemRate)

    return {
      clarificationRequestRate,
      requirementCompletenessScore,
      reworkDueToRequirements: reworkDueToRequirementsRate,
      avgRequestDetailLength,
      attachmentFrequency
    }
  } catch (error) {
    debugError('🔍 REQUESTOR QUALITY DEBUG: Error analyzing requestor quality:', error)
    return {
      clarificationRequestRate: 0,
      requirementCompletenessScore: 0,
      reworkDueToRequirements: 0,
      avgRequestDetailLength: 0,
      attachmentFrequency: 0
    }
  }
}

/**
 * Analyzes UAT performance metrics for a requestor
 */
export function analyzeRequestorUAT(requests: RequestWithDetails[]): RequestorUATMetrics {
  try {
    const uatRequests = requests.filter(req => {
      try {
        const workflowHistory = getSafeWorkflowHistory(req)
        return workflowHistory.some(entry => entry.to_status === 'Pending UAT')
      } catch (error) {
        return false
      }
    })

    if (uatRequests.length === 0) {
      return {
        avgUATResponseTime: 0,
        uatApprovalRate: 100,
        feedbackQuality: 100,
        uatEngagement: 100,
        changeDuringUAT: 0
      }
    }

    let totalResponseTime = 0
    let responseCount = 0
    let approvedCount = 0
    let engagementCount = 0
    let changedDuringUAT = 0

    for (const request of uatRequests) {
      try {
        const workflowHistory = getSafeWorkflowHistory(request)
        
        // Find UAT entry and exit times
        const uatEntry = workflowHistory.find(entry => entry.to_status === 'Pending UAT')
        const uatExit = workflowHistory.find(entry => 
          entry.from_status === 'Pending UAT' && 
          new Date(entry.timestamp) > new Date(uatEntry?.timestamp || 0)
        )

        if (uatEntry && uatExit) {
          const responseTime = (new Date(uatExit.timestamp).getTime() - new Date(uatEntry.timestamp).getTime()) / (1000 * 60 * 60)
          if (!isNaN(responseTime) && responseTime > 0) {
            totalResponseTime += responseTime
            responseCount++
          }

          // Check if approved (went to Pending Deployment)
          if (uatExit.to_status === 'Pending Deployment') {
            approvedCount++
          }

          // Check if there were changes during UAT (comments or back-and-forth)
          const uatPeriodChanges = workflowHistory.filter(entry => {
            const entryTime = new Date(entry.timestamp).getTime()
            const uatStart = new Date(uatEntry.timestamp).getTime()
            const uatEnd = new Date(uatExit.timestamp).getTime()
            return entryTime >= uatStart && entryTime <= uatEnd && 
                   (entry.action === 'comment' || entry.to_status === 'Rework')
          })
          
          if (uatPeriodChanges.length > 0) {
            engagementCount++
            if (uatPeriodChanges.some(e => e.to_status === 'Rework')) {
              changedDuringUAT++
            }
          }
        }
      } catch (error) {
        debugWarn('🔍 REQUESTOR UAT DEBUG: Error analyzing UAT for request:', request.id, error)
      }
    }

    const avgUATResponseTime = responseCount > 0 ? totalResponseTime / responseCount : 0
    const uatApprovalRate = uatRequests.length > 0 ? (approvedCount / uatRequests.length) * 100 : 100
    const uatEngagement = uatRequests.length > 0 ? (engagementCount / uatRequests.length) * 100 : 100
    const changeDuringUAT = uatRequests.length > 0 ? (changedDuringUAT / uatRequests.length) * 100 : 0
    
    // Calculate feedback quality based on engagement and response time
    const feedbackQuality = Math.min(100, (uatEngagement * 0.7) + ((avgUATResponseTime < 24 ? 100 : Math.max(0, 100 - avgUATResponseTime)) * 0.3))

    return {
      avgUATResponseTime,
      uatApprovalRate,
      feedbackQuality,
      uatEngagement,
      changeDuringUAT
    }
  } catch (error) {
    debugError('🔍 REQUESTOR UAT DEBUG: Error analyzing requestor UAT:', error)
    return {
      avgUATResponseTime: 0,
      uatApprovalRate: 0,
      feedbackQuality: 0,
      uatEngagement: 0,
      changeDuringUAT: 0
    }
  }
}

/**
 * Analyzes business metrics for a requestor
 */
export function analyzeRequestorBusiness(requests: RequestWithDetails[]): RequestorBusinessMetrics {
  try {
    if (requests.length === 0) {
      return {
        requestFrequency: 0,
        priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
        deadlineAdherence: 100,
        businessImpactScore: 0,
        departmentCollaboration: 0
      }
    }

    // Calculate request frequency (requests per month)
    const now = new Date()
    const oldestRequest = requests.reduce((oldest, req) => {
      try {
        const reqDate = new Date(req.created_at)
        return reqDate < oldest ? reqDate : oldest
      } catch (error) {
        return oldest
      }
    }, now)
    
    const monthsSpan = Math.max(1, Math.ceil((now.getTime() - oldestRequest.getTime()) / (1000 * 60 * 60 * 24 * 30)))
    const requestFrequency = requests.length / monthsSpan

    // Analyze priority distribution
    const priorityDistribution = {
      critical: 0,
      high: 0,
      medium: 0,
      low: 0
    }
    
    requests.forEach(req => {
      try {
        const priority = req.priority?.toLowerCase() || 'medium'
        if (priority in priorityDistribution) {
          priorityDistribution[priority as keyof typeof priorityDistribution]++
        } else {
          priorityDistribution.medium++
        }
      } catch (error) {
        priorityDistribution.medium++
      }
    })

    // Convert to percentages
    Object.keys(priorityDistribution).forEach(key => {
      priorityDistribution[key as keyof typeof priorityDistribution] = 
        (priorityDistribution[key as keyof typeof priorityDistribution] / requests.length) * 100
    })

    // Analyze deadline adherence
    const requestsWithDeadlines = requests.filter(req => req.requested_deadline || req.adjusted_deadline)
    let metDeadlines = 0
    
    requestsWithDeadlines.forEach(req => {
      try {
        const deadline = new Date(req.adjusted_deadline || req.requested_deadline!)
        const completedDate = ['Closed', 'Rejected'].includes(req.status) ? 
          (req.workflow_history as any[])?.find(entry => ['Closed', 'Rejected'].includes(entry.to_status))?.timestamp :
          null
        
        if (completedDate && new Date(completedDate) <= deadline) {
          metDeadlines++
        }
      } catch (error) {
        // Skip this request
      }
    })
    
    const deadlineAdherence = requestsWithDeadlines.length > 0 ? 
      (metDeadlines / requestsWithDeadlines.length) * 100 : 100

    // Calculate business impact score based on priority and complexity
    const businessImpactScore = requests.reduce((sum, req) => {
      const priorityWeights = {
        critical: 4,
        high: 3,
        medium: 2,
        low: 1
      } as const
      
      const priorityWeight = priorityWeights[req.priority?.toLowerCase() as keyof typeof priorityWeights] || 2
      
      const complexityPoints = getRequestComplexityPoints(req)
      return sum + (priorityWeight * complexityPoints)
    }, 0) / Math.max(requests.length, 1)

    // Analyze department collaboration (requests affecting multiple departments - heuristic)
    const collaborationIndicators = requests.filter(req => {
      try {
        const description = req.description?.toLowerCase() || ''
        const hasMultipleDepts = description.includes('department') || 
                                description.includes('integration') ||
                                description.includes('cross-functional')
        return hasMultipleDepts
      } catch (error) {
        return false
      }
    })
    const departmentCollaboration = (collaborationIndicators.length / requests.length) * 100

    return {
      requestFrequency,
      priorityDistribution,
      deadlineAdherence,
      businessImpactScore,
      departmentCollaboration
    }
  } catch (error) {
    debugError('🔍 REQUESTOR BUSINESS DEBUG: Error analyzing requestor business metrics:', error)
    return {
      requestFrequency: 0,
      priorityDistribution: { critical: 0, high: 0, medium: 0, low: 0 },
      deadlineAdherence: 0,
      businessImpactScore: 0,
      departmentCollaboration: 0
    }
  }
}

/**
 * Gets comprehensive requestor performance metrics
 */
export async function getRequestorPerformanceMetrics(): Promise<RequestorPerformanceMetrics[]> {
  try {
    const allRequestsResult = await getAllSystemRequests()
    const allUsersResult = await getUsers()
    
    if (!allRequestsResult.data || !allUsersResult.data) {
      debugWarn('🔍 REQUESTOR METRICS DEBUG: No data available')
      return []
    }
    
    const requests = allRequestsResult.data
    
    // Find all users who actually act as requestors (regardless of their role field)
    const allActiveUsers = allUsersResult.data.filter(user => user.is_active !== false)
    const requestorUserIds = new Set(requests.map(r => r.requestor_id).filter(Boolean))
    const users = allActiveUsers.filter(u => requestorUserIds.has(u.id))
    
    debugLog('🔍 REQUESTOR METRICS DEBUG: Processing', users.length, 'actual requestors with', requests.length, 'total requests')
    
    const requestorMetrics: RequestorPerformanceMetrics[] = []
    
    for (const user of users) {
      try {
        // Get requests created by this requestor
        const userRequests = requests.filter(req => req.requestor_id === user.id)
        
        if (userRequests.length === 0) {
          // Include requestors with no requests but with basic info
          requestorMetrics.push({
            userId: user.id,
            userName: user.full_name,
            userRole: user.role,
            department: user.department || 'Unknown',
            totalRequests: 0,
            activeRequests: 0,
            completedRequests: 0,
            qualityMetrics: analyzeRequestorQuality([]),
            uatMetrics: analyzeRequestorUAT([]),
            businessMetrics: analyzeRequestorBusiness([]),
            businessImpactScore: 0,
            businessScoreBreakdown: {
              requestQuality: { score: 0, weight: 40 },
              uatPerformance: { score: 0, weight: 35 },
              businessValue: { score: 0, weight: 25 },
              totalScore: 0,
              formula: 'Request Quality (40%) + UAT Performance (35%) + Business Value (25%)'
            },
            performanceTrend: {
              direction: 'stable',
              changePercentage: 0,
              previousPeriodScore: 0,
              currentPeriodScore: 0,
              trendIcon: '═'
            },
            departmentRank: 1,
            overallRank: 1
          })
          continue
        }
        
        const totalRequests = userRequests.length
        const activeRequests = userRequests.filter(req => !['Closed', 'Rejected'].includes(req.status)).length
        const completedRequests = userRequests.filter(req => ['Closed', 'Rejected'].includes(req.status)).length
        
        // Analyze performance metrics
        const qualityMetrics = analyzeRequestorQuality(userRequests)
        const uatMetrics = analyzeRequestorUAT(userRequests)
        const businessMetrics = analyzeRequestorBusiness(userRequests)
        
        // Calculate composite business impact score
        const requestQualityScore = qualityMetrics.requirementCompletenessScore
        const uatPerformanceScore = (uatMetrics.uatApprovalRate + uatMetrics.feedbackQuality) / 2
        const businessValueScore = Math.min(100, businessMetrics.businessImpactScore * 10) // Scale to 0-100
        
        const businessImpactScore = Math.round(
          (requestQualityScore * 0.4) + 
          (uatPerformanceScore * 0.35) + 
          (businessValueScore * 0.25)
        )
        
        requestorMetrics.push({
          userId: user.id,
          userName: user.full_name,
          userRole: user.role,
          department: user.department || 'Unknown',
          totalRequests,
          activeRequests,
          completedRequests,
          qualityMetrics,
          uatMetrics,
          businessMetrics,
          businessImpactScore,
          businessScoreBreakdown: {
            requestQuality: { score: requestQualityScore, weight: 40 },
            uatPerformance: { score: uatPerformanceScore, weight: 35 },
            businessValue: { score: businessValueScore, weight: 25 },
            totalScore: businessImpactScore,
            formula: 'Request Quality (40%) + UAT Performance (35%) + Business Value (25%)'
          },
          performanceTrend: {
            direction: 'stable', // TODO: Calculate actual trend
            changePercentage: 0,
            previousPeriodScore: businessImpactScore,
            currentPeriodScore: businessImpactScore,
            trendIcon: '═'
          },
          departmentRank: 1, // TODO: Calculate actual ranking
          overallRank: 1
        })
        
        debugLog(`🔍 Calculated requestor metrics for ${user.full_name}: ${totalRequests} requests, ${businessImpactScore} score`)
        
      } catch (error) {
        debugError(`🔍 REQUESTOR METRICS DEBUG: Error calculating metrics for user ${user.id}:`, error)
      }
    }
    
    // Sort by business impact score and assign rankings
    const sortedMetrics = requestorMetrics.sort((a, b) => b.businessImpactScore - a.businessImpactScore)
    
    // Assign overall rankings
    sortedMetrics.forEach((metric, index) => {
      metric.overallRank = index + 1
    })
    
    // Calculate department rankings
    const departments = [...new Set(sortedMetrics.map(m => m.department))]
    departments.forEach(dept => {
      const deptMetrics = sortedMetrics.filter(m => m.department === dept)
        .sort((a, b) => b.businessImpactScore - a.businessImpactScore)
      
      deptMetrics.forEach((metric, index) => {
        metric.departmentRank = index + 1
      })
    })
    
    debugLog('🔍 REQUESTOR METRICS DEBUG: Calculated metrics for', requestorMetrics.length, 'requestors')
    
    return sortedMetrics
    
  } catch (error) {
    debugError('🔍 REQUESTOR METRICS DEBUG: Error getting requestor performance metrics:', error)
    return []
  }
}

export async function getSystemPerformanceOverview(): Promise<SystemPerformanceOverview> {
  try {
    const employeeMetrics = await getEmployeePerformanceMetrics()
    const allRequestsResult = await getAllSystemRequests()
    
    if (!allRequestsResult.data) {
      return getEmptySystemOverview()
    }
    
    // Calculate date ranges for comparison
    const now = new Date()
    const timeRanges = {
      week: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      month: new Date(now.getFullYear(), now.getMonth(), 1),
      quarter: new Date(now.getFullYear(), Math.floor(now.getMonth() / 3) * 3, 1),
      ytd: new Date(now.getFullYear(), 0, 1)
    }
    
    const requests = allRequestsResult.data
    
    // Calculate system-wide metrics using ALL requests, not just employee-assigned ones
    const totalActiveEmployees = employeeMetrics.filter(emp => emp.totalRequests > 0).length
    const totalRequests = requests.length // Use all requests for accurate total
    const totalCompletedRequests = requests.filter(r => ['Closed', 'Rejected'].includes(r.status)).length
    console.log('🔍 Analytics Debug - System metrics:', { 
      totalRequests, 
      totalCompletedRequests, 
      completionRate: (totalCompletedRequests / totalRequests * 100).toFixed(1) + '%',
      closedStatusCount: requests.filter(r => ['Closed', 'Rejected'].includes(r.status)).length,
      allStatuses: requests.reduce((acc, r) => { acc[r.status] = (acc[r.status] || 0) + 1; return acc; }, {} as Record<string, number>)
    })
    
    const avgSystemCompletionTime = employeeMetrics.length > 0 
      ? employeeMetrics.reduce((sum, emp) => sum + emp.averageCompletionTime, 0) / employeeMetrics.length 
      : 0
    
    const systemHealthScore = employeeMetrics.length > 0
      ? employeeMetrics.reduce((sum, emp) => sum + emp.performanceScore, 0) / employeeMetrics.length
      : 0
    
    // Calculate critical alerts with early-stage awareness
    const totalEarlyStageRequests = requests.filter(r => 
      ['New', 'Initial Analysis', 'Pending Assignment'].includes(r.status)
    ).length
    const isSystemEarlyStage = totalEarlyStageRequests / totalRequests > 0.8
    
    const criticalAlerts = employeeMetrics.reduce((count, emp) => {
      if (isSystemEarlyStage) {
        // Early-stage alerts: focus on assignment delays and stagnant requests
        return count + 
          (emp.totalRequests > 10 && emp.performanceScore < 30 ? 1 : 0) + // Very low activity
          (emp.overdueCount > 3 ? 1 : 0) + // Lower threshold for early stage
          (emp.totalRequests > 0 && emp.commentFrequency === 0 ? 1 : 0) // No communication
      } else {
        // Traditional alerts for mature systems
        return count + 
          (emp.overdueCount > 5 ? 1 : 0) +
          (emp.performanceScore < 50 ? 1 : 0) +
          (emp.reworkRate > 30 ? 1 : 0)
      }
    }, 0)
    
    // Calculate top bottlenecks (simplified)
    const topBottlenecks = [
      { stage: 'Code Review', avgTime: 2.5, count: totalRequests * 0.3 },
      { stage: 'Initial Analysis', avgTime: 3.2, count: totalRequests * 0.2 },
      { stage: 'UAT', avgTime: 4.1, count: totalRequests * 0.25 }
    ].sort((a, b) => b.avgTime - a.avgTime)
    
    // Department comparison
    const deptGroups = employeeMetrics.reduce((acc, emp) => {
      if (!acc[emp.department]) {
        acc[emp.department] = { scores: [], requests: 0 }
      }
      acc[emp.department].scores.push(emp.performanceScore)
      acc[emp.department].requests += emp.totalRequests
      return acc
    }, {} as Record<string, { scores: number[]; requests: number }>)
    
    const departmentComparison = Object.entries(deptGroups).map(([dept, data]) => ({
      department: dept,
      score: Math.round((data.scores.reduce((sum, score) => sum + score, 0) / data.scores.length) * 10) / 10,
      requests: data.requests
    })).sort((a, b) => b.score - a.score)
    
    // Calculate time filter summaries
    const timeFilters = {
      week: calculatePerformanceSummary(requests, timeRanges.week),
      month: calculatePerformanceSummary(requests, timeRanges.month),
      quarter: calculatePerformanceSummary(requests, timeRanges.quarter),
      ytd: calculatePerformanceSummary(requests, timeRanges.ytd)
    }
    
    return {
      totalActiveEmployees,
      totalRequests,
      avgSystemCompletionTime: Math.round(avgSystemCompletionTime * 10) / 10,
      systemHealthScore: Math.round(systemHealthScore * 10) / 10,
      criticalAlerts,
      topBottlenecks,
      departmentComparison,
      timeFilters
    }
    
  } catch (error) {
    console.error('Error in getSystemPerformanceOverview:', error)
    return getEmptySystemOverview()
  }
}

export async function getQualityMetrics(): Promise<QualityMetrics> {
  try {
    const allRequestsResult = await getAllSystemRequests()
    if (!allRequestsResult.data) {
      return getEmptyQualityMetrics()
    }
    
    const requests = allRequestsResult.data
    
    // Calculate quality metrics
    const totalRequests = requests.length
    
    // Rework analysis
    const reworkRequests = requests.filter(r => {
      const workflowHistory = r.workflow_history as any[]
      return workflowHistory?.some(entry => entry.status === 'Rework')
    })
    const totalReworks = reworkRequests.length
    const reworkRate = totalRequests > 0 ? (totalReworks / totalRequests) * 100 : 0
    
    // Calculate average rework cycles
    const reworkCycles = reworkRequests.map(r => {
      const workflowHistory = r.workflow_history as any[]
      return workflowHistory?.filter(entry => entry.status === 'Rework').length || 0
    })
    const avgReworkCycles = reworkCycles.length > 0 
      ? reworkCycles.reduce((sum, cycles) => sum + cycles, 0) / reworkCycles.length 
      : 0
    
    // UAT rejection analysis
    const uatRejectedRequests = requests.filter(r => {
      const workflowHistory = r.workflow_history as any[]
      return workflowHistory?.some(entry => 
        entry.status === 'Rework' && entry.previous_status === 'Pending UAT'
      )
    })
    const uatRejections = uatRejectedRequests.length
    const uatRejectionRate = totalRequests > 0 ? (uatRejections / totalRequests) * 100 : 0
    
    // Code review analysis (simplified)
    const codeReviewRequests = requests.filter(r => {
      const workflowHistory = r.workflow_history as any[]
      return workflowHistory?.some(entry => entry.status === 'Code Review')
    })
    const codeReviewCycles = codeReviewRequests.length
    const avgCodeReviewTime = 1.5 // placeholder - would calculate from workflow_history
    
    // Clarification requests
    const clarificationRequests = requests.filter(r => {
      const workflowHistory = r.workflow_history as any[]
      return workflowHistory?.some(entry => entry.status === 'Pending Clarification')
    }).length
    const clarificationRate = totalRequests > 0 ? (clarificationRequests / totalRequests) * 100 : 0
    
    // Top rework reasons (placeholder - would extract from workflow_history reasons)
    const topReworkReasons = [
      { reason: 'Requirements Clarification', count: Math.floor(totalReworks * 0.4) },
      { reason: 'Technical Issues', count: Math.floor(totalReworks * 0.3) },
      { reason: 'Quality Issues', count: Math.floor(totalReworks * 0.2) },
      { reason: 'Other', count: Math.floor(totalReworks * 0.1) }
    ].filter(r => r.count > 0)
    
    return {
      totalReworks,
      reworkRate: Math.round(reworkRate * 10) / 10,
      avgReworkCycles: Math.round(avgReworkCycles * 10) / 10,
      uatRejections,
      uatRejectionRate: Math.round(uatRejectionRate * 10) / 10,
      codeReviewCycles,
      avgCodeReviewTime,
      clarificationRequests,
      clarificationRate: Math.round(clarificationRate * 10) / 10,
      topReworkReasons
    }
    
  } catch (error) {
    console.error('Error in getQualityMetrics:', error)
    return getEmptyQualityMetrics()
  }
}

// Helper functions
function calculatePerformanceSummary(requests: any[], startDate: Date): PerformanceSummary {
  const filteredRequests = requests.filter(r => new Date(r.created_at) >= startDate)
  const totalRequests = filteredRequests.length
  const completedRequests = filteredRequests.filter(r => ['Closed', 'Rejected'].includes(r.status)).length
  
  console.log('🔍 Performance Summary:', {
    startDate: startDate.toISOString().split('T')[0],
    totalRequests,
    completedRequests,
    statuses: [...new Set(filteredRequests.map(r => r.status))]
  })
  
  const completionRate = totalRequests > 0 ? (completedRequests / totalRequests) * 100 : 0
  
  // Calculate average completion time
  const closedRequests = filteredRequests.filter(r => ['Closed', 'Rejected'].includes(r.status))
  let avgCompletionTime = 0
  if (closedRequests.length > 0) {
    const totalTime = closedRequests.reduce((sum, req) => {
      const created = new Date(req.created_at).getTime()
      const updated = new Date(req.updated_at).getTime()
      return sum + (updated - created)
    }, 0)
    avgCompletionTime = totalTime / closedRequests.length / (1000 * 60 * 60 * 24)
  }
  
  const now = new Date()
  const overdueCount = filteredRequests.filter(r => 
    r.adjusted_deadline && 
    new Date(r.adjusted_deadline) < now && 
    r.status !== 'Closed'
  ).length
  
  return {
    totalRequests,
    completedRequests,
    avgCompletionTime: Math.round(avgCompletionTime * 10) / 10,
    completionRate: Math.round(completionRate * 10) / 10,
    overdueCount
  }
}

function getEmptySystemOverview(): SystemPerformanceOverview {
  return {
    totalActiveEmployees: 0,
    totalRequests: 0,
    avgSystemCompletionTime: 0,
    systemHealthScore: 0,
    criticalAlerts: 0,
    topBottlenecks: [],
    departmentComparison: [],
    timeFilters: {
      week: { totalRequests: 0, completedRequests: 0, avgCompletionTime: 0, completionRate: 0, overdueCount: 0 },
      month: { totalRequests: 0, completedRequests: 0, avgCompletionTime: 0, completionRate: 0, overdueCount: 0 },
      quarter: { totalRequests: 0, completedRequests: 0, avgCompletionTime: 0, completionRate: 0, overdueCount: 0 },
      ytd: { totalRequests: 0, completedRequests: 0, avgCompletionTime: 0, completionRate: 0, overdueCount: 0 }
    }
  }
}

function getEmptyQualityMetrics(): QualityMetrics {
  return {
    totalReworks: 0,
    reworkRate: 0,
    avgReworkCycles: 0,
    uatRejections: 0,
    uatRejectionRate: 0,
    codeReviewCycles: 0,
    avgCodeReviewTime: 0,
    clarificationRequests: 0,
    clarificationRate: 0,
    topReworkReasons: []
  }
}

// Development Tools - Clear all request data
export async function clearAllRequestData() {
  try {
    // Safety check: Only allow in development environment
    if (process.env.NODE_ENV === 'production') {
      return { data: null, error: "Operation not allowed in production" }
    }

    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data mode - simulating data clear")
      return { 
        data: { 
          requests: 0, 
          comments: 0, 
          attachments: 0 
        }, 
        error: null 
      }
    }

    // Clear data in order respecting foreign key constraints
    console.log("🗑️ Clearing request_comments...")
    const { count: commentsCount, error: commentsError } = await supabaseAdmin
      .from("request_comments")
      .delete()
      .not('id', 'is', null) // Delete all rows

    if (commentsError) {
      console.error("Error clearing comments:", commentsError)
      return { data: null, error: "Failed to clear comments: " + commentsError.message }
    }

    console.log("🗑️ Clearing request_attachments...")
    const { count: attachmentsCount, error: attachmentsError } = await supabaseAdmin
      .from("request_attachments")
      .delete()
      .not('id', 'is', null) // Delete all rows

    if (attachmentsError) {
      console.error("Error clearing attachments:", attachmentsError)
      return { data: null, error: "Failed to clear attachments: " + attachmentsError.message }
    }

    console.log("🗑️ Clearing requests...")
    const { count: requestsCount, error: requestsError } = await supabaseAdmin
      .from("requests")
      .delete()
      .not('id', 'is', null) // Delete all rows

    if (requestsError) {
      console.error("Error clearing requests:", requestsError)
      return { data: null, error: "Failed to clear requests: " + requestsError.message }
    }

    const cleared = {
      requests: requestsCount || 0,
      comments: commentsCount || 0,
      attachments: attachmentsCount || 0
    }

    console.log("🗑️ Data clearing completed successfully:", cleared)
    
    return { data: cleared, error: null }
    
  } catch (error) {
    console.error("Error in clearAllRequestData:", error)
    return { data: null, error: "Unexpected error occurred" }
  }
}

// Attachment Management Functions
export async function uploadRequestAttachment(attachmentData: {
  request_id: string
  comment_id?: string | null
  filename: string
  file_path: string
  file_size: number
  content_type: string
  uploaded_by: string
}) {
  try {
    if (!supabaseAdmin) {
      // Return mock success for development
      return {
        data: {
          id: `mock_attachment_${Date.now()}`,
          ...attachmentData,
          created_at: new Date().toISOString()
        },
        error: null
      }
    }

    const { data, error } = await supabaseAdmin
      .from('request_attachments')
      .insert([attachmentData])
      .select()
      .single()

    if (error) {
      console.error('Database error uploading attachment:', error)
      return { data: null, error: error.message }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Error in uploadRequestAttachment:', error)
    return { data: null, error: 'Failed to upload attachment' }
  }
}

export async function getRequestAttachments(requestId: string) {
  try {
    if (!supabaseAdmin) {
      // Return mock attachments for development
      return []
    }

    const { data, error } = await supabaseAdmin
      .from('request_attachments')
      .select('*')
      .eq('request_id', requestId)
      .order('created_at', { ascending: false })

    if (error) {
      console.error('Database error getting attachments:', error)
      return []
    }

    return data || []
  } catch (error) {
    console.error('Error in getRequestAttachments:', error)
    return []
  }
}

export async function deleteAttachment(attachmentId: string) {
  try {
    if (!supabaseAdmin) {
      // Return mock success for development
      return { data: null, error: null }
    }

    const { error } = await supabaseAdmin
      .from('request_attachments')
      .delete()
      .eq('id', attachmentId)

    if (error) {
      console.error('Database error deleting attachment:', error)
      return { data: null, error: error.message }
    }

    return { data: null, error: null }
  } catch (error) {
    console.error('Error in deleteAttachment:', error)
    return { data: null, error: 'Failed to delete attachment' }
  }
}

export async function getAttachmentById(attachmentId: string) {
  try {
    if (!supabaseAdmin) {
      // Return mock attachment for development
      return null
    }

    const { data, error } = await supabaseAdmin
      .from('request_attachments')
      .select('*')
      .eq('id', attachmentId)
      .single()

    if (error) {
      console.error('Database error getting attachment:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('Error in getAttachmentById:', error)
    return null
  }
}

// Create new user account (admin only)
export async function createUser(userData: {
  email: string
  full_name: string
  password: string
  role: 'Requestor' | 'PIC' | 'Admin'
  department?: string
}) {
  try {
    const normalizedEmail = userData.email?.toLowerCase()?.trim()
    
    // If no Supabase client, return mock success
    if (!supabaseAdmin) {
      console.log("Using mock data for createUser - password provided:", userData.password ? "✓" : "✗")
      return {
        data: {
          id: `user-${Date.now()}-${Math.random().toString(36).substring(2)}`,
          email: normalizedEmail,
          full_name: userData.full_name,
          role: userData.role,
          department: userData.department || null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        },
        error: null,
      }
    }

    // Check if user already exists (case-insensitive)
    const { data: existingUser } = await supabaseAdmin
      .from('users')
      .select('id, email')
      .ilike('email', normalizedEmail)
      .single()

    if (existingUser) {
      return { 
        data: null, 
        error: `User with email ${normalizedEmail} already exists` 
      }
    }

    // Create user in auth (this would typically be done through Supabase Auth)
    // In a real implementation, we would use supabaseAdmin.auth.admin.createUser()
    // with the password to create the auth user, then create the profile
    // For now, we'll create directly in users table and log the password
    console.log(`Creating user ${normalizedEmail} with password: ${userData.password}`)
    
    const { data, error } = await supabaseAdmin
      .from('users')
      .insert([{
        email: normalizedEmail,
        full_name: userData.full_name,
        password: userData.password,
        role: userData.role,
        department: userData.department
      }])
      .select()
      .single()

    if (error) {
      console.error(`Failed to create user ${normalizedEmail}:`, error)
      return { 
        data: null, 
        error: error.message || `Database error: ${error.code || 'Unknown error'}` 
      }
    }

    return { data, error: null }
  } catch (error) {
    console.error("Error in createUser:", error)
    return { data: null, error: `Failed to create user: ${error}` }
  }
}


// Create request on behalf of another user (admin only)
export async function createRequestOnBehalf(requestData: {
  subject: string
  description: string
  application_id: string | null
  priority: string
  requested_deadline?: string
  request_type?: string
  proposed_application_name?: string | null
  requestor_email: string // Email of the user to create request for
}) {
  try {
    // Find the requestor user
    const requestor = await getUserByEmail(requestData.requestor_email)
    if (!requestor) {
      return { 
        data: null, 
        error: `Requestor with email ${requestData.requestor_email} not found` 
      }
    }

    // Create the request with the requestor's ID
    const result = await createRequest({
      subject: requestData.subject,
      description: requestData.description,
      application_id: requestData.application_id,
      priority: requestData.priority,
      request_type: requestData.request_type || 'enhancement',
      proposed_application_name: requestData.proposed_application_name,
      requested_deadline: requestData.requested_deadline,
      requestor_id: requestor.id
    })

    return result
  } catch (error) {
    console.error("Error in createRequestOnBehalf:", error)
    return { data: null, error: `Failed to create request: ${error}` }
  }
}

// Get user by email (helper function)
export async function getUserByEmail(email: string): Promise<UserRecord | null> {
  try {
    const normalizedEmail = email?.toLowerCase()?.trim()
    
    if (!supabaseAdmin) {
      // Return mock user for development using case-insensitive lookup
      const mockUser = findMockUserByEmail(normalizedEmail)
      if (mockUser) {
        return mockUser
      }
      
      // Return mock user if not found
      return {
        id: `user-${Date.now()}`,
        email: normalizedEmail,
        full_name: `Mock User (${normalizedEmail})`,
        password: "",
        role: 'Requestor' as const,
        department: null,
        skills: null,
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }
    }

    const { data, error } = await supabaseAdmin
      .from('users')
      .select('*')
      .ilike('email', normalizedEmail) // Case-insensitive comparison
      .single()

    if (error || !data) {
      return null
    }

    return data as UserRecord
  } catch (error) {
    console.error('Error in getUserByEmail:', error)
    return null
  }
}

export async function updateUserPassword(userId: string, newPassword: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      // Mock implementation for development
      console.log("Using mock data for updateUserPassword for user:", userId)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('users')
      .update({ password: newPassword, updated_at: new Date().toISOString() })
      .eq('id', userId)

    if (error) {
      console.error('Error updating user password:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in updateUserPassword:', error)
    return { success: false, error: 'Failed to update password' }
  }
}


// Bulk import functions
export async function bulkCreateUsers(users: Array<{
  email: string
  full_name: string
  password: string
  role: 'Requestor' | 'PIC' | 'Admin'
  department?: string
  departmentPermissions?: string[]
}>, currentUserId?: string) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const userData of users) {
    const result = await createUser(userData)
    if (result.error) {
      results.failed++
      const errorMessage = typeof (result as any).error === 'string' 
        ? (result as any).error 
        : (result.error as any)?.message || JSON.stringify((result as any).error)
      results.errors.push(`${userData.email}: ${errorMessage}`)
    } else {
      results.successful++
      
      // If user creation was successful and has department permissions, create them
      if (result.data?.id && userData.departmentPermissions && userData.departmentPermissions.length > 0) {
        try {
          // Create department permissions for the new user
          if (supabaseAdmin) {
            const permissionsToInsert = userData.departmentPermissions.map(dept => ({
              user_id: result.data.id,
              department: dept,
              created_by: currentUserId || result.data.id // Use current user if provided, otherwise new user
            }))

            const { error: permError } = await supabaseAdmin
              .from('department_permissions')
              .insert(permissionsToInsert)

            if (permError) {
              console.warn(`Created user ${userData.email} but failed to create department permissions:`, permError)
              results.errors.push(`${userData.email}: User created but department permissions failed - ${permError.message}`)
            }
          }
        } catch (permError) {
          console.warn(`Created user ${userData.email} but failed to create department permissions:`, permError)
          results.errors.push(`${userData.email}: User created but department permissions failed`)
        }
      }
    }
  }

  return results
}


export async function bulkCreateApplications(applications: Array<{
  name: string
  tech_lead_email: string
  description?: string
  context?: string
}>) {
  const results = {
    successful: 0,
    failed: 0,
    errors: [] as string[]
  }

  for (const appData of applications) {
    // Find tech lead by email (from users table)
    const techLead = await getUserByEmail(appData.tech_lead_email)
    if (!techLead) {
      results.failed++
      results.errors.push(`${appData.name}: Tech lead ${appData.tech_lead_email} not found`)
      continue
    }

    const result = await createApplication({
      name: appData.name,
      tech_lead_id: techLead.id,
      description: appData.description,
      context: appData.context
    })

    if (result.error) {
      results.failed++
      const errorMessage = typeof result.error === 'string' 
        ? result.error 
        : (result.error as any)?.message || JSON.stringify(result.error)
      results.errors.push(`${appData.name}: ${errorMessage}`)
    } else {
      results.successful++
    }
  }

  return results
}

// Workflow consistency validation functions
export interface WorkflowConsistencyReport {
  isValid: boolean
  errors: string[]
  warnings: string[]
  requestId: string
}

export function validateRequestTypeConsistency(request: RequestWithDetails): string[] {
  const errors: string[] = []
  
  // Validate request type vs application_id consistency
  if (request.request_type === 'enhancement' && !request.application_id) {
    errors.push("Enhancement requests must have an application_id")
  }
  
  if (request.request_type === 'new_application' && request.application_id) {
    errors.push("New application requests should not have an application_id")
  }
  
  if (request.request_type === 'new_application' && !request.proposed_application_name) {
    errors.push("New application requests must have a proposed_application_name")
  }
  
  if (request.request_type === 'enhancement' && request.proposed_application_name) {
    errors.push("Enhancement requests should not have a proposed_application_name")
  }
  
  // Validate status vs request type consistency
  if (request.request_type === 'enhancement' && request.status === 'New') {
    errors.push("Enhancement requests should not have 'New' status (should start with 'Initial Analysis')")
  }
  
  if (request.request_type === 'new_application' && request.status === 'Initial Analysis' && !request.tech_lead_id) {
    errors.push("New application requests in 'Initial Analysis' status must have a tech_lead_id assigned")
  }
  
  return errors
}

export function validateWorkflowConsistency(request: RequestWithDetails): WorkflowConsistencyReport {
  const report: WorkflowConsistencyReport = {
    isValid: true,
    errors: [],
    warnings: [],
    requestId: request.id
  }

  // Add request type consistency validation
  const typeErrors = validateRequestTypeConsistency(request)
  report.errors.push(...typeErrors)
  if (typeErrors.length > 0) {
    report.isValid = false
  }

  // Check if status is valid
  const validStatuses = [
    "New", "Initial Analysis", "Pending Assignment", "In Progress", 
    "Code Review", "Rework", "Pending UAT", "Pending Deployment", 
    "Pending Clarification", "Closed"
  ]
  
  if (!validStatuses.includes(request.status)) {
    report.errors.push(`Invalid status: ${request.status}`)
    report.isValid = false
  }

  // Check PIC assignments for current status
  const expectedPicId = getCurrentPicForStatus(request.status, request)
  
  if (expectedPicId && request.current_pic_id !== expectedPicId) {
    report.warnings.push(
      `PIC mismatch for status ${request.status}. Expected: ${expectedPicId}, Current: ${request.current_pic_id}`
    )
  }

  // Check required assignments based on status
  switch (request.status) {
    case "Initial Analysis":
    case "Code Review":
      if (!request.tech_lead_id) {
        report.errors.push("Tech Lead must be assigned for this status")
        report.isValid = false
      }
      break
    
    case "In Progress":
    case "Rework":
    case "Pending Deployment":
      if (!request.executor_id) {
        report.errors.push("Executor must be assigned for this status")
        report.isValid = false
      }
      break
    
    case "Pending UAT":
      if (!request.requestor_id) {
        report.errors.push("Requestor must be assigned for this status")
        report.isValid = false
      }
      break
  }

  // Check clarification status consistency
  if (request.status === "Pending Clarification") {
    if (!request.previous_status) {
      report.errors.push("Pending Clarification requests must have a previous status")
      report.isValid = false
    }
    
    const pendingClarifications = request.clarification_requests?.filter(c => c.status === "pending") || []
    if (pendingClarifications.length === 0) {
      report.warnings.push("No pending clarifications found for Pending Clarification status")
    }
  }

  // Check workflow history consistency
  if (!request.workflow_history || request.workflow_history.length === 0) {
    report.warnings.push("No workflow history found")
  } else {
    const lastEntry = request.workflow_history[request.workflow_history.length - 1]
    if (lastEntry.to_status !== request.status) {
      report.errors.push(
        `Last workflow history entry status (${lastEntry.to_status}) doesn't match current status (${request.status})`
      )
      report.isValid = false
    }
  }

  return report
}

export async function validateAllRequestsConsistency(): Promise<WorkflowConsistencyReport[]> {
  const reports: WorkflowConsistencyReport[] = []
  
  try {
    if (!supabaseAdmin) {
      console.warn("Supabase not available, using mock data for consistency validation")
      // Validate mock data for development
      for (const request of mockRequests) {
        const report = validateWorkflowConsistency(request as RequestWithDetails)
        reports.push(report)
      }
      return reports
    }

    // Use the existing getRequests function which handles relationships properly
    const allRequestsResult = await getAllSystemRequests()
    const requests = allRequestsResult.data

    if (!requests || requests.length === 0) {
      console.warn("No requests found for consistency validation")
      return reports
    }

    // Filter out closed requests for consistency checking
    const activeRequests = requests.filter(r => r.status !== 'Closed')

    for (const request of activeRequests) {
      // Check if the request has the required properties
      if (!request.id || typeof request.id !== 'string') {
        console.warn("Skipping invalid request data:", request)
        continue
      }
      
      // Validate that we have a proper RequestWithDetails object
      if (!request.requestor || !request.requestor.id) {
        console.warn(`Skipping request ${request.id} - missing requestor data`)
        reports.push({
          isValid: false,
          errors: ['Missing requestor data - possible database relationship issue'],
          warnings: [],
          requestId: request.id
        })
        continue
      }
      
      try {
        const report = validateWorkflowConsistency(request)
        reports.push(report)
      } catch (error) {
        console.error(`Error validating request ${request.id}:`, error)
        // Add a basic error report for this request
        reports.push({
          isValid: false,
          errors: ['Failed to validate request due to data structure issues'],
          warnings: [],
          requestId: request.id
        })
      }
    }
  } catch (error) {
    console.error("Error during consistency validation:", error)
  }

  return reports
}

// Helper function to get system health summary
export async function getSystemHealthSummary(): Promise<{
  totalRequests: number
  enhancementRequests: number
  newApplicationRequests: number
  validationErrors: number
  consistencyIssues: number
  requestsWithNewStatus: number
  requestsWithoutApplication: number
}> {
  try {
    let requests: RequestWithDetails[] = []
    
    if (!supabaseAdmin) {
      requests = mockRequests
    } else {
      const result = await getAllSystemRequests()
      requests = result.data || []
    }
    
    const validationReports = await validateAllRequestsConsistency()
    
    return {
      totalRequests: requests.length,
      enhancementRequests: requests.filter(r => r.request_type === 'enhancement').length,
      newApplicationRequests: requests.filter(r => r.request_type === 'new_application').length,
      validationErrors: validationReports.filter(r => !r.isValid).length,
      consistencyIssues: validationReports.reduce((sum, r) => sum + r.errors.length + r.warnings.length, 0),
      requestsWithNewStatus: requests.filter(r => r.status === 'New').length,
      requestsWithoutApplication: requests.filter(r => !r.application_id).length
    }
  } catch (error) {
    console.error("Error getting system health summary:", error)
    return {
      totalRequests: 0,
      enhancementRequests: 0,
      newApplicationRequests: 0,
      validationErrors: 0,
      consistencyIssues: 0,
      requestsWithNewStatus: 0,
      requestsWithoutApplication: 0
    }
  }
}

// System Settings CRUD Operations
// In-memory store for mock system settings (development mode)
let mockSystemSettings: Record<string, string> = {
  'ollama_api_url': 'http://localhost:11434',
  'default_ollama_model': 'llama2',
  'ai_system_prompt': 'You are an AI technical architect that provides specific implementation instructions for enhancing existing applications. (Legacy field for backward compatibility)',
  'ai_system_prompt_enhancement': 'You are an AI technical architect that provides specific implementation instructions for enhancing existing applications.',
  'ai_system_prompt_new_application': 'You are an AI system architect that designs complete technical blueprints for new application development.',
  'ai_system_prompt_management_applications': 'As Head of IT reporting to the CEO, analyze the following application data and provide executive-level insights: {contextData} Provide a concise CEO briefing with: 1. Business Impact Summary, 2. Application Health, 3. Resource Allocation, 4. Executive Decisions Needed. Keep responses high-level and business-focused.',
  'ai_system_prompt_management_new_requests': 'As Head of IT reporting to the CEO, analyze incoming requests and provide executive insights: {contextData} Provide a CEO briefing focusing on: 1. Business Demand Summary, 2. Strategic Implications, 3. Capacity Impact, 4. Business Risk Assessment. Focus on business impact and strategic alignment.',
  'ai_system_prompt_management_focus': 'As Head of IT reporting to the CEO, analyze our two-week focus priorities and provide executive guidance: {contextData} Provide a CEO briefing covering: 1. Focus Strategy Overview, 2. Progress Assessment, 3. Resource Deployment, 4. Executive Attention Required. Emphasize business outcomes and strategic impact.',
  'ai_enabled': 'true', // Default to true for easier testing
  'ai_timeout': '120000', // 2 minutes
  'ai_max_retries': '3',
  'ai_max_tokens': '100000', // 100k tokens
  'ollama_api_key': '',
  'is_open_webui': 'false',
  'is_openai_compatible': 'false'
}

export async function getSystemSetting(key: string): Promise<string | null> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Getting system setting ${key} = ${mockSystemSettings[key] || 'null'}`)
      return mockSystemSettings[key] || null
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('value')
      .eq('key', key)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      // Network errors (fetch failed, connection refused, etc.)
      if (error.message?.includes('fetch failed') || 
          error.message?.includes('ECONNREFUSED') ||
          error.message?.includes('ETIMEDOUT') ||
          error.message?.includes('ENETUNREACH')) {
        console.warn(`⚠️ Database connection issue for setting ${key}. Using mock data fallback.`)
        console.warn(`⚠️ Original error: ${error.message}`)
        // Fall back to mock data
        return mockSystemSettings[key] || null
      }
      console.error(`Error fetching system setting ${key}:`, error)
      return null
    }

    return (data?.value as string) || null
  } catch (error: any) {
    // Handle network/connection errors that throw exceptions
    if (error?.message?.includes('fetch failed') || 
        error?.message?.includes('ECONNREFUSED') ||
        error?.message?.includes('ETIMEDOUT') ||
        error?.message?.includes('ENETUNREACH') ||
        error?.message?.includes('getaddrinfo')) {
      console.warn(`⚠️ Database connection failed for setting ${key}. Using mock data fallback.`)
      console.warn(`⚠️ To use the database, ensure Supabase environment variables are correctly configured.`)
      // Fall back to mock data
      return mockSystemSettings[key] || null
    }
    console.error(`Error in getSystemSetting for key ${key}:`, error)
    return null
  }
}

export async function setSystemSetting(
  key: string, 
  value: string, 
  description?: string,
  isSensitive: boolean = false
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Setting system setting ${key} = ${isSensitive ? '[REDACTED]' : value}`)
      // Actually update the mock store
      mockSystemSettings[key] = value
      console.log(`📊 Mock: System setting ${key} updated successfully`)
      return { success: true }
    }

    // Try to update existing setting first
    const { data: existingData, error: selectError } = await supabaseAdmin
      .from('system_settings')
      .select('id')
      .eq('key', key)
      .single()

    if (selectError && selectError.code !== 'PGRST116') {
      console.error(`Error checking existing system setting ${key}:`, selectError)
      return { success: false, error: selectError.message }
    }

    if (existingData) {
      // Update existing setting
      const { error: updateError } = await supabaseAdmin
        .from('system_settings')
        .update({ 
          value, 
          description,
          is_sensitive: isSensitive,
          updated_at: new Date().toISOString()
        })
        .eq('key', key)

      if (updateError) {
        console.error(`Error updating system setting ${key}:`, updateError)
        return { success: false, error: updateError.message }
      }
    } else {
      // Insert new setting
      const { error: insertError } = await supabaseAdmin
        .from('system_settings')
        .insert([{
          key,
          value,
          description,
          is_sensitive: isSensitive
        }])

      if (insertError) {
        console.error(`Error inserting system setting ${key}:`, insertError)
        return { success: false, error: insertError.message }
      }
    }

    console.log(`System setting ${key} saved successfully`)
    return { success: true }
  } catch (error) {
    console.error(`Error in setSystemSetting for key ${key}:`, error)
    return { success: false, error: `Failed to save setting: ${error}` }
  }
}

export async function getAllSystemSettings(): Promise<Array<{
  id: string
  key: string
  value: string
  description: string | null
  is_sensitive: boolean
  created_at: string
  updated_at: string
}>> {
  try {
    if (!supabaseAdmin) {
      // Use dynamic mock system settings for development
      console.log("📊 Mock: getAllSystemSettings - Using dynamic mock store with", Object.keys(mockSystemSettings).length, "settings")
      
      // Create settings from current mock store
      const mockDescriptions: Record<string, string> = {
        'ollama_api_url': 'Ollama API base URL',
        'default_ollama_model': 'Default Ollama model for AI analysis',
        'ai_system_prompt': 'System prompt for AI analysis',
        'ai_enabled': 'Enable or disable AI analysis features',
        'ai_timeout': 'AI request timeout in milliseconds',
        'ai_max_retries': 'Maximum retry attempts for AI requests',
        'ollama_api_key': 'API key for Ollama service (if required)',
        'is_open_webui': 'Whether using Open WebUI interface',
        'is_openai_compatible': 'Whether API is OpenAI compatible'
      }
      
      return Object.entries(mockSystemSettings).map(([key, value], index) => ({
        id: `mock-${index + 1}`,
        key,
        value,
        description: mockDescriptions[key] || `Mock setting for ${key}`,
        is_sensitive: key.includes('key') || key.includes('password'),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
    }

    const { data, error } = await supabaseAdmin
      .from('system_settings')
      .select('*')
      .order('key')

    if (error) {
      console.error('Error fetching all system settings:', error)
      return []
    }

    return (data as Array<{
      id: string
      key: string
      value: string
      description: string | null
      is_sensitive: boolean
      created_at: string
      updated_at: string
    }>) || []
  } catch (error) {
    console.error('Error in getAllSystemSettings:', error)
    return []
  }
}

export async function deleteSystemSetting(key: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Deleting system setting ${key}`)
      // Actually delete from mock store
      delete mockSystemSettings[key]
      console.log(`📊 Mock: System setting ${key} deleted from mock store`)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('system_settings')
      .delete()
      .eq('key', key)

    if (error) {
      console.error(`Error deleting system setting ${key}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`System setting ${key} deleted successfully`)
    return { success: true }
  } catch (error) {
    console.error(`Error in deleteSystemSetting for key ${key}:`, error)
    return { success: false, error: `Failed to delete setting: ${error}` }
  }
}

// AI Analysis Storage and Retrieval
export async function saveAIAnalysis(
  requestId: string,
  analysisData: AIAnalysisData
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`Mock: Saving AI analysis for request ${requestId}`)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('requests')
      .update({ ai_analysis: analysisData })
      .eq('id', requestId)

    if (error) {
      console.error(`Error saving AI analysis for request ${requestId}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`AI analysis saved successfully for request ${requestId}`)
    return { success: true }
  } catch (error) {
    console.error(`Error in saveAIAnalysis for request ${requestId}:`, error)
    return { success: false, error: `Failed to save AI analysis: ${error}` }
  }
}

export async function getAIAnalysis(requestId: string): Promise<AIAnalysisData | null> {
  try {
    if (!supabaseAdmin) {
      console.log(`Mock: Getting AI analysis for request ${requestId}`)
      // Return mock AI analysis for development
      return {
        analysis_content: "Mock AI analysis content for development purposes.",
        model_used: "llama2",
        prompt_used: "Mock system prompt for testing",
        timestamp: new Date().toISOString(),
        complexity_score: 5,
        estimated_effort: "2-3 days",
        identified_risks: ["Mock risk 1", "Mock risk 2"],
        recommendations: ["Mock recommendation 1", "Mock recommendation 2"]
      }
    }

    const { data, error } = await supabaseAdmin
      .from('requests')
      .select('ai_analysis')
      .eq('id', requestId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') { // Not found
        return null
      }
      console.error(`Error fetching AI analysis for request ${requestId}:`, error)
      return null
    }

    return (data?.ai_analysis as AIAnalysisData) || null
  } catch (error) {
    console.error(`Error in getAIAnalysis for request ${requestId}:`, error)
    return null
  }
}

export async function updateAIAnalysisComments(
  requestId: string,
  techLeadComments: string
): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`Mock: Updating AI analysis comments for request ${requestId}`)
      return { success: true }
    }

    // Get current AI analysis
    const currentAnalysis = await getAIAnalysis(requestId)
    if (!currentAnalysis) {
      return { success: false, error: 'No AI analysis found for this request' }
    }

    // Update with tech lead comments
    const updatedAnalysis: AIAnalysisData = {
      ...currentAnalysis,
      tech_lead_comments: techLeadComments
    }

    const { error } = await supabaseAdmin
      .from('requests')
      .update({ ai_analysis: updatedAnalysis })
      .eq('id', requestId)

    if (error) {
      console.error(`Error updating AI analysis comments for request ${requestId}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`AI analysis comments updated successfully for request ${requestId}`)
    return { success: true }
  } catch (error) {
    console.error(`Error in updateAIAnalysisComments for request ${requestId}:`, error)
    return { success: false, error: `Failed to update AI analysis comments: ${error}` }
  }
}

export async function clearAIAnalysis(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`Mock: Clearing AI analysis for request ${requestId}`)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('requests')
      .update({ ai_analysis: null })
      .eq('id', requestId)

    if (error) {
      console.error(`Error clearing AI analysis for request ${requestId}:`, error)
      return { success: false, error: error.message }
    }

    console.log(`AI analysis cleared successfully for request ${requestId}`)
    return { success: true }
  } catch (error) {
    console.error(`Error in clearAIAnalysis for request ${requestId}:`, error)
    return { success: false, error: `Failed to clear AI analysis: ${error}` }
  }
}

// Helper function to get AI configuration
export async function getAIConfiguration(): Promise<{
  enabled: boolean
  apiUrl: string
  model: string
  systemPrompt: string
  systemPromptEnhancement?: string
  systemPromptNewApplication?: string
  systemPromptHardware?: string
  systemPromptManagementApplications?: string
  systemPromptManagementNewRequests?: string
  systemPromptManagementFocus?: string
  timeout: number
  maxRetries: number
  maxTokens: number
  apiKey?: string
  isOpenWebUI: boolean
  isOpenAICompatible: boolean
}> {
  try {
    console.log("📊 Database: getAIConfiguration - Loading AI settings from storage")
    console.log("📊 Database: Using", supabaseAdmin ? "Supabase database" : "mock data")
    
    // Use Promise.allSettled to handle individual failures gracefully
    const results = await Promise.allSettled([
      getSystemSetting('ai_enabled'),
      getSystemSetting('ollama_api_url'),
      getSystemSetting('default_ollama_model'),
      getSystemSetting('ai_system_prompt'),
      getSystemSetting('ai_system_prompt_enhancement'),
      getSystemSetting('ai_system_prompt_new_application'),
      getSystemSetting('ai_system_prompt_hardware'),
      getSystemSetting('ai_system_prompt_management_applications'),
      getSystemSetting('ai_system_prompt_management_new_requests'),
      getSystemSetting('ai_system_prompt_management_focus'),
      getSystemSetting('ai_timeout'),
      getSystemSetting('ai_max_retries'),
      getSystemSetting('ai_max_tokens'),
      getSystemSetting('ollama_api_key'),
      getSystemSetting('is_open_webui'),
      getSystemSetting('is_openai_compatible')
    ])
    
    // Extract values with fallbacks
    const [enabled, apiUrl, model, systemPrompt, systemPromptEnhancement, systemPromptNewApplication, systemPromptHardware, systemPromptManagementApplications, systemPromptManagementNewRequests, systemPromptManagementFocus, timeout, maxRetries, maxTokens, apiKey, isOpenWebUI, isOpenAICompatible] = results.map((result, index) => {
      if (result.status === 'fulfilled') {
        return result.value
      } else {
        const keys = ['ai_enabled', 'ollama_api_url', 'default_ollama_model', 'ai_system_prompt', 'ai_system_prompt_enhancement', 'ai_system_prompt_new_application', 'ai_system_prompt_hardware', 'ai_system_prompt_management_applications', 'ai_system_prompt_management_new_requests', 'ai_system_prompt_management_focus', 'ai_timeout', 'ai_max_retries', 'ai_max_tokens', 'ollama_api_key', 'is_open_webui', 'is_openai_compatible']
        console.warn(`⚠️ Failed to load setting ${keys[index]}, using default`)
        return null
      }
    })

    const config = {
      enabled: enabled === 'true',
      apiUrl: apiUrl || 'http://localhost:11434',
      model: model || 'llama2',
      systemPrompt: systemPrompt || 'You are an AI assistant that analyzes software requests. Provide detailed analysis including complexity, risks, and recommendations.',
      systemPromptEnhancement: systemPromptEnhancement || undefined,
      systemPromptNewApplication: systemPromptNewApplication || undefined,
      systemPromptHardware: systemPromptHardware || undefined,
      systemPromptManagementApplications: systemPromptManagementApplications || undefined,
      systemPromptManagementNewRequests: systemPromptManagementNewRequests || undefined,
      systemPromptManagementFocus: systemPromptManagementFocus || undefined,
      timeout: parseInt(timeout || '120000'),
      maxRetries: parseInt(maxRetries || '3'),
      maxTokens: parseInt(maxTokens || '100000'),
      apiKey: apiKey || undefined,
      isOpenWebUI: isOpenWebUI === 'true',
      isOpenAICompatible: isOpenAICompatible === 'true'
    }
    
    console.log("📊 Database: getAIConfiguration - Loaded config:", {
      enabled: config.enabled,
      apiUrl: config.apiUrl,
      model: config.model,
      timeout: config.timeout,
      maxRetries: config.maxRetries,
      maxTokens: config.maxTokens,
      isOpenWebUI: config.isOpenWebUI,
      isOpenAICompatible: config.isOpenAICompatible,
      usingMockData: !supabaseAdmin || supabaseConnectionStatus === 'disconnected'
    })
    
    return config
  } catch (error: any) {
    console.error('📊 Database: Error getting AI configuration:', error?.message || error)
    console.warn('📊 Database: Returning default AI configuration due to error')
    // Return default config with mock data indication
    return {
      enabled: mockSystemSettings['ai_enabled'] === 'true',
      apiUrl: mockSystemSettings['ollama_api_url'] || 'http://localhost:11434',
      model: mockSystemSettings['default_ollama_model'] || 'llama2',
      systemPrompt: mockSystemSettings['ai_system_prompt'] || 'You are an AI technical architect that provides specific implementation instructions for enhancing existing applications.',
      systemPromptEnhancement: mockSystemSettings['ai_system_prompt_enhancement'] || undefined,
      systemPromptNewApplication: mockSystemSettings['ai_system_prompt_new_application'] || undefined,
      systemPromptHardware: mockSystemSettings['ai_system_prompt_hardware'] || undefined,
      systemPromptManagementApplications: mockSystemSettings['ai_system_prompt_management_applications'] || undefined,
      systemPromptManagementNewRequests: mockSystemSettings['ai_system_prompt_management_new_requests'] || undefined,
      systemPromptManagementFocus: mockSystemSettings['ai_system_prompt_management_focus'] || undefined,
      timeout: parseInt(mockSystemSettings['ai_timeout'] || '120000'),
      maxRetries: parseInt(mockSystemSettings['ai_max_retries'] || '3'),
      maxTokens: parseInt(mockSystemSettings['ai_max_tokens'] || '100000'),
      isOpenWebUI: mockSystemSettings['is_open_webui'] === 'true',
      isOpenAICompatible: mockSystemSettings['is_openai_compatible'] === 'true'
    }
  }
}

// =============================================================================
// MULTI-EXECUTOR FUNCTIONS
// =============================================================================

export interface RequestExecutor {
  id: string
  request_id: string
  user_id: string
  assigned_at: string
  assigned_by: string | null
  task_status: 'pending' | 'completed'
  completed_at: string | null
  completed_by: string | null
  notes: string | null
  created_at: string
  updated_at: string
  // Joined fields from users table
  executor_name?: string
  executor_email?: string
  executor_department?: string
  executor_skills?: string[]
}

export async function assignExecutors(
  requestId: string, 
  executorIds: string[], 
  assignedBy: string
): Promise<{ data: RequestExecutor[] | null; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Assigning ${executorIds.length} executors to request ${requestId}`)
      const mockExecutors: RequestExecutor[] = executorIds.map((executorId, index) => ({
        id: `mock-executor-${Date.now()}-${index}`,
        request_id: requestId,
        user_id: executorId,
        assigned_at: new Date().toISOString(),
        assigned_by: assignedBy,
        task_status: 'pending' as const,
        completed_at: null,
        completed_by: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        executor_name: `Mock Executor ${index + 1}`,
        executor_email: `executor${index + 1}@example.com`,
        executor_department: 'Development',
        executor_skills: ['JavaScript', 'React']
      }))
      return { data: mockExecutors, error: null }
    }

    // First, clear any existing executors for this request
    await supabaseAdmin
      .from('request_executors')
      .delete()
      .eq('request_id', requestId.toLowerCase().trim())

    // Insert new executor assignments with normalized UUIDs
    const executorData = executorIds.map(executorId => ({
      request_id: requestId.toLowerCase().trim(),
      user_id: executorId.toLowerCase().trim(),
      assigned_by: assignedBy.toLowerCase().trim(),
      task_status: 'pending' as const
    }))
    
    console.log('🔍 ASSIGN_EXECUTORS: About to insert executor data:', executorData)
    console.log('🔍 ASSIGN_EXECUTORS: requestId:', requestId, '→', requestId.toLowerCase().trim())
    console.log('🔍 ASSIGN_EXECUTORS: executorIds:', executorIds, '→', executorIds.map(id => id.toLowerCase().trim()))
    console.log('🔍 ASSIGN_EXECUTORS: assignedBy:', assignedBy, '→', assignedBy.toLowerCase().trim())

    const { data, error } = await supabaseAdmin
      .from('request_executors')
      .insert(executorData)
      .select(`
        *,
        users!request_executors_user_id_fkey (
          full_name,
          email,
          department,
          skills
        )
      `)

    console.log('🔍 ASSIGN_EXECUTORS: Insert result data:', data)
    console.log('🔍 ASSIGN_EXECUTORS: Insert result error:', error)

    if (error) {
      console.error('🔴 ASSIGN_EXECUTORS: Error assigning executors:', error)
      return { data: null, error: error.message }
    }

    // Transform the data to match our interface
    const transformedData: RequestExecutor[] = (data as any[]).map(item => ({
      id: item.id,
      request_id: item.request_id,
      user_id: item.user_id,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      task_status: item.task_status,
      completed_at: item.completed_at,
      completed_by: item.completed_by,
      notes: item.notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
      executor_name: item.users?.full_name,
      executor_email: item.users?.email,
      executor_department: item.users?.department,
      executor_skills: item.users?.skills
    }))

    // Verify the assignments were created correctly
    console.log('🔍 ASSIGN_EXECUTORS: Verifying assignments...')
    const { data: verifyData, error: verifyError } = await supabaseAdmin
      .from('request_executors')
      .select('*')
      .eq('request_id', requestId.toLowerCase().trim())
    
    console.log('🔍 ASSIGN_EXECUTORS: Verification result:', verifyData)
    console.log('🔍 ASSIGN_EXECUTORS: Verification error:', verifyError)

    return { data: transformedData, error: null }
  } catch (error) {
    console.error('Error in assignExecutors:', error)
    return { data: null, error: `Failed to assign executors: ${error}` }
  }
}

export async function updateExecutorAssignments(
  requestId: string, 
  newExecutorIds: string[], 
  adminId: string
): Promise<{ data: RequestExecutor[] | null; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Updating executors for request ${requestId} with ${newExecutorIds.length} new executors`)
      const mockExecutors: RequestExecutor[] = newExecutorIds.map((executorId, index) => ({
        id: `mock-updated-executor-${Date.now()}-${index}`,
        request_id: requestId,
        user_id: executorId,
        assigned_at: new Date().toISOString(),
        assigned_by: adminId,
        task_status: 'pending' as const,
        completed_at: null,
        completed_by: null,
        notes: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        executor_name: `Mock Updated Executor ${index + 1}`,
        executor_email: `executor${index + 1}@example.com`,
        executor_department: 'Development',
        executor_skills: ['JavaScript', 'React']
      }))
      return { data: mockExecutors, error: null }
    }

    // First, clear any existing executors for this request
    await supabaseAdmin
      .from('request_executors')
      .delete()
      .eq('request_id', requestId.toLowerCase().trim())

    // Insert new executor assignments with normalized UUIDs
    const executorData = newExecutorIds.map(executorId => ({
      request_id: requestId.toLowerCase().trim(),
      user_id: executorId.toLowerCase().trim(),
      assigned_by: adminId.toLowerCase().trim(),
      task_status: 'pending' as const
    }))

    const { data, error } = await supabaseAdmin
      .from('request_executors')
      .insert(executorData)
      .select(`
        *,
        users!request_executors_user_id_fkey (
          full_name,
          email,
          department,
          skills
        )
      `)

    if (error) {
      console.error('Error updating executor assignments:', error)
      return { data: null, error: error.message }
    }

    // Transform the data to match our interface
    const transformedData: RequestExecutor[] = (data as any[]).map(item => ({
      id: item.id,
      request_id: item.request_id,
      user_id: item.user_id,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      task_status: item.task_status,
      completed_at: item.completed_at,
      completed_by: item.completed_by,
      notes: item.notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
      executor_name: item.users?.full_name,
      executor_email: item.users?.email,
      executor_department: item.users?.department,
      executor_skills: item.users?.skills
    }))

    // Update legacy executor_id field for backward compatibility
    // Set to first executor if only one, otherwise null
    const legacyExecutorId = newExecutorIds.length === 1 ? newExecutorIds[0] : null
    
    await supabaseAdmin
      .from('requests')
      .update({ executor_id: legacyExecutorId })
      .eq('id', requestId)

    return { data: transformedData, error: null }
  } catch (error) {
    console.error('Error in updateExecutorAssignments:', error)
    return { data: null, error: `Failed to update executor assignments: ${error}` }
  }
}

export async function getRequestExecutors(requestId: string): Promise<{ data: RequestExecutor[] | null; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Getting executors for request ${requestId}`)
      const mockExecutors: RequestExecutor[] = [
        {
          id: `mock-executor-1`,
          request_id: requestId,
          user_id: 'mock-user-1',
          assigned_at: new Date().toISOString(),
          assigned_by: 'mock-admin',
          task_status: 'pending',
          completed_at: null,
          completed_by: null,
          notes: null,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
          executor_name: 'Mock Executor 1',
          executor_email: 'executor1@example.com',
          executor_department: 'Development',
          executor_skills: ['JavaScript', 'React']
        }
      ]
      return { data: mockExecutors, error: null }
    }

    const { data, error } = await supabaseAdmin
      .from('request_executors')
      .select(`
        *,
        users!request_executors_user_id_fkey (
          full_name,
          email,
          department,
          skills
        )
      `)
      .eq('request_id', requestId.toLowerCase().trim())
      .order('assigned_at', { ascending: true })

    if (error) {
      console.error('Error getting request executors:', error)
      return { data: null, error: error.message }
    }

    // Transform the data to match our interface
    const transformedData: RequestExecutor[] = (data as any[]).map(item => ({
      id: item.id,
      request_id: item.request_id,
      user_id: item.user_id,
      assigned_at: item.assigned_at,
      assigned_by: item.assigned_by,
      task_status: item.task_status,
      completed_at: item.completed_at,
      completed_by: item.completed_by,
      notes: item.notes,
      created_at: item.created_at,
      updated_at: item.updated_at,
      executor_name: item.users?.full_name,
      executor_email: item.users?.email,
      executor_department: item.users?.department,
      executor_skills: item.users?.skills
    }))

    return { data: transformedData, error: null }
  } catch (error) {
    console.error('Error in getRequestExecutors:', error)
    return { data: null, error: `Failed to get request executors: ${error}` }
  }
}

export async function completeExecutorTask(
  requestId: string,
  userId: string,
  notes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    // Normalize UUIDs to lowercase for consistent comparison
    const normalizedRequestId = requestId.toLowerCase().trim()
    const normalizedUserId = userId.toLowerCase().trim()
    
    console.log('🔍 COMPLETE_EXECUTOR_TASK: Starting completion')
    console.log('🔍 COMPLETE_EXECUTOR_TASK: normalizedRequestId:', normalizedRequestId)
    console.log('🔍 COMPLETE_EXECUTOR_TASK: normalizedUserId:', normalizedUserId)
    
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Marking task complete for user ${normalizedUserId} on request ${normalizedRequestId}`)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('request_executors')
      .update({
        task_status: 'completed',
        completed_at: new Date().toISOString(),
        completed_by: normalizedUserId,
        notes: notes || null
      })
      .eq('request_id', normalizedRequestId)
      .eq('user_id', normalizedUserId)

    if (error) {
      console.error('🔴 COMPLETE_EXECUTOR_TASK: Error completing task:', error)
      return { success: false, error: error.message }
    }

    console.log('✅ COMPLETE_EXECUTOR_TASK: Task marked as complete successfully')
    return { success: true }
  } catch (error) {
    console.error('🔴 COMPLETE_EXECUTOR_TASK: Exception:', error)
    return { success: false, error: `Failed to complete task: ${error}` }
  }
}

export async function areAllExecutorsComplete(requestId: string): Promise<{ allComplete: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Checking if all executors are complete for request ${requestId}`)
      return { allComplete: true }
    }

    const { data: executors, error } = await supabaseAdmin
      .from('request_executors')
      .select('task_status')
      .eq('request_id', requestId.toLowerCase().trim())

    if (error) {
      console.error('Error checking executor completion:', error)
      return { allComplete: false, error: error.message }
    }

    if (!executors || executors.length === 0) {
      // No executors assigned yet, consider complete (fallback to single executor mode)
      return { allComplete: true }
    }

    const allComplete = executors.every(executor => executor.task_status === 'completed')
    return { allComplete }
  } catch (error) {
    console.error('Error in areAllExecutorsComplete:', error)
    return { allComplete: false, error: `Failed to check completion status: ${error}` }
  }
}

export async function getExecutorTaskStatus(requestId: string, userId: string): Promise<{ status: 'pending' | 'completed' | 'not_assigned'; error?: string }> {
  try {
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: Starting check')
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: requestId:', requestId)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: userId:', userId)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: userId type:', typeof userId)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: userId length:', userId.length)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: userId chars:', userId.split('').map(c => `${c}(${c.charCodeAt(0)})`).join(''))
    
    // Normalize UUIDs to lowercase for consistent comparison
    const normalizedRequestId = requestId.toLowerCase().trim()
    const normalizedUserId = userId.toLowerCase().trim()
    
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: normalizedRequestId:', normalizedRequestId)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: normalizedUserId:', normalizedUserId)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: normalized length:', normalizedUserId.length)
    
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Getting task status for user ${normalizedUserId} on request ${normalizedRequestId}`)
      return { status: 'pending' }
    }

    // First, let's check what exists in the request_executors table for this request
    const { data: allExecutors, error: allError } = await supabaseAdmin
      .from('request_executors')
      .select('*')
      .eq('request_id', normalizedRequestId)
    
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: All executors for this request:', allExecutors)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: All executors error:', allError)
    
    // If we have executors, check if any match our user ID (case-insensitive)
    if (allExecutors && allExecutors.length > 0) {
      const matchingExecutor = allExecutors.find(exec => 
        (exec.user_id as string).toLowerCase() === normalizedUserId
      )
      console.log('🔍 GET_EXECUTOR_TASK_STATUS: Matching executor found:', matchingExecutor)
      
      if (!matchingExecutor) {
        console.log('🔴 GET_EXECUTOR_TASK_STATUS: No matching executor found in list')
        console.log('🔴 GET_EXECUTOR_TASK_STATUS: Available user_ids:', allExecutors.map(e => ({
          user_id: e.user_id,
          normalized: (e.user_id as string).toLowerCase(),
          length: (e.user_id as string).length,
          matches: (e.user_id as string).toLowerCase() === normalizedUserId
        })))
        console.log('🔴 GET_EXECUTOR_TASK_STATUS: Looking for normalized:', normalizedUserId)
        return { status: 'not_assigned' }
      }
    }

    const { data, error } = await supabaseAdmin
      .from('request_executors')
      .select('task_status')
      .eq('request_id', normalizedRequestId)
      .eq('user_id', normalizedUserId)
      .single()

    console.log('🔍 GET_EXECUTOR_TASK_STATUS: Query result data:', data)
    console.log('🔍 GET_EXECUTOR_TASK_STATUS: Query result error:', error)

    if (error) {
      if (error.code === 'PGRST116') {
        // No matching row found - check legacy single executor_id field as fallback
        console.log('🔴 GET_EXECUTOR_TASK_STATUS: No matching row found (PGRST116)')
        console.log('🔍 GET_EXECUTOR_TASK_STATUS: Checking legacy executor_id field...')
        
        const { data: request, error: requestError } = await supabaseAdmin
          .from('requests')
          .select('executor_id')
          .eq('id', normalizedRequestId)
          .single()
        
        console.log('🔍 GET_EXECUTOR_TASK_STATUS: Legacy check - request data:', request)
        console.log('🔍 GET_EXECUTOR_TASK_STATUS: Legacy check - request error:', requestError)
        
        if (request && request.executor_id && (request.executor_id as string).toLowerCase() === normalizedUserId) {
          console.log('✅ GET_EXECUTOR_TASK_STATUS: User is assigned via legacy executor_id')
          // Create a request_executors entry for backward compatibility
          const { error: insertError } = await supabaseAdmin
            .from('request_executors')
            .insert({
              request_id: normalizedRequestId,
              user_id: normalizedUserId,
              assigned_by: normalizedUserId, // Self-assigned for legacy compatibility
              task_status: 'pending'
            })
          
          if (!insertError) {
            console.log('✅ GET_EXECUTOR_TASK_STATUS: Created request_executors entry for legacy executor')
            return { status: 'pending' }
          }
          console.log('⚠️ GET_EXECUTOR_TASK_STATUS: Failed to create request_executors entry:', insertError)
          return { status: 'pending' } // Still return pending since they are the executor
        }
        
        return { status: 'not_assigned' }
      }
      console.error('🔴 GET_EXECUTOR_TASK_STATUS: Database error:', error)
      return { status: 'not_assigned', error: error.message }
    }

    console.log('🚀 GET_EXECUTOR_TASK_STATUS: Success, returning status:', data.task_status)
    return { status: data.task_status as 'pending' | 'completed' }
  } catch (error) {
    console.error('🔴 GET_EXECUTOR_TASK_STATUS: Exception:', error)
    return { status: 'not_assigned', error: `Failed to get task status: ${error}` }
  }
}

export async function resetExecutorTasks(requestId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Resetting executor tasks for request ${requestId}`)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('request_executors')
      .update({
        task_status: 'pending',
        completed_at: null,
        completed_by: null,
        notes: null
      })
      .eq('request_id', requestId.toLowerCase().trim())

    if (error) {
      console.error('Error resetting executor tasks:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in resetExecutorTasks:', error)
    return { success: false, error: `Failed to reset executor tasks: ${error}` }
  }
}

export async function removeExecutor(requestId: string, userId: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Removing executor ${userId} from request ${requestId}`)
      return { success: true }
    }

    const { error } = await supabaseAdmin
      .from('request_executors')
      .delete()
      .eq('request_id', requestId.toLowerCase().trim())
      .eq('user_id', userId.toLowerCase().trim())

    if (error) {
      console.error('Error removing executor:', error)
      return { success: false, error: error.message }
    }

    return { success: true }
  } catch (error) {
    console.error('Error in removeExecutor:', error)
    return { success: false, error: `Failed to remove executor: ${error}` }
  }
}

// Helper function to validate and normalize UUIDs
export function normalizeUUID(uuid: string | null | undefined): string | null {
  if (!uuid) return null
  
  // Remove any whitespace and convert to lowercase
  const normalized = uuid.trim().toLowerCase()
  
  // Validate UUID format (basic check)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/
  if (!uuidRegex.test(normalized)) {
    console.warn('⚠️ NORMALIZE_UUID: Invalid UUID format:', uuid)
    return null
  }
  
  return normalized
}

// DEBUG: Function to verify multi-executor assignments in database
export async function debugRequestExecutors(requestId?: string): Promise<{ data: any[] | null; error: string | null }> {
  try {
    if (!supabaseAdmin) {
      return { data: null, error: "No Supabase client available" };
    }

    let query = supabaseAdmin
      .from('request_executors')
      .select(`
        *,
        users!request_executors_user_id_fkey (
          id,
          full_name,
          email,
          role
        ),
        requests!request_executors_request_id_fkey (
          id,
          title,
          status
        )
      `);

    if (requestId) {
      query = query.eq('request_id', requestId.toLowerCase().trim());
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) {
      return { data: null, error: error.message };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Error in debugRequestExecutors:', error);
    return { data: null, error: `Failed to debug request executors: ${error}` };
  }
}

export async function getExecutorCompletionNotes(requestId: string): Promise<{ data: any[] | null; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log(`📊 Mock: Getting executor completion notes for request ${requestId}`)
      return { 
        data: [
          {
            id: 'mock-1',
            user_id: 'mock-user-1',
            task_status: 'completed',
            completed_at: new Date().toISOString(),
            completed_by: 'mock-user-1',
            notes: 'Mock completion notes for testing',
            users: {
              id: 'mock-user-1',
              full_name: 'Mock User 1',
              email: 'mock1@example.com'
            }
          }
        ]
      }
    }

    const { data, error } = await supabaseAdmin
      .from('request_executors')
      .select(`
        id,
        user_id,
        task_status,
        completed_at,
        completed_by,
        notes,
        users!request_executors_user_id_fkey (
          id,
          full_name,
          email
        )
      `)
      .eq('request_id', requestId.toLowerCase().trim())
      .eq('task_status', 'completed')
      .not('notes', 'is', null)
      .order('completed_at', { ascending: false })

    if (error) {
      console.error('Error getting executor completion notes:', error)
      return { data: null, error: error.message }
    }

    return { data: data || [] }
  } catch (error) {
    console.error('Error in getExecutorCompletionNotes:', error)
    return { data: null, error: `Failed to get executor completion notes: ${error}` }
  }
}

/**
 * Fix notifications table constraint to include 'clarification_deleted' type
 * This resolves FK constraint violations when deleting clarification requests
 */
export async function fixNotificationsConstraint(): Promise<{ success: boolean; error?: string }> {
  try {
    if (!supabaseAdmin) {
      console.log("No Supabase connection available for constraint fix");
      return { success: false, error: "No database connection" };
    }

    // First, check current constraint to confirm the issue
    const { data: constraintCheck, error: checkError } = await supabaseAdmin
      .from('information_schema.check_constraints')
      .select('constraint_name, check_clause')
      .eq('constraint_name', 'notifications_type_check');

    if (checkError) {
      console.error("Error checking constraint:", checkError);
    } else {
      console.log("Current constraint:", constraintCheck);
    }

    // Since we can't directly execute DDL through Supabase client, 
    // we'll use the SQL editor or provide instructions
    console.log("⚠️ Database constraint needs manual update");
    console.log("Please run this SQL in your Supabase SQL editor:");
    console.log(`
-- Drop existing constraint
ALTER TABLE notifications DROP CONSTRAINT IF EXISTS notifications_type_check;

-- Add updated constraint with all notification types
ALTER TABLE notifications ADD CONSTRAINT notifications_type_check 
    CHECK (type IN (
        'clarification', 
        'clarification_deleted', 
        'assignment', 
        'rejection', 
        'approval', 
        'rework', 
        'deadline', 
        'task_completed', 
        'comment', 
        'status_change'
    ));
    `);

    return { 
      success: false, 
      error: "Manual SQL execution required - see console for instructions" 
    };
  } catch (error) {
    console.error("Error fixing notifications constraint:", error);
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export { supabaseAdmin }
export type { AIAnalysisData } from "./supabase"
