# 🚀 Deployment Guide

This guide covers deploying your AI Tools Hub to various platforms.

## Pre-Deployment Checklist

- [ ] All features tested locally
- [ ] Environment variables documented
- [ ] Build succeeds (`npm run build`)
- [ ] No console errors in production mode
- [ ] Responsive design verified
- [ ] Dark/light modes work
- [ ] API keys secured
- [ ] Error handling implemented

## 🌐 Vercel (Recommended)

Vercel is the recommended platform as it's made by the Next.js team.

### Setup

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git remote add origin your-repo-url
   git push -u origin main
   ```

2. **Import to Vercel**
   - Go to [vercel.com](https://vercel.com)
   - Click "New Project"
   - Import your GitHub repository
   - Vercel auto-detects Next.js settings

3. **Add Environment Variables**
   - In project settings, go to "Environment Variables"
   - Add: `NEXT_PUBLIC_GEMINI_API_KEY`
   - Value: Your Gemini API key
   - Apply to: Production, Preview, Development

4. **Deploy**
   - Click "Deploy"
   - Wait for build to complete
   - Your site is live! 🎉

### Auto-Deployments

Vercel automatically deploys:
- **Production**: On push to `main` branch
- **Preview**: On pull requests

### Custom Domain

1. Go to project settings
2. Navigate to "Domains"
3. Add your custom domain
4. Update DNS records as instructed
5. SSL is automatic!

## 🔷 Netlify

### Setup

1. **Build Settings**
   ```
   Build command: npm run build
   Publish directory: .next
   ```

2. **Deploy**
   - Go to [netlify.com](https://netlify.com)
   - Click "Add new site" → "Import an existing project"
   - Connect to your Git repository
   - Configure build settings
   - Add environment variables
   - Deploy!

3. **Environment Variables**
   - Site settings → Build & deploy → Environment
   - Add `NEXT_PUBLIC_GEMINI_API_KEY`

### Netlify.toml (Optional)

```toml
[build]
  command = "npm run build"
  publish = ".next"

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

## 🐳 Docker

### Dockerfile

Already configured in `next.config.js` for Docker compatibility.

```dockerfile
# Create a Dockerfile
FROM node:18-alpine AS builder

WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:18-alpine AS runner
WORKDIR /app

ENV NODE_ENV production

COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static

EXPOSE 3000
ENV PORT 3000

CMD ["node", "server.js"]
```

### Docker Compose

```yaml
version: '3.8'
services:
  app:
    build: .
    ports:
      - "3000:3000"
    environment:
      - NEXT_PUBLIC_GEMINI_API_KEY=${NEXT_PUBLIC_GEMINI_API_KEY}
    restart: unless-stopped
```

### Deploy

```bash
docker build -t ai-tools-hub .
docker run -p 3000:3000 -e NEXT_PUBLIC_GEMINI_API_KEY=your_key ai-tools-hub
```

## ☁️ AWS (EC2 + Nginx)

### 1. Launch EC2 Instance

- Choose Ubuntu 22.04 LTS
- t2.micro (free tier) or larger
- Configure security group: Allow HTTP (80), HTTPS (443), SSH (22)

### 2. Install Dependencies

```bash
# Connect via SSH
ssh -i your-key.pem ubuntu@your-ec2-ip

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Install PM2
sudo npm install -g pm2

# Install Nginx
sudo apt install -y nginx
```

### 3. Deploy Application

```bash
# Clone repository
git clone your-repo-url
cd tools-hub

# Install dependencies
npm install

# Create .env file
nano .env
# Add: NEXT_PUBLIC_GEMINI_API_KEY=your_key

# Build
npm run build

# Start with PM2
pm2 start npm --name "ai-tools-hub" -- start
pm2 save
pm2 startup
```

### 4. Configure Nginx

```bash
sudo nano /etc/nginx/sites-available/ai-tools-hub
```

Add:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

