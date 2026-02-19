# Seedling Frontend

Next.js 14 frontend for the Seedling startup competition platform.

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS v4
- **State Management:** Zustand
- **Data Fetching:** React Query (TanStack Query)
- **HTTP Client:** Axios
- **Authentication:** JWT with localStorage
- **Payments:** Stripe

## Getting Started

### Prerequisites

- Node.js 18+ installed
- Backend API running on `http://localhost:8000`

### Installation

```bash
npm install
```

### Environment Setup

Create `.env.local` file:

```env
NEXT_PUBLIC_API_URL=http://localhost:8000/api/v1
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=your_stripe_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

## Features

### Authentication
- JWT-based authentication with role support (FOUNDER, JUDGE, ADMIN)
- Protected routes with automatic redirects
- Persistent sessions via localStorage

### Pages
- ✅ Home page with hero and features
- ✅ Login/Register pages
- ✅ Founder dashboard
- 🚧 Competitions listing (placeholder)

### Components
- Responsive navbar with role-based navigation
- Auth forms with validation
- Protected route wrapper
- Mobile-friendly design

## Project Structure

See `PAGES.md` for complete page documentation.

```
app/                    # Next.js pages
components/             # React components
  auth/                # Authentication components
  layout/              # Navbar, Footer
  providers/           # React Query provider
hooks/                 # Custom hooks
store/                 # Zustand stores
lib/                   # Utilities and API client
```

## Scripts

```bash
npm run dev      # Development server
npm run build    # Production build
npm start        # Production server
npm run lint     # Run linter
```

## Documentation

- `PAGES.md` - Complete page structure
- `lib/README.md` - Authentication system
- `components/auth/README.md` - Auth components
