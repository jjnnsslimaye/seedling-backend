# FastAPI Project

A modern FastAPI application with async/await support, SQLAlchemy, JWT authentication, and best practices.

## Project Structure

```
app/
├── api/
│   └── routes/
│       ├── auth.py          # Authentication endpoints
│       ├── health.py        # Health check endpoints
│       └── users.py         # User CRUD endpoints
├── core/
│   └── security.py          # Security utilities (JWT, password hashing)
├── models/
│   └── user.py              # SQLAlchemy models
├── schemas/
│   ├── token.py             # Token Pydantic schemas
│   └── user.py              # User Pydantic schemas
├── config.py                # Application settings
├── database.py              # Database connection and session
└── main.py                  # Application entry point
```

## Features

- **FastAPI** with async/await support
- **SQLAlchemy 2.0** with async engine
- **JWT Authentication** with OAuth2 password flow
- **Password Hashing** using bcrypt
- **Pydantic v2** for data validation
- **Environment-based Configuration** using pydantic-settings
- **CORS Middleware** configured
- **Modern Python** with type hints

## Setup

1. Create a virtual environment:
```bash
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

2. Install dependencies:
```bash
pip install -r requirements.txt
```

3. Create environment file:
```bash
cp .env.example .env
```

4. Update the `.env` file with your settings, especially the `SECRET_KEY`:
```bash
# Generate a secure secret key
openssl rand -hex 32
```

## Running the Application

```bash
# Development mode with auto-reload
uvicorn app.main:app --reload

# Production mode
python -m app.main
```

The API will be available at `http://localhost:8000`

## API Documentation

Once running, visit:
- Swagger UI: `http://localhost:8000/docs`
- ReDoc: `http://localhost:8000/redoc`

## API Endpoints

### Health
- `GET /health` - Health check
- `GET /` - Root endpoint

### Authentication
- `POST /api/v1/auth/login` - Login and get JWT token

### Users
- `POST /api/v1/users/` - Create a new user
- `GET /api/v1/users/me` - Get current user (requires authentication)
- `GET /api/v1/users/{user_id}` - Get user by ID
- `PATCH /api/v1/users/me` - Update current user (requires authentication)

## Usage Example

1. Create a user:
```bash
curl -X POST "http://localhost:8000/api/v1/users/" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "username": "testuser",
    "password": "securepassword123"
  }'
```

2. Login to get a token:
```bash
curl -X POST "http://localhost:8000/api/v1/auth/login" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=testuser&password=securepassword123"
```

3. Use the token to access protected endpoints:
```bash
curl -X GET "http://localhost:8000/api/v1/users/me" \
  -H "Authorization: Bearer YOUR_ACCESS_TOKEN"
```

## Development

### Database Migrations

For production, consider using Alembic for database migrations:
```bash
pip install alembic
alembic init migrations
```

### Testing

Add pytest for testing:
```bash
pip install pytest pytest-asyncio httpx
```

## Security Notes

- Change the `SECRET_KEY` in production
- Use a proper database (PostgreSQL, MySQL) instead of SQLite for production
- Implement rate limiting for authentication endpoints
- Add input validation and sanitization
- Enable HTTPS in production
- Review and update CORS settings for production

## License

MIT
