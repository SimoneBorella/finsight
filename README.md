# FinSight
Application to manage and extract insights on personal finances.


# Startup

## Environment Variables

Create a `.env` file in the root folder of the project with the following configuration:

```env
# --- Database Configuration ---
MONGO_INITDB_ROOT_USERNAME=db_admin_user
MONGO_INITDB_ROOT_PASSWORD=change_this_secure_password_123
MONGO_INITDB_DATABASE=app_database_name

# --- App Configuration ---
MONGODB_URI=mongodb://db_admin_user:change_this_secure_password_123@your-mongo-container:27017/app_database_name?authSource=admin
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your_super_long_random_secret_string_here_change_me

# NODE_ENV=production
NODE_ENV=development
```

## Start

```bash
docker compose build
```

```bash
docker compose up -d
```

## Admin user setup

Visit once to create admin user with name "admin" and password "admin":
```
http://localhost:3000/api/setup
```



