# SmartGroup Technical Implementation Document

## 1. Purpose and Scope
This document describes how SmartGroup is implemented across frontend, backend, database, authentication, AI integration, and deployment. It is intended for developers, reviewers, and maintainers who need a clear view of the system architecture and technical decisions.

## 2. System Overview
SmartGroup is an AI-supported collaboration platform for student group projects. The system is split into:

- Client: Next.js web app (`client/`)
- Server: Express API (`server/`)
- Database: PostgreSQL (`server/db/schema.sql`)

Core capabilities:
- Google sign-in and JWT-based session auth
- Group and member management
- Assessment creation and linking
- AI-assisted task generation
- Task lifecycle, subtasks, comments, and change requests
- Charter workflow (sign, accept, negotiate)
- Notifications and contribution tracking

## 3. Technology Stack
### Frontend
- Next.js App Router (React 19)
- Tailwind CSS
- `@react-oauth/google` for Google sign-in UI
- Axios for API requests
- Recharts for team progress visualizations
- DnD Kit for Kanban interactions

### Backend
- Node.js + Express
- PostgreSQL (`pg`)
- `google-auth-library` for token verification
- `jsonwebtoken` for session tokens
- `multer` for file upload handling in AI flows
- OpenAI SDK for task generation

### Data and Infrastructure
- PostgreSQL schema managed in SQL (`server/db/schema.sql`)
- Environment-driven configuration (`.env`, `.env.local`)
- Typical deployment model: Vercel frontend + external Node host backend

## 4. High-Level Architecture
1. User opens the Next.js app.
2. User authenticates with Google in the browser.
3. Browser sends Google credential token to backend (`POST /api/auth/google`).
4. Backend verifies credential against configured Google Client ID.
5. Backend issues JWT token in cookie and user profile payload.
6. Frontend calls protected API endpoints with credentials enabled.
7. Backend performs business logic and reads/writes PostgreSQL.
8. AI task generation endpoint accepts assignment context and persists generated tasks.

## 5. Repository Structure
- `client/app/`: route-based pages and layouts
- `client/components/`: shared UI, layout, feature components
- `client/context/`: auth/session context
- `client/services/`: API client wrappers by domain
- `server/controllers/`: route handlers and business logic
- `server/routes/`: endpoint declarations and middleware composition
- `server/middleware/`: auth middleware
- `server/db/`: connection and SQL schema
- `server/services/`: server-side utilities (email, etc.)

## 6. Frontend Implementation
### 6.1 App Routing and Layouts
The frontend uses Next.js App Router route groups:
- `(auth)` for login
- `(dashboard)` for authenticated feature pages

Shared UI patterns include:
- Reusable `Button`, `Card`, `Modal`, `Badge`, and theme components
- Dark mode support via theme provider
- Dashboard-side navigation and top bar components

### 6.2 State and Data Access
- `AuthContext` manages user session fetch/refresh logic.
- Service modules in `client/services/` encapsulate API calls by feature.
- Pages are responsible for view-level loading/error/empty handling.

### 6.3 Key Feature Pages
- Dashboard: onboarding-aware content and action shortcuts
- Workspace: group context and operations
- My Tasks: status updates, acceptance, and assignment view
- Contributions: team progress charts and member contribution insights
- SmartGroup Assistant: AI planning flow

## 7. Backend Implementation
### 7.1 API Server and Middleware
`server/server.js` configures:
- JSON parsing
- Cookie parsing
- CORS allowlist using `CLIENT_URL`, optional `CLIENT_URLS`, and optional Vercel preview allowance
- Route mounting at `/api/*`

`authMiddleware` protects private endpoints by validating JWT from cookies or bearer token.

### 7.2 Route Modules
Main route groups:
- `authRoutes`: login/session/profile
- `groupRoutes`: CRUD and member/message operations
- `assessmentRoutes`: create and fetch assessments
- `taskRoutes`: task CRUD, status, comments, subtasks, change requests
- `charterRoutes`: charter state transitions
- `notificationRoutes`: list/create/read notifications
- `contributionRoutes`: contribution analytics by group
- `aiRoutes`: AI task generation

### 7.3 Controller Design
Controllers follow a service-style pattern:
- Validate input and auth context
- Execute SQL operations (often grouped by feature)
- Return structured JSON responses
- Handle errors and log failures for diagnosis

