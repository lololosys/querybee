# QueryBee Docker Setup

This guide explains how to run QueryBee using Docker and Docker Compose.

## Prerequisites

- Docker (version 20.10 or higher)
- Docker Compose (version 2.0 or higher)

## Quick Start

1. **Clone the repository and navigate to the project directory:**

   ```bash
   cd QueryBee
   ```

2. **Create environment file:**

   ```bash
   cp .env.example .env
   ```

   Edit `.env` file with your configuration if needed.

3. **Build and start the services:**

   ```bash
   docker-compose up --build
   ```

4. **Access the application:**
   - Application: http://localhost:3000
   - PostgreSQL: localhost:5432
   - Redis: localhost:6379

## Services Included

- **QueryBee App**: Next.js application (port 3000)
- **PostgreSQL**: Database server (port 5432)
- **Redis**: Session storage and caching (port 6379)
- **Nginx**: Reverse proxy and load balancer (port 80)

## Environment Variables

Create a `.env` file with the following variables:

```env
# Database Configuration
DATABASE_URL="postgresql://querybee:querybee_password@postgres:5432/querybee"

# NextAuth Configuration
NEXTAUTH_SECRET="your-super-secret-key-here-change-this-in-production"
NEXTAUTH_URL="http://localhost:3000"

# Application Configuration
NODE_ENV="production"
PORT=3000
```

## Database Access

The PostgreSQL database is initialized with sample data:

- **Database**: querybee
- **Username**: querybee
- **Password**: querybee_password
- **Port**: 5432

Sample tables:

- `users` - Sample user data
- `products` - Sample product data

## Docker Commands

### Build and start all services:

```bash
docker-compose up --build
```

### Start services in background:

```bash
docker-compose up -d
```

### Stop all services:

```bash
docker-compose down
```

### Stop and remove volumes (WARNING: This will delete all data):

```bash
docker-compose down -v
```

### View logs:

```bash
# All services
docker-compose logs

# Specific service
docker-compose logs querybee
docker-compose logs postgres
```

### Access database directly:

```bash
docker-compose exec postgres psql -U querybee -d querybee
```

### Rebuild a specific service:

```bash
docker-compose up --build querybee
```

## Production Deployment

For production deployment:

1. **Update environment variables** in `.env`:

   - Change `NEXTAUTH_SECRET` to a secure random string
   - Update `NEXTAUTH_URL` to your domain
   - Configure proper `DATABASE_URL` if using external database

2. **Configure SSL** (optional):

   - Place SSL certificates in `./ssl/` directory
   - Update `nginx.conf` to enable HTTPS

3. **Use external database** (recommended for production):

   - Update `DATABASE_URL` in `.env`
   - Remove or comment out the `postgres` service in `docker-compose.yml`

4. **Scale the application**:
   ```bash
   docker-compose up --scale querybee=3
   ```

## Troubleshooting

### Port conflicts:

If ports 3000, 5432, or 6379 are already in use, update the port mappings in `docker-compose.yml`.

### Database connection issues:

- Ensure PostgreSQL container is running: `docker-compose ps`
- Check database logs: `docker-compose logs postgres`
- Verify connection string in `.env`

### Application not starting:

- Check application logs: `docker-compose logs querybee`
- Ensure all environment variables are set correctly
- Verify the build completed successfully

### Memory issues:

- Increase Docker memory limit
- Consider using external database for production

## Development

For development with hot reload:

```bash
# Start only the database services
docker-compose up postgres redis

# Run the app locally
npm run dev
```

This allows you to develop with live reload while using the containerized database.
