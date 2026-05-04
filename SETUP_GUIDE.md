# 817 Hospitality — Trade Portal
## Deployment & Setup Guide

---

## What's in this folder

```
tfp-portal-deploy/
├── api/
│   ├── orders.js              ← Saves & loads orders from the database
│   └── send-confirmation.js   ← Sends confirmation emails via Resend
├── src/
│   ├── App.jsx                ← The portal itself
│   └── main.jsx               ← React entry point
├── index.html
├── package.json
├── vite.config.js
├── vercel.json
└── .gitignore
```

---

## Step 1 — Install Node.js (if you haven't already)

Go to https://nodejs.org and download the **LTS** version. Install it like any app.

To confirm it worked, open Terminal (Mac) and type:
```
node --version
```
You should see a version number like `v20.x.x`.

---

## Step 2 — Install the project dependencies

In Terminal, navigate to this folder:
```
cd ~/Downloads/tfp-portal-deploy
```
Then run:
```
npm install
```

---

## Step 3 — Test it locally

```
npm run dev
```
Open your browser at `http://localhost:5173`.
Orders won't save locally (the database only works once deployed) but everything
else will look right. Press `Ctrl+C` in Terminal when done.

---

## Step 4 — Create a GitHub account and repository

1. Go to https://github.com and create a free account
2. Click **+** (top right) → **New repository**
3. Name it `tfp-portal`, leave everything else as default
4. Click **Create repository** — keep this page open

---

## Step 5 — Push the project to GitHub

In Terminal, inside the `tfp-portal-deploy` folder, run these one at a time:
```
git init
git add .
git commit -m "initial deploy"
git branch -M main
git remote add origin https://github.com/YOUR_USERNAME/tfp-portal.git
git push -u origin main
```
Replace `YOUR_USERNAME` with your actual GitHub username.

Note: If git asks for a password, use a Personal Access Token:
GitHub → Settings → Developer Settings → Personal Access Tokens → Generate new token.
Use that token as your password when git asks.

---

## Step 6 — Deploy on Vercel

1. Go to https://vercel.com and sign up with **Continue with GitHub**
2. Click **Add New → Project**
3. Select your `tfp-portal` repository and click **Import**
4. Under **Framework Preset**, select **Vite**
5. Click **Deploy** — takes about 60 seconds
6. You'll get a live URL like `tfp-portal.vercel.app`

---

## Step 7 — Set up Vercel KV (the shared database)

This is what lets both you and TFP see the same orders from any device.

1. In your Vercel project dashboard, click **Storage** in the top navigation
2. Click **Create Database**
3. Select **KV** and click **Continue**
4. Name it `tfp-orders`, leave the region as default, click **Create**
5. Click **Connect to Project**, select your `tfp-portal` project, click **Connect**
6. Go to **Deployments** and click **Redeploy** on the latest deployment

---

## Step 8 — Set up Resend (confirmation emails)

1. Go to https://resend.com and create a free account
2. Click **Domains** → **Add Domain** → enter `817hospitality.com`
3. Resend shows you DNS records to add — log into wherever you manage
   your domain (GoDaddy, Squarespace, etc.) and add them exactly as shown
4. Back in Resend, click **Verify** — can take 5–30 minutes
5. Go to **API Keys** → **Create API Key** → name it `tfp-portal`
6. Copy the key (starts with `re_`) — keep this private, never share it

---

## Step 9 — Add your Resend API key to Vercel

1. In Vercel → your project → **Settings** → **Environment Variables**
2. Click **Add New**
   - Name: `RESEND_API_KEY`
   - Value: paste your `re_` key from Step 8
3. Click **Save**
4. Go to **Deployments** → **Redeploy**

---

## Step 10 — Connect your custom domain (optional but recommended)

1. In Vercel → **Settings** → **Domains**
2. Type `portal.817hospitality.com` and click **Add**
3. Add the DNS record Vercel shows you in your domain registrar
4. Once verified, your portal lives at `portal.817hospitality.com`

---

## Making future updates

When you get new code from Claude:

1. Replace `src/App.jsx` with the new file
2. In Terminal, inside the project folder:
```
git add .
git commit -m "describe what changed"
git push
```
Vercel detects the push and redeploys in ~60 seconds.
All order data is preserved — it lives in the database, not the code.

---

## Switching TFP's email from placeholder to real

Open `api/send-confirmation.js` and change line 4:
```
const CLIENT_EMAIL = "julianlopezbirlain@gmail.com";
```
to TFP's real email address. Save, then push to GitHub as above.

---

## Troubleshooting

**Orders not saving?**
Make sure you completed Step 7 (Vercel KV) and redeployed after connecting it.

**Emails not arriving?**
Check Resend → Logs. Make sure the domain is verified and RESEND_API_KEY
is set in Vercel Environment Variables, and that you redeployed after adding it.

**Portal not loading after deploy?**
Check Vercel → Deployments for any red error messages.
Make sure you selected Vite as the framework preset in Step 6.
