# SafeLink HSE Suite — Permit to Work (PTW)

## Project overview

This project is a React + TypeScript application built with Vite. It is designed to manage Permit to Work workflows with Firebase Authentication, Firestore storage, role-based access, permit lifecycle progression, audit trail logging, and multi-format export.

The current implementation includes:

- Email/password signup and login
- Google sign-in
- Password reset
- Role-aware dashboard access
- Firestore-based user profile management
- Instant permit creation with dynamic custom fields
- Workflow stage updates using configurable permit statuses
- Export to PDF, Excel, Word (DOCX), and PNG image
- Firebase environment parity for demo and production

## Tech stack

- React 19 with TypeScript
- Vite build system
- Firebase Authentication
- Firebase Firestore
- jsPDF + jsPDF-AutoTable for PDF export
- xlsx for Excel export
- docx for Word/DOCX export
- Canvas image generation for PNG export
- React Router DOM v7 for routing
- Oxlint for linting

## Folder structure

- `src/App.tsx` — dashboard shell and main permit page
- `src/routes.tsx` — route definitions and auth guarding
- `src/context/AuthContext.tsx` — Firebase auth, profile management, signup/login/reset
- `src/context/NotificationContext.tsx` — application notifications and toast system
- `src/components/AppShell.tsx` — shared header, navigation, and layout
- `src/components/RequireAuth.tsx` — route protection for authenticated users
- `src/components/PermitComposer.tsx` — permit creation UI and custom fields
- `src/components/PermitBoard.tsx` — permit lifecycle management UI
- `src/components/ExportPanel.tsx` — export UI and format selection
- `src/components/Notifications.tsx` — notification rendering
- `src/services/firebase.ts` — Firebase initialization
- `src/services/ptw.ts` — permit Firestore CRUD and audit trail operations
- `src/services/exports.ts` — export helper functions
- `src/types/permit.ts` — shared permit and config types
- `src/config/client.ts` — application-specific client settings
- `.firebaserc` — Firebase CLI alias configuration

## Environment setup

### Required tools

- Node.js 18+ or later
- npm 10+ or later
- Firebase CLI (optional for deployment)

### Local setup

1. Clone the repository.
2. Run `npm install`.
3. Create environment files if not present:
   - `.env.development`
   - `.env.demo`
   - `.env.production`
4. Fill each `.env.*` file with Firebase config values:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

1. Start development in demo mode:

```bash
npm run dev
```

1. Start development explicitly in demo mode:

```bash
npm run dev:demo
```

1. Build the demo bundle:

```bash
npm run build:demo
```

1. Build the production bundle:

```bash
npm run build:prod
```

1. Preview the production build:

```bash
npm run preview:prod
```

1. Preview the demo build:

```bash
npm run preview:demo
```

## Firebase environment configuration

This project uses two Firebase aliases in `.firebaserc`:

- `demo` maps to the demo project `hse-safelink`
- `prod` maps to the production project `hse-safelink-prod`

The default Firebase CLI project is set to `demo`, so `npx firebase deploy` will target the demo environment unless changed.

Use the CLI aliases like this:

```bash
npx firebase use demo
npx firebase deploy --project demo
```

```bash
npx firebase use prod
npx firebase deploy --project prod
```

## Application architecture

### Firebase initialization

`src/services/firebase.ts` initializes Firebase using environment variables and exports:

- `auth` for Firebase Authentication
- `db` for Firestore
- `storage` for future storage use

### Authentication and user profile

`src/context/AuthContext.tsx` implements:

- `signIn(email, password)`
- `signInWithGoogle()`
- `signUp(email, password, name, phone)`
- `resetPassword(email)`
- `signOutUser()`

User profiles are stored under Firestore path:

- `companies/demo-company/users/{uid}`

Profile fields include:

- `uid`
- `email`
- `role`
- `name`
- `phone`
- `createdAt`

If the authenticated user has no existing Firestore profile, the app creates a fallback profile and assigns `Field Supervisor` by default.

### Routing

`src/routes.tsx` defines route handling with React Router DOM:

- `/` — dashboard guarded by `RequireAuth`
- `/permits` — dashboard alias guarded by `RequireAuth`
- `/login` — login page
- `/signup` — signup page
- `*` — catch-all redirect to `/`

`RequireAuth` checks the auth state and redirects unauthenticated users to `/login`.

### App shell and notifications

`AppShell` renders the top-level layout, navigation links, and notification host. It uses `Notifications` to display toast messages for success, error, and info events.