## 8. Authentication and Authorization
### 8.1 Sign-In Flow
1. Browser displays Google sign-in component.
2. Google returns a credential token to frontend callback.
3. Frontend posts credential to backend `/api/auth/google`.
4. Backend verifies token using `GOOGLE_CLIENT_ID`.
5. Backend sets auth cookie and returns user payload.

### 8.2 Session Model
- JWT contains key user claims.
- Cookie transport is used for session continuity.
- `GET /api/auth/me` returns current authenticated user.

### 8.3 Access Control
- Most domain routes require `authMiddleware`.
- Authorization checks are applied per feature operation using user context and resource ownership/membership.

## 9. Data Model and Persistence
The PostgreSQL schema includes entities for:
- users
- groups
- memberships
- assessments
- task plans and tasks
- task comments and negotiations
- charter lifecycle records
- notifications
- contribution logs

Key data model characteristics:
- UUID-driven identifiers for cross-table joins
- Foreign key relationships for group- and task-scoped ownership
- Indexes for common filters (user, task, created date, status)

## 10. AI Task Planning Implementation
### 10.1 Input Sources
- Prompt text and optional assignment file upload

### 10.2 Processing
- Backend route receives payload and builds AI prompt context
- OpenAI API is called to generate structured tasks
- Parsed tasks are transformed into DB-ready records

### 10.3 Persistence
- Task creation endpoints support single and bulk save workflows
- Generated tasks are associated with group and assessment context

## 11. Notifications and Collaboration Features
Implemented collaboration mechanisms:
- In-app notifications for relevant workflow events
- Task comments and mention-aware notifications
- Task change request workflow (request, accept, reject)
- Subtask tracking and progress updates

## 12. Contribution and Team Progress Analytics
Contribution features include:
- Group-level contribution retrieval endpoints
- Aggregated task status distribution for charting
- Member-level progress indicators in dashboard/contribution views

## 13. Configuration and Environment Variables
### 13.1 Frontend (`client/.env.local`)
- `NEXT_PUBLIC_GOOGLE_CLIENT_ID`
- `BACKEND_URL` (used with Next.js rewrite strategy)

### 13.2 Backend (`server/.env`)
- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `GOOGLE_CLIENT_ID`
- `OPENAI_API_KEY`
- `CLIENT_URL`
- `CLIENT_URLS` (optional)
- `ALLOW_VERCEL_PREVIEWS` (optional)

## 14. Deployment Architecture
Recommended deployment split:
- Frontend deployed on Vercel with `client/` as root
- Backend deployed on a Node host (Render, Railway, Fly, etc.)
- PostgreSQL managed externally

Production behavior:
- Frontend calls same-origin `/api/*`
- Next.js rewrites route to backend URL
- Backend CORS configured to allow production frontend origin(s)

OAuth requirement:
- Google OAuth client must include every active frontend origin in Authorized JavaScript origins.
- Origin matching is exact by scheme + host + port.

## 15. Error Handling and Observability
Current implementation includes:
- Controller-level try/catch with JSON error responses
- Console logging for server-side failures
- Basic health endpoint (`/api/health`)

Recommended enhancements:
- Structured request logging
- Error tracking integration
- Correlation IDs for API request tracing

## 16. Security Considerations
Current controls:
- JWT-based authentication
- Cookie-based session handling
- CORS origin restrictions
- Protected API routes via middleware

Recommended hardening:
- Add rate limiting for auth and AI endpoints
- Add stricter input validation in all controllers
- Add audit logs for sensitive operations
- Enforce secure cookie settings consistently by environment

## 17. Known Technical Risks and Improvement Backlog
- Introduce formal API contracts (OpenAPI/Swagger)
- Add integration tests for critical workflows (auth, task status, charter transitions)
- Improve real-time experience by implementing socket events where needed
- Expand deployment playbooks for preview and multi-environment QA
- Add data migration/versioning process documentation

## 18. Verification Checklist
After setup/deploy, verify:
1. Google sign-in succeeds without origin mismatch.
2. Authenticated user session persists across page refresh.
3. Group creation and member addition complete successfully.
4. Assessment and task generation/save flows persist data.
5. Task status updates reflect in My Tasks and Team Progress views.
6. Notifications and comments are created and retrievable.
7. Health endpoint responds and CORS allows intended frontend origins.

## 19. Future Documentation Set
This document should be paired with:
- End-user manual (task-based)
- API reference document
- Database schema reference
- Operational runbook (incident, rollback, backup)

---
Document owner: SmartGroup Engineering Team  
Last updated: 2026-06-14
