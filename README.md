#  ApexVest — Financial Portfolio Dashboard

ApexVest is a modern, premium, and responsive financial portfolio dashboard built with **React.js (Vite)**, **Node.js (Express)**, and secure **JWT-based authentication**. It empowers users to track investment positions, visualize asset allocations, research market symbols, and perform portfolio volatility and concentration diagnostics.

---

##  Key Features

-  **Secure Authorization**: State-of-the-art Sign Up, Sign In, and auto-restored sessions using stateless **JSON Web Tokens (JWT)** and **bcryptjs** password hashing.
-  **Isolated Portfolios**: Fully isolated user databases—transactions and holdings are securely mapped to specific users.
-  **Interactive Dashboard**: Track aggregate net worth history (1-Month Line Chart), asset allocation (Doughnut Chart), and a live watchlist of active positions.
-  **Portfolio Position Manager**: Easily record, execute (BUY/SELL), and delete transactions. The app automatically calculates average costs, proportional gains, and total costs.
-  **Market Research Terminal**: Dynamic index tickers (S&P 500, NASDAQ, Dow Jones), interactive historical price charts (1D, 1M, 6M, 1Y, 5Y), auto-populated autocomplete search, and key metrics (Market Cap, P/E Ratio, Div Yield).
-  **Concentration & Volatility Diagnostics**: Real-time diversification reports, estimated portfolio **Beta** calculations vs. S&P 500, and automatic exposure warnings if an asset or sector exceeds healthy limits.
-  **Rich Aesthetics**: A premium glassmorphic dark mode layout, smooth transitions, interactive chart tooltips, and micro-animations.
-  **Auto-Migration**: Any pre-existing "orphan" testing data in the database is automatically migrated and assigned to the first user who registers.

---

##  Technology Stack

- **Frontend**: React (Vite), Chart.js (`react-chartjs-2`), Lucide React, CSS Variables (Custom Design System)
- **Backend**: Node.js, Express, `yahoo-finance2` API client (with public fallback cache and mock simulator)
- **Database**: Local JSON-based flat-file datastore (`portfolio_db.json`)
- **Security**: `jsonwebtoken` (JWT), `bcryptjs`

---

##  Project Structure

```text
financial_dashboard/
├── backend/                  # Express REST API
│   ├── middleware/           # JWT Auth middleware
│   ├── portfolioStore.js     # User & transaction database controller
│   ├── portfolio_db.json     # Flat-file database
│   ├── server.js             # Main server entrypoint
│   └── yahooFinanceMock.js   # Fallback live stock simulation layer
├── frontend/                 # React UI (Vite)
│   ├── src/
│   │   ├── components/       # Dashboard, Portfolio, Markets, Trends, Auth
│   │   ├── App.jsx           # State coordinator & layout shell
│   │   ├── index.css         # Styling system (glassmorphism tokens)
│   │   └── main.jsx          # React entrypoint
└── package.json              # Monorepo scripts
```

---

##  Local Development Setup

Follow these simple commands to run the application locally on your computer:

### 1. Clone & Install Dependencies
Run this command from the root directory to install the packages for the root, frontend, and backend folders simultaneously:
```bash
npm run install:all
```

### 2. Start the Development Servers
Launch both the backend server (port `5001`) and the Vite dev server (port `5173+`) concurrently:
```bash
npm run dev
```

Open your browser and navigate to the address shown in the console (usually `http://localhost:5173` or `http://localhost:5174`).

---

##  Deployment Instructions (Render)

This monorepo is fully optimized to deploy onto **Render** in just a few clicks.

### Step 1: Deploy the Backend (Web Service)
1. Go to [Render](https://dashboard.render.com/) and create a new **Web Service**.
2. Connect your GitHub repository.
3. Configure the settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In the **Environment** tab, click **Add Environment Variable**:
   - **Key**: `JWT_SECRET`  
     **Value**: *[A secure random string, e.g. `MySuperSecretJWTKey2026`]*
   - **Key**: `NODE_ENV`  
     **Value**: `production`
5. Click **Create Web Service**. Once live, copy its public URL (e.g. `https://apexvest-backend.onrender.com`).

---

### Step 2: Deploy the Frontend (Static Site)
1. In Render, create a new **Static Site** (100% free).
2. Connect your GitHub repository.
3. Configure the settings:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Publish Directory**: `dist`
4. In the **Environment** tab, click **Add Environment Variable**:
   - **Key**: `VITE_API_URL`  
     **Value**: *[Paste your public Backend URL from Step 1]* (e.g. `https://apexvest-backend.onrender.com`)
5. Click **Create Static Site**.

---

###  Production Notes:
- **Render Free Tier Cold Start**: Because Render spins down Free Tier Web Services after 15 minutes of inactivity, the backend may take **50–60 seconds** to wake up on the first page load. If you see a connection error, simply wait a moment and refresh.
- **Dynamic CORS Integration**: The backend has dynamic CORS handling built-in. It automatically allows local dev ports, any `*.onrender.com` subdomain, or any custom domain assigned under the `FRONTEND_URL` environment variable.