Enable site:

```bash
sudo ln -s /etc/nginx/sites-available/ai-tools-hub /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl restart nginx
```

### 5. SSL with Let's Encrypt

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
```

## 🔒 Environment Variables Security

### Development

```env
# .env (never commit this)
NEXT_PUBLIC_GEMINI_API_KEY=actual_key_here
```

### Production

**Option 1: Platform UI**
- Add via Vercel/Netlify dashboard
- Most secure for sensitive data

**Option 2: CI/CD Secrets**
- Use GitHub Secrets for workflows
- Access via `${{ secrets.YOUR_SECRET }}`

**Option 3: Environment Files**
```bash
# On server only
export NEXT_PUBLIC_GEMINI_API_KEY=your_key
```

## 📊 Monitoring & Analytics

### Vercel Analytics

```bash
npm install @vercel/analytics
```

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Error Tracking (Sentry)

```bash
npm install @sentry/nextjs
```

Follow Sentry setup wizard for Next.js.

### Google Analytics

```typescript
// app/layout.tsx
<Script
  src={`https://www.googletagmanager.com/gtag/js?id=YOUR_GA_ID`}
  strategy="afterInteractive"
/>
```

## 🔧 Performance Optimization

### 1. Image Optimization

Use Next.js Image component:

```typescript
import Image from 'next/image';

<Image
  src="/image.png"
  alt="Description"
  width={500}
  height={300}
  priority // For above-the-fold images
/>
```

### 2. Dynamic Imports

```typescript
import dynamic from 'next/dynamic';

const HeavyComponent = dynamic(() => import('./HeavyComponent'), {
  loading: () => <p>Loading...</p>,
  ssr: false, // Disable SSR for this component
});
```

### 3. Caching

Configure Next.js caching:

```typescript
// next.config.js
module.exports = {
  async headers() {
    return [
      {
        source: '/static/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
          },
        ],
      },
    ];
  },
};
```

## 🚨 Troubleshooting

### Build Fails

**Issue**: Module not found
```bash
# Solution
rm -rf node_modules package-lock.json
npm install
```

**Issue**: Out of memory
```bash
# Solution: Increase Node memory
NODE_OPTIONS=--max-old-space-size=4096 npm run build
```

### Runtime Errors

**Issue**: API key not found
- Check environment variables are set
- Restart the server after adding env vars
- Verify variable names match exactly

**Issue**: CORS errors
- Ensure API routes are properly configured
- Check Next.js API route handlers

### Performance Issues

**Issue**: Slow page loads
- Enable Next.js Image optimization
- Implement lazy loading
- Check bundle size: `npm run build` shows sizes
- Use React.memo for heavy components

## 📈 Scaling Considerations

### Load Balancing

For high traffic:
1. Deploy to multiple regions (Vercel Edge)
2. Use CDN for static assets
3. Implement request queuing for AI calls
4. Add rate limiting

### Database Addition

When you add user features:
1. Choose database (PostgreSQL, MongoDB, etc.)
2. Use Prisma or similar ORM
3. Implement connection pooling
4. Add database migrations

### Serverless Functions

Separate heavy processing:
1. Move AI calls to serverless functions
2. Implement queue system (Bull/BeeQueue)
3. Add webhook handlers
4. Use background jobs

## ✅ Post-Deployment

- [ ] Test all features in production
- [ ] Verify SSL certificate
- [ ] Check mobile responsiveness
- [ ] Monitor error logs
- [ ] Set up analytics
- [ ] Configure custom domain
- [ ] Add to portfolio/CV
- [ ] Share with users!

## 📞 Support

- **Vercel**: [vercel.com/support](https://vercel.com/support)
- **Netlify**: [docs.netlify.com](https://docs.netlify.com)
- **Next.js**: [nextjs.org/docs](https://nextjs.org/docs)

---

Your AI Tools Hub is now live! 🎉 Share it with the world!
