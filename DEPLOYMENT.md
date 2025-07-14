# RecovR Deployment Guide

This guide covers multiple deployment options for the RecovR addiction recovery platform.

## 🚀 Quick Deployment Options

### Option 1: Vercel (Frontend) + Railway/Render (Backend)
**Best for**: Quick deployment with minimal configuration
**Cost**: Free tier available, scales with usage

1. **Deploy Frontend to Vercel**:
   ```bash
   npm install -g vercel
   vercel login
   vercel --prod
   ```

2. **Deploy Backend to Railway**:
   - Connect your GitHub repository to Railway
   - Set environment variables
   - Deploy automatically on push

### Option 2: Docker + DigitalOcean/AWS
**Best for**: Full control and scalability
**Cost**: ~$20-50/month for small scale

### Option 3: All-in-One Platforms (Heroku, Render)
**Best for**: Simplicity and built-in database
**Cost**: ~$25-100/month

## 📋 Pre-Deployment Checklist

### 1. Environment Variables Setup
Copy `.env.example` to `.env` and configure:

```bash
# Required for production
DATABASE_URL=postgresql://user:pass@host:5432/dbname
JWT_SECRET=your-super-secure-jwt-secret-256-bits
JWT_REFRESH_SECRET=your-refresh-secret-256-bits
FRONTEND_URL=https://your-domain.com

# Optional AI features (coming soon)
AI_CHATBOT_ENABLED=false
OPENAI_API_KEY=your-openai-key
```

### 2. Database Setup
- Create PostgreSQL database
- Run migrations: `npm run db:migrate`
- Seed initial data: `npm run db:seed`

### 3. Security Configuration
- Generate secure JWT secrets (256-bit)
- Configure CORS origins
- Set up SSL certificates
- Enable rate limiting

## 🌐 Detailed Deployment Instructions

### Vercel (Frontend Only)

1. **Install Vercel CLI**:
   ```bash
   npm i -g vercel
   ```

2. **Login and Deploy**:
   ```bash
   vercel login
   vercel --prod
   ```

3. **Configure Environment Variables**:
   ```bash
   vercel env add VITE_API_URL production
   # Enter your backend API URL
   ```

4. **Set up Custom Domain** (Optional):
   - Add domain in Vercel dashboard
   - Configure DNS records

### Railway (Full-Stack)

