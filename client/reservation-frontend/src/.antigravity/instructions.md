# Antigravity Agent Workspace Rules & System Directives

---

## 1. Core Tech Stack & Architecture
- **Frontend:** Next.js (App Router), React, TypeScript (strict mode), Tailwind CSS, Lucide Icons.
- **Backend API:** Node.js, Express, Next.js API Routes / Server Actions.
- **Database & Auth:** Supabase (PostgreSQL), Supabase Auth (`@supabase/ssr` / `@supabase/supabase-js`).
- **Validation & State:** Zod for schema validation, React Hooks / Context for state.

---

## 2. Code Quality & TypeScript Standards
- **Strict Typing:** Never use implicit or explicit `any`. Define strong interfaces or types for all components, API payloads, and database entities.
- **Component Architecture:** Keep UI components modular, clean, and reusable.
- **Clean Imports:** Group imports logically (external libraries -> internal alias components -> utilities/styles).

---

## 3. Database & Security Directives (Supabase)
- **Row Level Security (RLS):** Every database table MUST have Row Level Security enabled.
- **Policy Enforcement:** RLS policies must strictly enforce user ownership checks (`auth.uid() = owner_id`).
- **Key Safety:** Client-side code MUST ONLY use the Supabase Anon / Publishable key. Never expose the Service Role key.
- **Dynamic Queries:** Always use parameterized SQL or Supabase ORM methods. Never concatenate raw strings in SQL.

---

## 4. API & Input Validation (Express & Next.js Routes)
- **Zod Validation:** All incoming request bodies, query parameters, and URL route parameters MUST be validated against a Zod schema.
- **Structured Error Responses:** Return standard JSON error structures on failure.
- **HTTP Status Codes:** Use semantic HTTP status codes (`200`, `201`, `400`, `401`, `403`, `404`, `429`, `500`).
- **Try/Catch Blocks:** Wrap all async controller functions in structured `try/catch` blocks.

---

## 5. UI/UX & Design Polish Directives

You are encouraged to refine and uplift the visual hierarchy, layout spacing, and micro-interactions whenever you identify an opportunity to make the application feel more modern, cohesive, and enjoyable to use.

- **Design Aesthetic:**
  - **Minimalist & Editorial:** Clean layout structure, generous whitespace, sharp contrast, and modern typography.
  - **Color Palette:** Cohesive theme accents (e.g., subtle purple/indigo highlights, slate backgrounds, soft gray borders). Avoid harsh primary colors or unstyled default HTML elements.
- **Visual Feedback & Micro-Interactions:**
  - **Interactive States:** Add smooth hover, focus, and active transitions (`transition-all duration-200 hover:shadow-md cursor-pointer`) to all interactive buttons, cards, and links.
  - **Loading Feedback:** Replace static text loadings with animated spinners or skeleton shimmer loaders (`animate-pulse`).
  - **Empty States:** Design clean empty states featuring contextual Lucide icons and friendly call-to-action buttons when no data exists.
  - **Toast Notifications & Alerts:** Ensure form updates, success actions, and error states display clear, animated alert banners or toast messages.
- **Layout & Spacing Structure:**
  - Use responsive container padding (`px-4 sm:px-6 lg:px-8`) and grid gaps so layouts render cleanly on both mobile devices and wide monitors.
  - Standardize border radii (`rounded-xl` / `rounded-2xl`) and shadow elevations (`shadow-sm` / `shadow-md`) across all cards and modal dialogs.

---

## 6. Verification & Definition of Done

Before declaring any task or phase complete, you MUST execute the following verification steps:

1. **Type Checking & Linting:** Run the TypeScript compiler check and linter in the integrated terminal:
   ```bash
   npm run build