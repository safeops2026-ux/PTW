# SafeLink HSE Suite — Permit to Work (PTW)

## 🌟 Overview

SafeLink HSE Suite is a lightweight React + TypeScript application built on Vite.

It models a Permit to Work workflow with:

- Firebase Authentication and Firestore persistence
- role-aware permit dashboard access
- dynamic permit creation with custom metadata
- configurable workflow states and status updates
- audit trail logging for permit changes
- browser-based export to PDF, Excel, and PNG

---

## 🚀 Why this project exists

This repository is designed to be both a working permit management app and a tutorial for building a modern Firebase-backed React application.

It is useful for:

- learning Firebase auth + Firestore patterns
- mastering dynamic forms and custom fields in React
- implementing workflow state management
- generating browser exports without server-side rendering
- organizing a Vite + TypeScript frontend project cleanly

---

## 🧩 What’s included

- Email/password login and signup
- Google sign-in
- Password reset
- protected dashboard routes
- Firestore user profile management
- permit creation with custom fields
- workflow state updates and audit trail writes
- export to PDF, Excel, and PNG
- Vite-based production build and code splitting

---

## 📁 Project layout

### Main files

- `src/App.tsx` — main application shell and permit dashboard
- `src/routes.tsx` — route definitions and auth guards
- `src/context/AuthContext.tsx` — authentication and profile logic
- `src/context/NotificationContext.tsx` — toast notification system
- `src/components/AppShell.tsx` — shared header, layout, and navigation
- `src/components/RequireAuth.tsx` — auth-protected route wrapper
- `src/components/PermitComposer.tsx` — permit creation form
- `src/components/PermitBoard.tsx` — permit workflow board
- `src/components/ExportPanel.tsx` — export controls and actions
- `src/components/Notifications.tsx` — toast rendering
- `src/services/firebase.ts` — Firebase SDK initialization
- `src/services/ptw.ts` — Firestore permit and audit helpers
- `src/services/exports.ts` — browser export utilities
- `src/types/permit.ts` — shared permit and configuration types
- `src/config/client.ts` — client-side defaults and branding
- `.firebaserc` — Firebase deployment aliases

---

## 🛠️ Setup guide

### Prerequisites

- Node.js 18+ or later
- npm 10+ or later
- Firebase CLI (optional)

### Install dependencies

```bash
npm install
```

### Environment variables

Create these files if they don’t exist:

- `.env.development`
- `.env.demo`
- `.env.production`

Add the Firebase values in each file:

```env
VITE_FIREBASE_API_KEY=YOUR_API_KEY
VITE_FIREBASE_AUTH_DOMAIN=YOUR_AUTH_DOMAIN
VITE_FIREBASE_PROJECT_ID=YOUR_PROJECT_ID
VITE_FIREBASE_STORAGE_BUCKET=YOUR_STORAGE_BUCKET
VITE_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
VITE_FIREBASE_APP_ID=YOUR_APP_ID
VITE_FIREBASE_MEASUREMENT_ID=YOUR_MEASUREMENT_ID
```

### Local development

```bash
npm run dev
```

### Build commands

```bash
npm run build
npm run preview
```

Optional modes:

```bash
npm run dev:demo
npm run build:demo
npm run build:prod
npm run preview:prod
```

---

## ☁️ Firebase configuration

This repository includes Firebase aliases in `.firebaserc`:

- `demo` → `hse-safelink`
- `prod` → `hse-safelink-prod`

Use the Firebase CLI like this:

```bash
npx firebase use demo
npx firebase deploy --project demo
```

```bash
npx firebase use prod
npx firebase deploy --project prod
```

---

## 🧠 Architecture overview

### Firebase initialization

`src/services/firebase.ts` is the single source of Firebase configuration.
It reads `VITE_FIREBASE_*` environment values and exports:

- `auth` for authentication flows
- `db` for Firestore database operations
- `storage` for future file handling

### Authentication and profile handling

`src/context/AuthContext.tsx` provides authentication and profile state.

It implements:

- `signIn(email, password)`
- `signInWithGoogle()`
- `signUp(email, password, name, phone)`
- `resetPassword(email)`
- `signOutUser()`

User profiles live in Firestore at:

- `companies/demo-company/users/{uid}`

Each profile contains:

- `uid`
- `email`
- `role`
- `name`
- `phone`
- `createdAt`

If a signed-in user has no profile, the app creates a fallback profile and defaults the role to `Field Supervisor`.

### Routes and access control

`src/routes.tsx` defines the app routes.

Protected pages:

- `/`
- `/permits`

Public pages:

- `/login`
- `/signup`

`RequireAuth` ensures only authenticated users can reach the dashboard.

### App shell and notifications

`AppShell` provides the shared header, navigation, and page layout.
`NotificationContext` powers toast messages for success, error, and info feedback.