### Dashboard flow

`src/App.tsx` loads permit records from Firestore and renders:

- `PermitComposer` for submitting new permits
- `PermitBoard` for viewing and updating permit status
- `ExportPanel` for exporting permit data

### Firestore data model

The permit backend uses the following Firestore structure:

- `companies/demo-company/config` — application config documents
- `companies/demo-company/users/{uid}` — user profiles
- `companies/demo-company/sites/demo-site/permits/{permitId}` — permits
- `companies/demo-company/sites/demo-site/auditTrail/{auditId}` — permit audit events

### Permit config defaults

The app writes default config to Firestore when `ensurePermitConfig()` runs and no config exists.
Default settings include:

- roles: `Field Supervisor`, `Area Authority`, `HSE Officer`, `Admin`
- workflow: `Draft`, `Pending Review`, `Pending Approval`, `Approved`, `Work in Progress`, `Closed`, `Rejected`, `Cancelled`
- permitTypes: `Hot Work`, `Confined Space`, `Electrical Isolation`
- sites: `demo-site`

### Permit creation

`PermitComposer` supports:

- title
- description
- permit type
- site/location
- arbitrary custom fields as key/value pairs

Custom fields are stored inside each permit document under `customFields`.

### Permit lifecycle management

`PermitBoard` loads the workflow stages from Firestore config and renders a status selector for each permit.
Users can choose a new state and submit it, which triggers `updatePermitStatus()` and writes an audit event.

### Export capabilities

`ExportPanel` exports permit data in these formats:

- PDF via `jsPDF` + `jspdf-autotable`
- Excel via `xlsx`
- Word/DOCX via `docx`
- PNG image via HTML canvas rendering

Export rows include standard permit fields and any custom fields added by users.

## Implementation steps

### Setup and install

1. Create a new Vite React app with TypeScript.
2. Install React, React DOM, Vite, TypeScript, and React Router DOM.
3. Install Firebase SDK for auth and Firestore.
4. Install `jspdf`, `jspdf-autotable`, and `xlsx` for export features.
5. Add `docx` for Word export.
6. Install Oxlint and prepare linting configuration.
7. Create project folders: `components`, `context`, `services`, `pages`, `types`, `config`.
8. Add `src/services/firebase.ts` to initialize Firebase from environment variables.
9. Add `.firebaserc` with demo and prod alias mapping.
10. Add environment variable schemas in `.env.development`, `.env.demo`, `.env.production` as needed.

### Authentication setup

1. Create `AuthContext` to expose auth state and methods.
2. Initialize `useState` for `user`, `profile`, and `loading`.
3. Use `onAuthStateChanged` to monitor Firebase auth state.
4. Fetch user profile from Firestore when auth changes.
5. Create fallback user profile if Firestore record is missing.
6. Store profile data in Firestore under `companies/demo-company/users/{uid}`.
7. Implement email/password `signIn`.
8. Implement Google sign-in with `GoogleAuthProvider`.
9. Implement `resetPassword` using Firebase email reset.
10. Implement `signUp` to create Firebase user and save profile.
11. Save `displayName` in Firebase auth profile on signup.
12. Save phone number in Firestore profile during signup.
13. Expose auth methods through context using `useMemo`.
14. Create a `useAuth()` hook to access the auth context.
15. Guard route access via `RequireAuth` component.
16. Redirect unauthenticated users to `/login`.
17. Display loading state while auth initialization runs.

### UI routing and shell

1. Create `routes.tsx` with `createBrowserRouter`.
2. Define the main `/` route to render the dashboard.
3. Add `/login` and `/signup` routes.
4. Add a wildcard route to redirect invalid URLs to `/`.
5. Create `AppShell` with header, nav links, and outlet.
6. Use `useAuth` inside `AppShell` to show dashboard links only when signed in.
7. Render `Notifications` inside the shell.
8. Create `NotificationContext` with notification queue.
9. Implement `notify()` to add messages and auto-remove after 4.5s.
10. Use `removeNotification()` to allow manual dismiss.
11. Render notifications as toast cards.
12. Wrap the app in `AuthProvider` and `NotificationProvider`.

### Signup and login pages

1. Create `SignupPage` with name, phone, email, and password fields.
2. Validate required signup fields and password length.
3. Call `signUp` and redirect on success.
4. Notify success and error states.
5. Create `LoginPage` with email/password fields.
6. Add a Google login button.
7. Add a password reset button with prompt input.
8. Use `navigate()` to route to the dashboard after successful login.
9. Use `notify()` for login feedback.
10. Link between login and signup pages.
11. Keep error handling consistent across auth pages.

