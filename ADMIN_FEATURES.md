
# Admin Panel Features Documentation

## Table of Contents
- [Authentication & Access](#authentication--access)
- [Dashboard & Analytics](#dashboard--analytics)
- [Feed Management](#feed-management)
- [Events Management](#events-management)
- [Messages Management](#messages-management)
- [User Management](#user-management)
- [Data Import](#data-import)
- [Routes Summary](#routes-summary)

---

## Authentication & Access

### Admin Login
**Route:** `/admin/login`

**Features:**
- Dedicated admin login page with enhanced security
- Session-based authentication
- Auto-logout on tab close (not on refresh)
- Verification of admin privileges before access
- Secure password validation

---

## Dashboard & Analytics

**Route:** `/admin/dashboard`

### Overview Tab

#### User Statistics Cards
- **Total Users** - Count of all registered users
- **Active Users** - Users active in last 30 days
- **Pending Signup Requests** - Requests awaiting approval
- **Admin Users** - Count of administrators

#### Activity Metrics
- New users today/week/month
- Active users today/week/month
- Real-time activity tracking

#### Visual Analytics
- **User Growth Trend** - 6-month line chart showing user growth over time
- **User Role Distribution** - Pie chart breakdown by role (alumni/student/faculty/administrator)
- **Profile Completion Status** - Bar chart showing complete/partial/incomplete profiles
- **User Engagement Chart** - Comparison of active vs inactive users

#### Quick Stats
- **Today's Activity**
  - New users count
  - Active users count
- **This Week's Metrics**
  - Weekly user growth
  - Weekly engagement
- **Engagement Rate** - Percentage of engaged users
- **Profile Completion** - Breakdown of profile states

### Analytics Tab
- Detailed engagement charts
- Activity summary cards
- Profile completion analytics
- Export Analytics to PDF functionality

### Users Tab

#### User Management Features
- **View All Users**
  - Paginated list (50 users per page)
  - User details display (username, email, role, status)
  
- **Search & Filter**
  - Search by username or email
  - Filter by role (alumni/student/faculty/administrator)
  - Filter by admin status
  - Filter by registration date (today/week/month/year)

- **Inline Editing**
  - Edit username directly
  - Edit email address
  - Change user role
  - Confirmation dialog for all changes

- **Account Management**
  - Block/Unblock user accounts
  - Cannot block own admin account
  - Real-time status updates
  - Account status indicators

- **Data Export**
  - Export user data in CSV format
  - Export user data in JSON format
  - Bulk data export functionality

#### Create Alumni Account
**Manual account creation with:**
- Auto-generated temporary password
- Credentials display and copy functionality
- Comprehensive profile setup:
  - Personal information (name, email, phone, gender, bio)
  - Academic information (batch, graduation year, course, branch, roll number, CGPA)
  - Professional information (current company, role, industry, city)
  - Social links (LinkedIn URL)

#### Signup Request Approval
- **View Pending Requests**
  - List of all pending signup requests
  - Request details preview (name, email, batch, graduation year, etc.)
  
- **Approve Requests**
  - Creates user account
  - Creates associated alumni profile
  - Auto-generates secure credentials
  - Displays credentials for admin to share
  
- **Reject Requests**
  - Removes request from pending list
  - Optional rejection reason

---

## Feed Management

**Route:** `/admin/feed`

### Post Approval System

#### Features
- **View Pending Posts**
  - All unapproved posts in queue
  - Full post content preview
  - Attached media preview

- **Author Information**
  - Profile picture display
  - Author name
  - Batch information
  - Current company
  - Full alumni profile access

- **Post Actions**
  - **Approve** - Makes post visible to all users
  - **Reject** - Marks post as inactive (not visible)
  
- **Post Details Dialog**
  - Comprehensive author section
  - Full post content with formatting
  - All attached media preview
  - Post metadata (date, type, status)

---

## Events Management

**Route:** `/admin/events`

### Event Statistics Dashboard
- **Total Events** - Count of all events
- **Active Events** - Currently active events
- **Virtual Events** - Online event count
- **In-Person Events** - Physical event count

### Event CRUD Operations

#### Create Event
- Event title
- Detailed description
- Event date and time (with datetime picker)
- Location details
- Virtual event toggle
- Virtual meeting link (for online events)
- Maximum attendees limit
- Registration deadline
- Cover image upload
- Active/Inactive status

#### Edit Event
- Update all event fields
- Change event status
- Update cover image
- Modify registration settings
- **Date and time are pre-filled** with existing values

#### Delete Event
- Confirmation dialog before deletion
- Permanent removal from database

#### View Events
- List all events
- Search by title/description/location
- Filter by status (active/inactive)
- Sort by date

### Event Files Management
- **Upload Files**
  - Documents (PDF, DOC, DOCX)
  - Images (JPG, PNG, GIF)
  - Multiple file upload support
  
- **View Files**
  - List all files attached to event
  - File preview functionality
  - File metadata display
  
- **Delete Files**
  - Remove individual files
  - Confirmation before deletion

---

## Messages Management

**Route:** `/admin/messages`

### User Conversations View

#### Features
- **User List**
  - All users with message history
  - Message count per user
  - Last message timestamp
  - Search users by name or email

- **Conversation Details**
  - All conversations for selected user
  - Grouped by conversation partner
  - Full message threads
  - Message timestamps
  - Read/Unread status indicators
  - Sender/Receiver identification

- **Export Functionality**
  - Export conversations to text file
  - Formatted export with metadata
  - Includes all messages with timestamps
  - Shows read/unread status

---

## User Management

### User Profile Editing

**Route:** `/admin/users/:userId/edit`

#### Account Information
- Username (editable)
- Email address (editable)
- User Role (alumni/student/faculty/administrator)
- Admin Status (toggle)

#### Personal Information
- First Name
- Last Name
- Phone number
- Gender
- Bio/About section

#### Academic Information
- Batch year
- Graduation year
- Course
- Branch/Department
- Roll number
- CGPA

#### Professional Information
- Current Company
- Current Role/Position
- Industry
- Current City
- LinkedIn URL

#### Bulk Save Feature
- Save all changes at once
- Confirmation dialog showing pending changes
- Field-by-field update tracking
- Success/Error notifications

---

## Data Import

**Route:** `/admin/import`

### Excel Import Feature

#### Capabilities
- Upload Excel files (.xlsx, .xls)
- Automatic column detection
- Batch alumni data import
- Import results display
- Detailed error reporting

#### Supported Fields
- **Student Information**
  - Name
  - Email
  - Phone
  - Roll Number

- **Academic Information**
  - Graduation Year
  - Batch
  - Course
  - Branch
  - CGPA

- **Current Information**
  - City
  - Company
  - Role/Position

- **Social Links**
  - LinkedIn URL

#### Import Process
1. Upload Excel file
2. System validates columns
3. Processes each row
4. Creates user accounts
5. Creates alumni profiles
6. Shows results (success/failed counts)
7. Displays detailed error messages for failures

---

## Common Features Across Admin Panel

### Navigation
- Shared AdminSidebar component
- Quick access to all sections:
  - Dashboard
  - Feed
  - Events
  - Messages
- Logout functionality

### UI Elements
- Responsive design (mobile, tablet, desktop)
- Loading states for all operations
- Error handling with user-friendly messages
- Toast notifications for actions
- Confirmation dialogs for destructive actions
- Search and filter capabilities
- Pagination for large datasets

### Security
- Admin verification on all routes
- User ID validation
- Session management
- Auto-logout on tab close
- Session preservation on page refresh
- Secure password handling

---

## Routes Summary

| Feature | Route | Description |
|---------|-------|-------------|
| Admin Login | `/admin/login` | Admin authentication page |
| Dashboard | `/admin/dashboard` | Main dashboard with analytics and user management |
| Feed Management | `/admin/feed` | Post approval and moderation |
| Events Management | `/admin/events` | Complete event CRUD operations |
| Messages | `/admin/messages` | View and export user conversations |
| User Profile Edit | `/admin/users/:userId/edit` | Detailed user profile editing |
| Data Import | `/admin/import` | Bulk Excel data import |

---

## Technical Stack

### Frontend
- React with TypeScript
- Wouter for routing
- Shadcn/UI components
- TailwindCSS for styling
- Recharts for analytics visualization

### Backend
- Express.js server
- Supabase for database
- Supabase Storage for file management
- Session-based authentication

### Features Integration
- Real-time updates
- File upload/download
- CSV/JSON export
- PDF generation for analytics
- Excel parsing for imports

---

## Admin Privileges

To access the admin panel, a user must:
1. Have an account in the system
2. Have `is_admin` flag set to `true` in the users table
3. Successfully authenticate through `/admin/login`

All admin routes are protected and verify admin status before allowing access.

---

*Last Updated: January 2025*
