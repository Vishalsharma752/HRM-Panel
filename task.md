# Tasks: Attendance Session Verification Upgrades with Fallback

- `[x]` Implement fallback auth pattern (checking local `getSession` first, then trying network `getUser`) inside `handleSecureCheckIn` and `handleSecureCheckOut` in `Attendance.tsx`
- `[x]` Fallback to parsing `currentUser.id` into a UUID format for fallback credentials accounts
- `[x]` Create database migration `migration_attendance_anon_fallback.sql` to support unauthenticated insertions of fallback UUID format check-ins
- `[x]` Remove automatic sign-out and redirect to "/" during check-in/out auth check blocks; output toast error message instead
- `[x]` Add temporary debug logs to output session parameters
- `[x]` Validate that module-level Supabase client is a singleton inside `supabase.ts`
- `[x]` Confirm zero compile warnings/errors via production build
