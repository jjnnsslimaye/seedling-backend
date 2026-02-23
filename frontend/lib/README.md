# Authentication System

This directory contains the core authentication utilities for the Seedling platform.

## Files

### `types.ts`
TypeScript type definitions for API entities (User, Competition, Submission, etc.)

### `api.ts`
Axios client with authentication interceptors:
- Automatically adds Bearer token to requests
- Handles 401 errors by redirecting to login
- Exports configured `api` instance

### `auth.ts`
Token management utilities:
- `saveToken(token)` - Save to localStorage
- `getToken()` - Retrieve from localStorage
- `removeToken()` - Clear from localStorage
- `decodeToken(token)` - Decode JWT
- `isAuthenticated()` - Check if user has valid token
- `getUserRole()` - Get current user's role
- `getCurrentUser()` - Get full user object

## Usage

### Making API Calls

```typescript
import { api } from '@/lib/api';
import { Competition } from '@/lib/types';

// GET request
const response = await api.get<Competition[]>('/competitions');

// POST request
const response = await api.post('/submissions', {
  title: 'My Submission',
  competition_id: 1,
});
```

### Using the Auth Hook

```typescript
'use client';

import { useAuth } from '@/hooks/useAuth';

export default function MyComponent() {
  const { user, isAuthenticated, login, logout, isRole } = useAuth();

  if (!isAuthenticated) {
    return <div>Please log in</div>;
  }

  return (
    <div>
      <p>Welcome, {user?.username}!</p>
      {isRole('ADMIN') && <AdminPanel />}
      <button onClick={logout}>Logout</button>
    </div>
  );
}
```

### Login Flow

```typescript
import { useAuth } from '@/hooks/useAuth';
import { api } from '@/lib/api';

const { login } = useAuth();

// Call login API
const response = await api.post('/auth/login', {
  username: 'user@example.com',
  password: 'password',
});

// Save token and update state
login(response.data.access_token);

// Now authenticated! API calls will include token
```

### Logout Flow

```typescript
import { useAuth } from '@/hooks/useAuth';

const { logout } = useAuth();

// Clear token and state
logout();

// Redirect to login page
router.push('/login');
```

## Store Structure

The Zustand store (`store/authStore.ts`) maintains:
- `user: User | null` - Current user object
- `token: string | null` - JWT token
- `isAuthenticated: boolean` - Authentication status

State is automatically initialized from localStorage on app load.
