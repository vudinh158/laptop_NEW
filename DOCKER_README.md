# Docker Setup Guide

This guide will help you set up and run the Laptop Store application using Docker.

## Prerequisites

- Docker installed on your system
- Docker Compose installed
- Git (optional, for cloning the repository)

## Quick Start

### 1. Clone the repository (if not already done)

```bash
git clone <your-repo-url>
cd laptop-store
```

### 2. Environment Configuration

Copy the environment template and configure your settings:

```bash
cp env-example.txt .env
```

Edit `.env` with your actual configuration values. See the file for required variables.

### 3. Development Setup

For development with hot reload:

```bash
# Start all services
docker-compose up --build

# Or run in background
docker-compose up -d --build
```

The application will be available at:
- Frontend: http://localhost:3000
- Backend API: http://localhost:5000
- Recommendation Service: http://localhost:5001
- Database: localhost:5432

### 4. Production Setup

For production deployment:

```bash
# Build and start production services
docker-compose -f docker-compose.prod.yml up --build -d

# Or with nginx reverse proxy
docker-compose -f docker-compose.prod.yml --profile production up -d
```

## Services Overview

### Database (PostgreSQL)
- **Port:** 5432
- **Database:** laptop_store
- **User:** postgres

### Backend API Server (Node.js/Express)
- **Port:** 5000
- **Framework:** Express.js + Sequelize
- **Features:** Authentication, Orders, Products, Payments

### Frontend Client (React/Vite)
- **Port:** 3000 (dev) / 80 (prod)
- **Framework:** React 18 + Vite
- **Features:** Product catalog, Shopping cart, Checkout

### Recommendation Service (Python/Flask)
- **Port:** 5001
- **Framework:** Flask + scikit-learn
- **Features:** Product recommendations using KNN

### Nginx (Production Only)
- **Port:** 80 (HTTP) / 443 (HTTPS)
- **Features:** Reverse proxy, load balancing, SSL termination

## Development Workflow

### Starting Services

```bash
# Start all services
docker-compose up

# Start specific service
docker-compose up server
docker-compose up client
docker-compose up recommendation

# Rebuild after code changes
docker-compose up --build
```

### Viewing Logs

```bash
# All services
docker-compose logs -f

# Specific service
docker-compose logs -f server
docker-compose logs -f client
```

### Database Management

```bash
# Access PostgreSQL shell
docker-compose exec postgres psql -U postgres -d laptop_store

# Run migrations (if any)
docker-compose exec server npm run migrate

# Seed database
docker-compose exec server npm run seed
```

### Stopping Services

```bash
# Stop all services
docker-compose down

# Stop and remove volumes (WARNING: deletes data)
docker-compose down -v

# Stop production services
docker-compose -f docker-compose.prod.yml down
```

## Building for Production

### Manual Build

```bash
# Build all images
docker-compose build

# Build specific service
docker-compose build server

# Build production images
docker-compose -f docker-compose.prod.yml build
```

### CI/CD with GitHub Actions

The repository includes a GitHub Actions workflow (`.github/workflows/ci-cd.yml`) that:

1. **Tests** all services
2. **Builds** Docker images
3. **Pushes** to Docker Hub
4. **Deploys** to production server

#### Required Secrets for GitHub Actions:

Set these in your repository settings under "Secrets and variables" > "Actions":

```
DOCKERHUB_USERNAME=your_dockerhub_username
DOCKERHUB_TOKEN=your_dockerhub_access_token
SERVER_HOST=your_production_server_ip
SERVER_USER=your_server_username
SERVER_SSH_KEY=your_private_ssh_key
```

## Troubleshooting

### Common Issues

#### Port conflicts
If ports 3000, 5000, or 5432 are already in use:
```bash
# Check what's using the ports
lsof -i :3000
lsof -i :5000
lsof -i :5432

# Stop conflicting services or change ports in docker-compose.yml
```

#### Database connection issues
```bash
# Check if PostgreSQL is healthy
docker-compose ps postgres

# View database logs
docker-compose logs postgres

# Reset database
docker-compose down -v
docker-compose up postgres
```

#### Build failures
```bash
# Clear Docker cache
docker system prune -f

# Rebuild without cache
docker-compose build --no-cache
```

#### Permission issues
```bash
# Fix file permissions
sudo chown -R $USER:$USER .

# Or run with sudo
sudo docker-compose up
```

### Health Checks

All services include health checks. Monitor them with:

```bash
# Check service health
docker-compose ps

# View health status
docker inspect <container_name> | grep -A 10 "Health"
```

## File Structure

```
├── docker-compose.yml          # Development setup
├── docker-compose.prod.yml     # Production setup
├── env-example.txt             # Environment template
├── nginx/
│   └── nginx.conf              # Nginx configuration
├── server/
│   ├── Dockerfile              # Backend container config
│   └── .dockerignore           # Backend build exclusions
├── client/
│   ├── Dockerfile              # Frontend container config
│   └── .dockerignore           # Frontend build exclusions
├── recommendation_service/
│   ├── Dockerfile              # ML service container config
│   └── .dockerignore           # ML service build exclusions
└── .github/
    └── workflows/
        └── ci-cd.yml           # GitHub Actions CI/CD pipeline
```

## Performance Optimization

### For Production

1. **Enable Docker BuildKit:**
   ```bash
   export DOCKER_BUILDKIT=1
   ```

2. **Use multi-stage builds** (already implemented)

3. **Enable layer caching** with BuildKit

4. **Optimize Nginx configuration** for your needs

### Monitoring

Consider adding monitoring services:

```yaml
# Add to docker-compose.prod.yml
services:
  prometheus:
    image: prom/prometheus
    # ... config

  grafana:
    image: grafana/grafana
    # ... config
```

## Security Considerations

### For Production Deployment

1. **Change default passwords** in `.env`
2. **Use strong JWT secrets**
3. **Enable HTTPS** with SSL certificates
4. **Configure firewall** on your server
5. **Regular security updates** for base images
6. **Use Docker secrets** instead of environment variables for sensitive data

### SSL Configuration

For HTTPS in production:

1. Obtain SSL certificates (Let's Encrypt recommended)
2. Mount certificates in nginx container
3. Update nginx.conf to enable SSL
4. Redirect HTTP to HTTPS

## Support

If you encounter issues:

1. Check the logs: `docker-compose logs -f`
2. Verify environment variables in `.env`
3. Ensure all required ports are available
4. Check Docker and Docker Compose versions
5. Review the troubleshooting section above

For application-specific issues, refer to the main README.md file.
