# AI Writing Companion - Direct GitHub + Render Deployment

## Quick Start Guide

This guide will help you deploy the AI Writing Companion application directly from GitHub to Render without any local setup required.

## Prerequisites

- **GitHub Account**
- **Render Account** (free tier available)
- **Anthropic Claude API Key**
- **Wasabi Storage Account** (S3-compatible) or AWS S3

## Step-by-Step Deployment

### 1. Create GitHub Repository

1. **Create new repository** on GitHub:
   - Go to [GitHub](https://github.com) and click "New repository"
   - Name: `ai-writing-companion`
   - Set to Public (or Private if you have a paid plan)
   - Initialize with README

2. **Upload the code** using GitHub's web interface:
   - Click "uploading an existing file" 
   - Create the folder structure and upload files according to the project structure
   - Or use GitHub Desktop/command line if you prefer

### 2. Get Required API Keys

**Anthropic Claude API Key:**
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign up/login and create an API key
3. Copy the key (starts with `sk-ant-api03-`)
4. **Important:** Keep this secure - you'll need it for Render

**Wasabi Storage Setup:**
1. Sign up at [Wasabi](https://wasabi.com) (or use AWS S3)
2. Create a new bucket:
   - Bucket name: `ai-writing-companion-files`
   - Region: `us-east-1` (recommended)
   - Make it private (not public)
3. Get credentials:
   - Go to Account → Access Keys
   - Create new access key pair
   - Save both Access Key and Secret Key

## Deployment to Render

### 1. Prepare Your Repository

Make sure your code is pushed to GitHub:

```bash
git add .
git commit -m "Initial commit"
git push origin main
```

### 2. Get Required API Keys

**Anthropic Claude API:**
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Create an API key
3. Copy the key (starts with `sk-ant-api03-`)

**Wasabi Storage:**
1. Sign up at [Wasabi](https://wasabi.com)
2. Create a bucket named `ai-writing-companion-files`
3. Get your access key and secret key from the account settings

# AI Writing Companion - Direct GitHub + Render Deployment

## Quick Start Guide

This guide will help you deploy the AI Writing Companion application directly from GitHub to Render without any local setup required.

## Prerequisites

- **GitHub Account**
- **Render Account** (free tier available)
- **Anthropic Claude API Key**
- **Wasabi Storage Account** (S3-compatible) or AWS S3

## Step-by-Step Deployment

### 1. Create GitHub Repository

1. **Create new repository** on GitHub:
   - Go to [GitHub](https://github.com) and click "New repository"
   - Name: `ai-writing-companion`
   - Set to Public (or Private if you have a paid plan)
   - Initialize with README

2. **Upload the code** using GitHub's web interface:
   - Click "uploading an existing file" 
   - Create the folder structure and upload files according to the project structure
   - Or use GitHub Desktop/command line if you prefer

### 2. Get Required API Keys

**Anthropic Claude API Key:**
1. Go to [Anthropic Console](https://console.anthropic.com)
2. Sign up/login and create an API key
3. Copy the key (starts with `sk-ant-api03-`)
4. **Important:** Keep this secure - you'll need it for Render

**Wasabi Storage Setup:**
1. Sign up at [Wasabi](https://wasabi.com) (or use AWS S3)
2. Create a new bucket:
   - Bucket name: `ai-writing-companion-files`
   - Region: `us-east-1` (recommended)
   - Make it private (not public)
3. Get credentials:
   - Go to Account → Access Keys
   - Create new access key pair
   - Save both Access Key and Secret Key

### 3. Deploy to Render

1. **Sign up for Render:**
   - Go to [Render](https://render.com)
   - Sign up using your GitHub account (recommended)
   - This will automatically connect your GitHub repositories

2. **Create Blueprint Deployment:**
   - Click "New +" in Render dashboard
   - Select "Blueprint"
   - Choose your `ai-writing-companion` repository
   - Render will detect the `render.yaml` file automatically

3. **Configure Environment Variables:**
   
   Before clicking "Apply", you need to set these environment variables:

   **For the API Service (`ai-writing-companion-api`):**
   ```
   ANTHROPIC_API_KEY = sk-ant-api03-your-claude-key-here
   WASABI_ACCESS_KEY = your-wasabi-access-key
   WASABI_SECRET_KEY = your-wasabi-secret-key
   WASABI_BUCKET_NAME = ai-writing-companion-files
   WASABI_REGION = us-east-1
   WASABI_ENDPOINT = https://s3.wasabisys.com
   FROM_EMAIL = noreply@yourcompany.com
   JWT_EXPIRES_IN = 7d
   ```

   **Note:** The following are automatically handled by Render:
   - `DATABASE_URL` (connected to your PostgreSQL database)
   - `JWT_SECRET` (auto-generated secure value)
   - `FRONTEND_URL` (linked to your frontend service)
   - `NODE_ENV` (set to production)

4. **Deploy:**
   - Click "Apply" to start deployment
   - Render will create:
     - ✅ PostgreSQL database (`ai-writing-companion-db`)
     - ✅ Backend API service (`ai-writing-companion-api`)
     - ✅ Frontend static site (`ai-writing-companion-frontend`)

5. **Wait for Deployment:**
   - Initial deployment takes 5-10 minutes
   - Monitor progress in the Render dashboard
   - All services should show "Live" status when complete

### 4. Initialize Your Application

**Step 1: Set up Database Schema**
1. Go to your API service in Render dashboard
2. Click on "Shell" tab (this opens a terminal in your deployed app)
3. Run the following commands:
   ```bash
   npx prisma generate
   npx prisma db push
   ```
4. Your database is now ready with all tables created!

**Step 2: Create First Admin User**
1. Visit your frontend URL (provided in Render dashboard)
2. Click "Register" to create your first account
3. This will be a student account initially
4. Go back to the API service Shell in Render
5. Run this command to make yourself an admin:
   ```bash
   npx prisma studio
   ```
   Or use the database console to update your user role to 'ADMIN'

**Alternative Admin Creation:**
You can also update via the Render database console:
1. Go to your database service in Render
2. Click "Connect" → "External Connection"
3. Use a PostgreSQL client or the web console to run:
   ```sql
   UPDATE users SET role = 'ADMIN' WHERE email = 'your-email@example.com';
   ```

### 5. Test Your Application

1. **Access Your App:**
   - Frontend URL: `https://ai-writing-companion-frontend.onrender.com` (or similar)
   - API URL: `https://ai-writing-companion-api.onrender.com` (or similar)

2. **Test Basic Functions:**
   - ✅ User registration and login
   - ✅ Create a test submission
   - ✅ Verify Claude AI analysis works
   - ✅ Test file upload (if you have content)
   - ✅ Check dashboard displays correctly

### 6. Configure Additional Users

Once you're logged in as admin:

1. **Create Editor Accounts:**
   - Go to Admin Dashboard → User Management
   - Create new users with role "EDITOR"

2. **Create Reviewer Accounts:**
   - Create users with role "REVIEWER" for plagiarism checking

3. **Create Operations/Sales Accounts:**
   - Create users for file management and event coordination

## Environment Variables Reference

### Required for API Service

| Variable | Description | Where to Get |
|----------|-------------|--------------|
| `ANTHROPIC_API_KEY` | Claude AI API key | [Anthropic Console](https://console.anthropic.com) |
| `WASABI_ACCESS_KEY` | Storage access key | Wasabi Account → Access Keys |
| `WASABI_SECRET_KEY` | Storage secret key | Wasabi Account → Access Keys |
| `WASABI_BUCKET_NAME` | Your bucket name | Use: `ai-writing-companion-files` |
| `WASABI_REGION` | Storage region | Use: `us-east-1` |
| `WASABI_ENDPOINT` | Storage endpoint | Use: `https://s3.wasabisys.com` |
| `FROM_EMAIL` | Email sender address | Your domain email or noreply address |

### Auto-Configured by Render

| Variable | Description | 
|----------|-------------|
| `DATABASE_URL` | PostgreSQL connection (auto-connected) |
| `JWT_SECRET` | Secure token secret (auto-generated) |
| `FRONTEND_URL` | Your frontend URL (auto-linked) |
| `NODE_ENV` | Set to `production` automatically |

## Troubleshooting

### Common Issues

**1. Deployment Failed:**
- Check build logs in Render dashboard
- Ensure all required files are in GitHub repository
- Verify `package.json` files have correct dependencies

**2. Database Connection Issues:**
- Database creation takes a few minutes
- Ensure `npx prisma db push` completed successfully
- Check database logs in Render dashboard

**3. Claude API Not Working:**
- Verify your API key is correct
- Check you have sufficient Claude API credits
- Test API key directly in Anthropic console

**4. File Upload Issues:**
- Verify Wasabi credentials are correct
- Ensure bucket exists and is accessible
- Check bucket permissions (should allow your access keys)

**5. Frontend Can't Connect to API:**
- Verify both services are "Live" in Render
- Check that `VITE_API_URL` is correctly set to your API service URL
- Look for CORS errors in browser console

### Getting Help

**Check Service Status:**
1. Render Dashboard → Your Services
2. Look for "Live" status on all services
3. Check "Logs" tab for any error messages

**Useful Commands (in API Service Shell):**
```bash
# Check database connection
npx prisma db pull

# View current schema
npx prisma studio

# Reset database (if needed)
npx prisma migrate reset --force

# Check environment variables
printenv | grep -E "(DATABASE_URL|JWT_SECRET|ANTHROPIC)"
```

**Support Resources:**
- [Render Documentation](https://render.com/docs)
- [Prisma Documentation](https://www.prisma.io/docs)
- [Anthropic API Documentation](https://docs.anthropic.com)

## Success Checklist

Before going live, verify:

- ✅ All three services show "Live" status in Render
- ✅ Database schema is created (`npx prisma db push` completed)
- ✅ Admin user can login to frontend
- ✅ Can create a test submission
- ✅ Claude AI analysis runs successfully
- ✅ File upload works (test with a small file)
- ✅ All user roles can be created
- ✅ Email notifications work (if configured)

## Next Steps

1. **Customize the App:** Update branding, colors, and content
2. **Add More Users:** Create accounts for your team
3. **Test Workflow:** Run through the complete 7-stage process
4. **Set Up Monitoring:** Configure alerts for system health
5. **Regular Backups:** Render handles this, but consider additional backups

## Cost Considerations

**Render Free Tier Limits:**
- Services spin down after 15 minutes of inactivity
- 512MB RAM per service
- 100GB bandwidth per month

**For Production Use:**
- Consider upgrading to Render's paid plans
- Database backups included in paid plans
- 24/7 uptime and faster performance

---

**🚀 Your AI Writing Companion is now live and ready to use!**

Visit your frontend URL to start using the application. The first user you register can be promoted to admin to set up the system.
