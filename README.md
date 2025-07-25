# Goal Management System with PDCA

A complete standalone goal management system using the PDCA (Plan-Do-Check-Act) methodology, built with Next.js 15 and Supabase.

## 🎯 **System Overview**

The Goal Management System simplifies goal tracking into a focused PDCA cycle while maintaining collaborative features like multi-assignee support, notifications, and department permissions.

## 🚀 **Quick Start**

### 1. Environment Setup
```bash
# Copy environment template
cp .env.example .env.local

# Edit with your Supabase credentials
nano .env.local
```

### 2. Database Setup
```bash
# Create a new Supabase project at https://supabase.com
# Then run the database setup script in your Supabase SQL editor
# Copy the contents of scripts/goal-database-setup.sql
```

### 3. Install Dependencies
```bash
npm install
# or
pnpm install
```

### 4. Run Development Server
```bash
npm run dev
# or
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## 📊 **PDCA Workflow States**

- **Plan** - Goal definition and planning phase
- **Do** - Execution/implementation phase  
- **Check** - Review and evaluation phase
- **Act** - Adjustment and completion phase
- **Completed** - Goal achieved
- **On Hold** - Temporarily paused
- **Cancelled** - Goal abandoned

## ✨ **Key Features**

### 🎯 **Goal Management**
- **Goal Types**: Personal, Team, Department, Company
- **PDCA Methodology**: Simplified 4-stage workflow
- **Progress Tracking**: Percentage-based progress monitoring
- **Target Metrics**: Measurable success criteria
- **Support System**: Request support from other departments/teams

### 👥 **Collaboration**
- **Multi-Assignee Support**: Multiple people can work on one goal
- **Individual Task Completion**: Each assignee marks their part complete
- **Comments & Attachments**: Goal progress updates and file sharing
- **Department Permissions**: Cross-department goal visibility

### 📈 **Tracking & Analytics**
- **PDCA Progress Board**: Visual workflow with bottleneck detection
- **Department Dashboard**: Goal organization by PDCA status
- **Focus System**: Two-week goal prioritization
- **Overdue Tracking**: Automated deadline monitoring

### 🔔 **Notifications**
- **Real-time Updates**: Status changes, assignments, comments
- **Auto-delete on Read**: Clean notification management
- **Role-based Targeting**: Smart notification distribution

## 🏗️ **Database Schema**

### Main Tables
- **`goals`** - Core goal data with PDCA states
- **`goal_assignees`** - Multi-assignee support with individual task status
- **`goal_comments`** - Progress updates and collaboration
- **`goal_attachments`** - File and document support
- **`goal_support`** - Department/team support requests
- **`notifications`** - Real-time notification system
- **`users`** - User management (Admin, Manager, User roles)

## 🔧 **Development**

### Scripts
- `npm run dev` - Start development server
- `npm run build` - Build production version
- `npm run start` - Start production server
- `npm run lint` - Run Next.js linting

### Project Structure
```
goal-management-system/
├── app/                    # Next.js 15 App Router
│   ├── dashboard/         # Main dashboard and goal pages
│   ├── login/            # Authentication
│   └── api/              # API routes
├── components/           # React components
│   ├── ui/              # shadcn/ui components
│   ├── pdca-*.tsx       # PDCA workflow components
│   ├── goal-*.tsx       # Goal management components
│   └── goals-*.tsx      # Goal table components
├── actions/             # Server actions
├── lib/                # Utilities and database
├── hooks/              # React hooks
├── scripts/            # Database setup scripts
└── public/             # Static assets
```

## 🌟 **Business Value**

### For Teams
- **Clear Objectives**: PDCA methodology ensures structured goal achievement
- **Collaborative Execution**: Multi-assignee support for team goals
- **Progress Transparency**: Real-time visibility into goal status
- **Continuous Improvement**: Built-in review and adjustment phases

### For Managers
- **Department Overview**: All department goals in one dashboard
- **Progress Monitoring**: Visual tracking of goal completion
- **Resource Allocation**: Support system shows cross-department needs
- **Performance Insights**: Focus system for prioritization

### For Organizations
- **Strategic Alignment**: Company-wide goal visibility
- **Process Standardization**: Consistent PDCA methodology
- **Knowledge Sharing**: Comments and attachments for best practices
- **Accountability**: Clear ownership and completion tracking

## 🔐 **Environment Variables**

Required environment variables:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key  
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

Optional variables:
```bash
ENABLE_NOTIFICATIONS=true
POSTGRES_URL=your_postgres_connection_string
```

## 📚 **Documentation**

- See `GOAL-SYSTEM.md` for detailed feature documentation
- Database setup instructions in `scripts/goal-database-setup.sql`
- Component documentation in individual component files

## 🐛 **Troubleshooting**

### Common Issues
- **"relation does not exist"**: Run `goal-database-setup.sql` in Supabase
- **Environment errors**: Check `.env.local` has correct Supabase credentials
- **Build errors**: Run `npm run lint` to check for TypeScript issues

### Development
- System includes mock data for development when Supabase is unavailable
- All database functions handle errors gracefully
- TypeScript support with proper interfaces

## 📄 **License**

This project is private and proprietary.

---

**Built with**: Next.js 15, Supabase, shadcn/ui, Tailwind CSS  
**Methodology**: PDCA (Plan-Do-Check-Act)  
**Focus**: Department-based goal management with collaborative execution