# Authentication Components

This directory contains reusable authentication UI components for the Seedling platform.

## Components

### LoginForm.tsx
A complete login form with email and password fields.

**Features:**
- Email and password inputs with validation
- Loading state during authentication
- Error message display
- Automatic redirect to `/dashboard` on success
- Link to registration page
- Tailwind CSS styling

**Usage:**
```typescript
import { LoginForm } from '@/components/auth';

export default function LoginPage() {
  return <LoginForm />;
}
```

### RegisterForm.tsx
A complete registration form with username, email, and password fields.

**Features:**
- Username, email, and password inputs with validation
- Minimum password length (8 characters)
- Loading state during registration
- Error message display
- Auto-login on successful registration
- Redirect to `/dashboard` on success
- Link to login page
- Tailwind CSS styling

**Usage:**
```typescript
import { RegisterForm } from '@/components/auth';

export default function RegisterPage() {
  return <RegisterForm />;
}
```

### ProtectedRoute.tsx
A wrapper component that protects routes requiring authentication and/or specific roles.

**Features:**
- Checks authentication on mount
- Redirects to `/login` if not authenticated
- Shows loading spinner while checking
- Role-based access control
- Shows "Access Denied" message for unauthorized roles
- Option to specify required role

**Usage:**

Basic protection (requires authentication only):
```typescript
import { ProtectedRoute } from '@/components/auth';

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <div>Protected content here</div>
    </ProtectedRoute>
  );
}
```

Role-based protection (requires specific role):
```typescript
import { ProtectedRoute } from '@/components/auth';

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="ADMIN">
      <div>Admin-only content here</div>
    </ProtectedRoute>
  );
}
```

## Authentication Flow

### Login Flow
1. User enters email and password
2. Component calls `/auth/login` endpoint
3. On success:
   - Token is saved to localStorage
   - Auth state is updated via Zustand store
   - User is redirected to `/dashboard`
4. On error:
   - Error message is displayed to user

### Registration Flow
1. User enters username, email, and password
2. Component calls `/users` endpoint
3. On success:
   - Token is automatically saved (if returned)
   - User is auto-logged in
   - User is redirected to `/dashboard`
4. On error:
   - Error message is displayed to user

### Protected Route Flow
1. Component checks if user is authenticated
2. If not authenticated:
   - Redirects to `/login`
3. If authenticated but wrong role:
   - Shows "Access Denied" message
4. If authenticated and authorized:
   - Renders protected content

## Styling

All components use Tailwind CSS with:
- Indigo color scheme (indigo-600, indigo-700)
- Responsive design
- Proper focus states
- Loading and disabled states
- Error message styling (red-50, red-800)

## Error Handling

All forms handle errors gracefully:
- Network errors
- API errors (400, 401, 500)
- Validation errors
- Display user-friendly error messages

## Accessibility

Forms include:
- Proper label associations
- ARIA labels where needed
- Keyboard navigation support
- Focus states
- Required field indicators
