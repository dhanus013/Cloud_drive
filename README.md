# CloudDrive Lite – Complete Setup Guide

## Folder Structure
```
cloud-drive/
├── public/
│   ├── index.html
│   ├── style.css
│   └── script.js
├── server.js
├── package.json
├── .env.example   ← copy to .env and fill in your values
└── iam-policy.json
```

---

## Step 1 — Create an S3 Bucket (AWS Console)

1. Go to **S3 → Create bucket**
2. Name it something unique, e.g. `clouddrive-yourname`
3. Region: `us-east-1` (or your preferred region)
4. **Uncheck** "Block all public access" only if you want public files.
   (For private files — keep it blocked; we use pre-signed URLs instead ✅)
5. Click **Create bucket**

---

## Step 2 — Create IAM Role for EC2 (No Keys Needed!)

1. Go to **IAM → Roles → Create role**
2. Trusted entity: **AWS service → EC2**
3. Click **Next → Create policy → JSON tab**
4. Paste the contents of `iam-policy.json` (replace YOUR-BUCKET-NAME)
5. Name the policy: `CloudDriveLitePolicy`
6. Name the role: `CloudDriveLiteRole`
7. Click **Create role**

---

## Step 3 — Launch EC2 Instance

1. Go to **EC2 → Launch instance**
2. Name: `CloudDriveLite`
3. AMI: **Ubuntu 24.04 LTS** (Free Tier eligible)
4. Instance type: `t2.micro` or `t3.micro`
5. Key pair: Create or use existing (download the `.pem` file!)
6. Security group — Add these rules:
   | Type  | Port | Source    |
   |-------|------|-----------|
   | SSH   | 22   | My IP     |
   | HTTP  | 80   | Anywhere  |
   | Custom TCP | 3000 | Anywhere |
7. **Advanced → IAM Instance Profile → select `CloudDriveLiteRole`**
8. Click **Launch instance**

---

## Step 4 — Connect to EC2 via SSH

```bash
chmod 400 your-key.pem
ssh -i your-key.pem ubuntu@<EC2_PUBLIC_IP>
```

---

## Step 5 — Install Node.js on EC2

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node -v   # should print v20.x.x
npm -v
```

---

## Step 6 — Deploy the App

```bash
# Clone or copy your project (example using git)
git clone https://github.com/YOUR_USERNAME/cloud-drive.git
cd cloud-drive

# Install dependencies
npm install

# Set up environment
cp .env.example .env
nano .env
# → Set S3_BUCKET_NAME=clouddrive-yourname and AWS_REGION=us-east-1

# Start the server
node server.js
```

Open in browser:
```
http://<EC2_PUBLIC_IP>:3000
```

---

## Step 7 — Keep It Running (Optional but Recommended)

Install PM2 so the server restarts automatically:

```bash
sudo npm install -g pm2
pm2 start server.js --name clouddrive
pm2 startup        # follow the printed command
pm2 save
```

---

## Step 8 — Test Everything

| Test | Expected result |
|------|----------------|
| Upload a file | Appears in S3 bucket + file list |
| Download a file | Pre-signed URL opens/downloads file |
| Delete a file | Removed from S3 and list |
| Search | Filters files by name |
| Refresh | Reloads file list from S3 |

---

## Common Errors & Fixes

| Error | Fix |
|-------|-----|
| `NoSuchBucket` | Check S3_BUCKET_NAME in .env |
| `AccessDenied` | Verify IAM role is attached to EC2 |
| Port 3000 not reachable | Add inbound rule for port 3000 in Security Group |
| `EADDRINUSE` | Run `pkill node` then restart |

---

## Resume Description

> Built a cloud-based file storage application using Node.js (Express) on AWS EC2 and Amazon S3 for object storage. Implemented IAM role-based authentication, pre-signed URLs for secure downloads, and a responsive drag-and-drop UI. Deployed with PM2 for process management.
