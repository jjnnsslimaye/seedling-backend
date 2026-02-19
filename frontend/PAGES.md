# Seedling Frontend Pages

## Current Pages

### Public Pages

#### `/` - Home Page (`app/page.tsx`)
**Status:** ✅ Complete

- Hero section with Seedling branding
- "Welcome to Seedling" headline
- Call-to-action buttons (Browse Competitions, Get Started)
- Three feature cards (Compete, Win Prizes, Get Feedback)
- Bottom CTA section with sign-up prompt
- Fully styled with Tailwind CSS

#### `/login` - Login Page (`app/login/page.tsx`)
**Status:** ✅ Complete

- Renders `LoginForm` component
- Email and password inputs
- Error handling and validation
- Redirects to `/dashboard` on success
- Link to registration page

#### `/register` - Register Page (`app/register/page.tsx`)
**Status:** ✅ Complete

- Renders `RegisterForm` component
- Username, email, and password inputs
- Auto-login on successful registration
- Redirects to `/dashboard` on success
- Link to login page

#### `/competitions` - Competitions Listing (`app/competitions/page.tsx`)
**Status:** 🚧 Placeholder

- Placeholder page with info cards
- Shows "Competition listings will appear here"
- Describes what will be available:
  - Active competitions to enter
  - Competition details, prizes, deadlines
  - Entry requirements and guidelines
  - Filter and search functionality
- **TODO:** Implement in Phase 2

### Protected Pages

#### `/dashboard` - Founder Dashboard (`app/dashboard/page.tsx`)
**Status:** ✅ Basic UI Complete

**Protection:** Requires FOUNDER role

Features:
- Protected with `ProtectedRoute` component
- Welcome message with username
- "My Submissions" section (currently empty)
- "Browse Competitions" CTA button
- Quick stats cards:
  - Total Submissions (0)
  - Active Competitions (0)
  - Total Winnings ($0)
- **TODO:** Connect to real data in Phase 2

## Pages To Be Created (Phase 2+)

### Founder Pages
- `/dashboard/submissions` - Detailed submissions list
- `/dashboard/submissions/[id]` - Individual submission view
- `/dashboard/submissions/new` - Create new submission
- `/payouts` - Payout status and history
- `/competitions/[id]` - Competition detail page

### Judge Pages
- `/judge/dashboard` - Judge dashboard with assignments
- `/judge/submissions/[id]` - Review submission

### Admin Pages
- `/admin` - Admin panel
- `/admin/competitions` - Manage competitions
- `/admin/users` - Manage users
- `/admin/payouts` - Manage payouts

### General Pages
- `/about` - About page
- `/contact` - Contact page
- `/terms` - Terms of service
- `/privacy` - Privacy policy

## Navigation Flow

### Unauthenticated Users
1. Land on `/` (home page)
2. Can navigate to `/competitions` (view only)
3. Click "Login" or "Register" in navbar
4. After login: redirected to `/dashboard`

### Authenticated Founders
1. After login: see `/dashboard`
2. Can navigate to:
   - `/competitions` - Browse and enter
   - `/dashboard` - View submissions
   - `/payouts` - Check winnings
3. Logout returns to `/`

### Authenticated Judges
1. After login: redirected to `/judge/dashboard`
2. Can view assigned submissions
3. Submit reviews and scores

### Authenticated Admins
1. After login: access `/admin` panel
2. Can manage all aspects of platform

## Layout Structure

All pages share:
- `Navbar` - Sticky top navigation with role-based links
- `Footer` - Bottom footer with links
- `QueryProvider` - React Query wrapper
- Responsive design with Tailwind CSS

Protected pages use `ProtectedRoute` component for authentication/authorization.
