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

## 💡 Recommended next improvements

- Add Firestore security rules for role-based access
- Add an audit history page for permits
- Add permit filtering and search
- Add admin user/role management
- Add file attachment support