1. **Connect Repository**:
   - Go to [Railway](https://railway.app)
   - Connect your GitHub repository
   - Select the RecovR repository

2. **Configure Services**:
   ```yaml
   # railway.json
   {
     "build": {
       "builder": "NIXPACKS"
     },
     "deploy": {
       "startCommand": "npm start",
       "healthcheckPath": "/api/health"
     }
   }
   ```

3. **Add PostgreSQL Database**:
   - Add PostgreSQL service in Railway
   - Copy connection string to environment variables

4. **Set Environment Variables**:
   ```
   DATABASE_URL=postgresql://...
   JWT_SECRET=your-secret
   JWT_REFRESH_SECRET=your-refresh-secret
   NODE_ENV=production
   PORT=5000
   ```

### Docker Deployment

1. **Build and Run Locally**:
   ```bash
   # Build the image
   docker build -t recovr-app .
   
   # Run with Docker Compose
   docker-compose up -d
   ```

2. **Deploy to DigitalOcean**:
   ```bash
   # Create droplet
   doctl compute droplet create recovr-prod \
     --size s-2vcpu-4gb \
     --image docker-20-04 \
     --region nyc1
   
   # Copy files and deploy
   scp -r . root@your-droplet-ip:/opt/recovr
   ssh root@your-droplet-ip
   cd /opt/recovr
   docker-compose up -d
   ```

### AWS ECS Deployment

1. **Create ECR Repository**:
   ```bash
   aws ecr create-repository --repository-name recovr-app
   ```

2. **Build and Push Image**:
   ```bash
   # Get login token
   aws ecr get-login-password --region us-east-1 | docker login --username AWS --password-stdin your-account.dkr.ecr.us-east-1.amazonaws.com
   
   # Build and tag
   docker build -t recovr-app .
   docker tag recovr-app:latest your-account.dkr.ecr.us-east-1.amazonaws.com/recovr-app:latest
   
   # Push
   docker push your-account.dkr.ecr.us-east-1.amazonaws.com/recovr-app:latest
   ```

3. **Create ECS Service**:
   - Use AWS Console or CLI to create ECS cluster
   - Create task definition with environment variables
   - Create service with load balancer

## 🗄️ Database Migration

### Initial Setup
```bash
# Create database
createdb recovr_production

# Run migrations
NODE_ENV=production npm run db:migrate

# Seed initial data (optional)
NODE_ENV=production npm run db:seed
```

### AI Chatbot Schema (When Ready)
```bash
# Apply chatbot schema
psql $DATABASE_URL -f server/database/chatbot-schema.sql
```

## 🔒 Security Configuration

### SSL/TLS Setup
1. **Let's Encrypt (Free)**:
   ```bash
   certbot --nginx -d your-domain.com
   ```

2. **Cloudflare (Recommended)**:
   - Add domain to Cloudflare
   - Enable proxy and SSL
   - Configure security settings

### Environment Security
```bash
# Generate secure secrets
openssl rand -hex 32  # For JWT_SECRET
openssl rand -hex 32  # For JWT_REFRESH_SECRET
openssl rand -hex 32  # For CHAT_ENCRYPTION_KEY
```

## 📊 Monitoring and Logging

### Health Checks
- Endpoint: `/api/health`
- Expected response: `{"status": "OK"}`

### Logging Setup
```javascript
// Winston logging (already configured)
// Logs available at: /app/logs/
```

### Error Tracking (Optional)
```bash
# Add Sentry for error tracking
npm install @sentry/node
# Configure SENTRY_DSN in environment
```

## 🔄 CI/CD Pipeline

### GitHub Actions (Included)
The repository includes automated deployment:
- Runs tests on pull requests
- Deploys to staging on PR
- Deploys to production on main branch push

### Required GitHub Secrets
```
VERCEL_TOKEN=your-vercel-token
VERCEL_ORG_ID=your-org-id
VERCEL_PROJECT_ID=your-project-id
DATABASE_URL=your-production-db-url
PRODUCTION_API_URL=https://your-api.com
STAGING_API_URL=https://staging-api.com
```

## 🧪 Testing Deployment

### Pre-Production Checklist
- [ ] Frontend loads correctly
- [ ] API endpoints respond
- [ ] Database connection works
- [ ] Authentication flow works
- [ ] File uploads work (if applicable)
- [ ] Crisis support features work
- [ ] PWA installation works on mobile

### Load Testing
```bash
# Install Apache Bench
sudo apt-get install apache2-utils

# Test API endpoints
ab -n 1000 -c 10 https://your-api.com/api/health
```

## 📈 Scaling Considerations

### Database Optimization
- Enable connection pooling
- Set up read replicas for heavy queries
- Consider Redis for session storage

### CDN Setup
- Use Cloudflare or AWS CloudFront
- Configure caching for static assets
- Enable gzip compression

### Performance Monitoring
- Set up APM (New Relic, DataDog)
- Monitor database performance
- Track user experience metrics

## 🆘 Troubleshooting

### Common Issues

1. **Database Connection Failed**:
   ```bash
   # Check connection string
   psql $DATABASE_URL
   
   # Verify firewall rules
   telnet your-db-host 5432
   ```

2. **JWT Token Issues**:
   ```bash
   # Verify JWT secrets are set
   echo $JWT_SECRET
   
   # Check token generation
   curl -X POST https://your-api.com/api/auth/login
   ```

3. **CORS Errors**:
   ```bash
   # Verify FRONTEND_URL is correct
   # Check browser network tab for actual error
   ```

### Getting Help
- Check application logs: `/app/logs/`
- Monitor health endpoint: `/api/health`
- Review GitHub Actions for deployment errors
- Check database logs for connection issues

## 💰 Cost Estimation

### Small Scale (0-1k users)
- **Vercel + Railway**: $0-25/month
- **DigitalOcean**: $20-40/month
- **AWS**: $30-60/month

### Medium Scale (1k-10k users)
- **Railway Pro**: $50-150/month
- **DigitalOcean**: $100-300/month
- **AWS**: $200-500/month

### Enterprise Scale (10k+ users)
- Custom infrastructure
- Database clustering
- Multi-region deployment
- $500-2000+/month

## 🎯 Production Optimization

### Performance
- Enable gzip compression
- Set up CDN for static assets
- Optimize database queries
- Implement caching strategies

### Security
- Regular security audits
- Keep dependencies updated
- Monitor for vulnerabilities
- Implement rate limiting

### Reliability
- Set up monitoring alerts
- Implement graceful shutdown
- Configure health checks
- Plan backup strategies

---

**Need help?** Create an issue in the GitHub repository or contact the development team.