### Dashboard and state loading

1. Build `App.tsx` as the dashboard entry point.
2. Use `useAuth` to show the current user profile and role.
3. Add text explaining available actions by role.
4. Load permits with `getPermits()` on mount.
5. Store fetched permits in local state.
6. Track a loading indicator for permit fetch status.
7. Provide `refreshPermits()` to re-fetch after permit changes.
8. Render `PermitComposer`, `PermitBoard`, and `ExportPanel`.
9. Keep the UI responsive by updating state after each change.

### Permit service and Firestore model

1. Create `ptw.ts` service for permit backend operations.
2. Define `companyId` and `siteId` constants used by Firestore paths.
3. Build `ensurePermitConfig()` to initialize config documents.
4. Set default role/workflow/type/site config when missing.
5. Implement `getPermitConfig()` to read the first config document.
6. Implement `getPermits()` to query permits ordered by `createdAt`.
7. Implement `createPermit()` to write permit documents with timestamps.
8. Write audit events for permit creation.
9. Implement `updatePermitStatus()` to change permit status and update timestamps.
10. Write audit events for status updates.
11. Implement `getAuditTrail()` for permit-specific audit history.

### Permit types and data model

1. Define `PermitRecord` in `src/types/permit.ts`.
2. Add `customFields?: Record<string, string>` to permit type.
3. Define `CompanyConfig` with roles, workflow, permitTypes, and sites.
4. Include `AuditEntry` type for audit records.
5. Use typed Firestore reads and casts for better TypeScript safety.

### Permit creation UX

1. Create `PermitComposer` with title, description, permit type, and site.
2. Add custom field inputs for dynamic key/value pairs.
3. Store custom fields locally in `customFields` state.
4. Validate title and authentication before submit.
5. Accept empty description and permit type values.
6. Call `ensurePermitConfig()` before permit creation.
7. Submit the permit document with `customFields` included.
8. Reset form state after a successful save.
9. Notify the user on success or error.
10. Provide a refresh config button to reload Firestore settings.

### Workflow and permit board

1. Build `PermitBoard` to display permit cards.
2. Load workflow stages from Firestore config.
3. Fall back to hardcoded default workflow if config is missing.
4. Display permit title, description, and status.
5. Render a status selector for each permit.
6. Allow users to change permit status to any configured stage.
7. Call `updatePermitStatus()` when a new status is selected.
8. Notify the user after a successful transition.
9. Handle invalid or missing auth state gracefully.
10. Refresh the permit list after a state update.

### Export and reporting

1. Build `ExportPanel` to collect current permit rows.
2. Include standard fields plus any custom fields.
3. Export PDF using `jsPDF` and `jspdf-autotable`.
4. Export Excel using `xlsx`.
5. Export Word and PNG using browser APIs and `docx`.

## Feature summary

- Role-based access: Authenticated users can access the dashboard; anonymous users are redirected to login.
- Signup: collects name, phone, email, and password.
- Login: supports email/password, Google sign-in, and password reset.
- Dashboard: shows current role and permit actions.
- Permit creation: instant, flexible, and accepts arbitrary metadata.
- Permit workflow: configurable stages and live state updates.
- Export: PDF, Excel, Word, and PNG from permit data.
- Firestore audit trail: writes events for permit creation and status changes.

## Additional notes

- The app currently uses `demo-company` and `demo-site` defaults in Firestore.
- The profile fallback assigns `Field Supervisor` when a user profile document is absent.
- The workflow is driven by Firestore config, enabling future admin-managed stage changes.
- Exports are handled fully in the browser, without backend file generation.

## Recommended next improvements

- Add Firestore security rules for per-role permit access.
- Add a dedicated audit history view for each permit.
- Add permit search and filter UI.
- Add document/file attachments support.
- Add role selection or admin management of user roles.

## Running checks

- `npm install` — install dependencies
- `npm run dev` — run the app locally in demo mode
- `npm run build` — produce a production build
- `npm run preview` — preview the build locally

## Deployment

1. Ensure `.firebaserc` aliases are correct.
2. Use `npx firebase use demo` or `npx firebase use prod`.
3. Build the app with the appropriate mode.
4. Deploy with `npx firebase deploy --project demo` or `--project prod`.

---

This README documents the current application setup, architecture, and feature implementation in detail so the project can be understood, maintained, and extended from this point onward.
