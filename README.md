# Airbnb-prototype with Traveler/Owner Workflows and an AI Concierge Agent

Airbnb prototype - React frontend + Node/Express backend + FastAPI agent.

A full-stack Airbnb prototype with:

-Traveler and Owner modules

-MySQL as database (Docker)

-Backend (Node.js + Express)

-Frontend (React)

-File uploads for profile and property images

-Cookie-based session authentication

⚙️ 1. Prerequisites

-Node.js ≥ 18

-npm ≥ 9

-Docker Desktop (or Docker Engine + CLI)

-VS Code or any terminal to run servers


🐬 2. Start MySQL in Docker

Run the following command in your terminal:

   ```bash
   docker run -d --name airbnb-mysql \
  -e MYSQL_ROOT_PASSWORD=root \
  -e MYSQL_DATABASE=airbnb_traveler \
  -e MYSQL_USER=airbnb \
  -e MYSQL_PASSWORD=airbnb \
  -p 3306:3306 \
  -v airbnb-mysql-data:/var/lib/mysql \
  mysql:8
   ```
Verify it’s running:

   ```bash
   docker ps
   ```

🧾 3. Environment Configuration

➤ backend/traveler/.env

   ```bash
    PORT=8000
    SESSION_SECRET=dev_fallback_secret
    CORS_ORIGIN=http://localhost:3000

    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=airbnb
    DB_PASSWORD=airbnb
    DB_NAME=airbnb_traveler
   ```

➤ backend/owner/.env

   ```bash
    PORT=8001
    SESSION_SECRET=dev_fallback_secret
    CORS_ORIGIN=http://localhost:3000

    DB_HOST=127.0.0.1
    DB_PORT=3306
    DB_USER=airbnb
    DB_PASSWORD=airbnb
    DB_NAME=airbnb_traveler
   ```

➤ frontend/.env

   ```bash
    REACT_APP_TRAVELER_API=http://localhost:8000
    REACT_APP_OWNER_API=http://localhost:8001
   ```

📁 4. Create Upload Folders

These are required for saving images.

   ```bash
    mkdir -p backend/traveler/uploads
    mkdir -p backend/owner/uploads
   ```

🚀 5. Install and Run

Traveler API

   ```bash
    cd backend/traveler
    npm install
    npm run dev
   ```
Runs on http://localhost:8000

Owner API

    ```bash
    cd backend/owner
    npm install
    npm run dev
   ```
Runs on http://localhost:8001

Frontend (React)

    ```bash
    cd frontend
    npm install
    npm start
   ```
Runs on http://localhost:3000

🧠 7. Notes

-Traveler API handles user sessions and profiles.

-Owner API manages listings, photos, and bookings.

-Both use the same MySQL database.

-Uploaded files are stored locally and served via /uploads.

-To see photos on the UI, ensure backend APIs are running when uploading.


✅ 8. Expected URLs

Component	URL
Traveler API	http://localhost:8000

Owner API	http://localhost:8001

React Frontend	http://localhost:3000