### Permit dashboard flow

`src/App.tsx` loads permit data from Firestore and renders:

- `PermitComposer` — create new permits
- `PermitBoard` — view and update permit statuses
- `ExportPanel` — export current permit data

### Firestore model

The app stores data in the following structure:

- `companies/demo-company/config` — config documents
- `companies/demo-company/users/{uid}` — user profiles
- `companies/demo-company/sites/demo-site/permits/{permitId}` — permit documents
- `companies/demo-company/sites/demo-site/auditTrail/{auditId}` — audit events

### Default permit configuration

If configuration is missing, `ensurePermitConfig()` creates defaults:

- roles: `Field Supervisor`, `Area Authority`, `HSE Officer`, `Supervisor`, `Manager`, `Admin`
- workflow: `Draft`, `Pending Review`, `Pending Approval`, `Approved`, `Work in Progress`, `Closed`, `Rejected`, `Cancelled`
- permit types: `Hot Work`, `Confined Space`, `Electrical Isolation`, `Working at Height`, `Excavation / Earthworks`, `Line Breaking / Pipeline Maintenance`, `Mechanical Isolation`, `Permit Extension / Revalidation`, `Shutdown / Outage`, `Chemical Handling`, `Inspection / Survey`, `Temporary Power`
- sites: `Main Plant`, `Boiler House`, `Pump House`, `Compressor Station`, `Control Room`, `Storage Yard`, `Workshop`, `Tank Farm`, `Loading Bay`, `Service Platform`

### Recommended PTW permit categories

This app is designed for a general industrial plant-style PTW system. The standard permit categories available in the UI include:

- `Hot Work`
- `Cold Work`
- `Confined Space Entry`
- `Electrical Isolation / LOTO`
- `Mechanical Isolation`
- `Excavation / Earthworks`
- `Working at Height`
- `Temporary Power`
- `Shutdown / Outage`
- `Chemical Handling`
- `Inspection / Survey`
- `Permit Extension / Revalidation`

### Common site / location values

To support plant-style operations, the app uses generic site locations that can be adapted to any industrial facility:

- `Main Plant`
- `Boiler House`
- `Pump House`
- `Compressor Station`
- `Control Room`
- `Storage Yard`
- `Workshop`
- `Tank Farm`
- `Loading Bay`
- `Service Platform`

### Sample permit JSON schema

A typical permit object in this app follows this structure:

```json
{
  "title": "Hot Work - Tank 7 Welding",
  "description": "Weld repair on Tank 7 nozzle. Fire watch and gas monitoring required.",
  "permitType": "Hot Work",
  "siteId": "Tank Farm",
  "status": "Draft",
  "createdBy": "user-uid",
  "assignedTo": ["HSE Officer"],
  "customFields": {
    "Hazards": "Sparks, flame, heat",
    "Controls": "Fire watch, hot work blanket, PPE",
    "Authorized Personnel": "A. Patel, R. Kumar"
  }
}
```

### Permit creation

`PermitComposer` supports:

- title
- description
- permit type
- site/location
- dynamic custom fields

Custom field values are stored at `customFields` inside each permit.

### Workflow and status updates

`PermitBoard` renders each permit and allows workflow transitions.
Every status change calls `updatePermitStatus()` and writes an audit event.

### Export features

`ExportPanel` exports data to:

- PDF via `jsPDF` + `jspdf-autotable`
- Excel via `xlsx`
- PNG via HTML canvas image generation

## 🧪 How to learn this project

Follow this step-by-step path for full clarity:

1. Start with `src/services/firebase.ts` to understand the Firebase setup.
2. Read `src/context/AuthContext.tsx` for auth and profile loading.
3. Inspect `src/routes.tsx` and `src/components/RequireAuth.tsx` for routing rules.
4. Examine `src/App.tsx` to see the overall page composition.
5. Open `src/services/ptw.ts` to learn how permits and audit events are stored.
6. Review `src/components/PermitComposer.tsx` for dynamic form behavior.
7. Review `src/components/PermitBoard.tsx` for status changes and workflow logic.
8. Review `src/components/ExportPanel.tsx` and `src/services/exports.ts` for export flows.

This order walks you from initialization, to auth, to data, to UI, and finally to export.

---

## ✅ Key takeaways

## 📦 Commands summary

```bash
npm install
npm run dev
npm run build
npm run preview
```

Optional commands:

```bash
npm run dev:demo
npm run build:demo
npm run build:prod
npm run preview:prod
```

---

## 💡 Recommended next improvements

- Add Firestore security rules for role-based access
- Add an audit history page for permits
- Add permit filtering and search
- Add admin user/role management
- Add file attachment support

---

## 📝 Notes

Keep this README updated when you add new features, change exports, or modify Firebase deployment settings.

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
