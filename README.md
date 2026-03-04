# Collectly Backend

A robust Node.js and Express.js backend for the Collectly application. This backend provides comprehensive APIs for user management, authentication, financial pools, payments, and real-time features. 

## 🚀 Technologies Used
- **Runtime:** [Node.js](https://nodejs.org/) & [Express.js](https://expressjs.com/)
- **Database:** MySQL with [Sequelize](https://sequelize.org/) ORM
- **Authentication:** Passport.js, JWT, Google OAuth (OAuth 2.0)
- **Payments & Finance:** PayPal REST SDK, Plaid
- **Real-time:** Socket.IO
- **Security:** Helmet, express-rate-limit, cors, csurf
- **File Uploads:** express-fileupload, multer
- **Notifications:** Nodemailer (Email), ClickSend (SMS)

## 📁 Project Structure

```text
├── assets/             # Static assets (images, css, js)
├── config/             # Configuration files
├── controllers/        # Route controllers
├── download-export/    # Generated exports directory
├── email_templates/    # EJS templates for email notifications
├── middleware/         # Custom Express middleware (auth, etc.)
├── migrations/         # Database migrations (Sequelize)
├── models/             # Sequelize database models
├── requestSchemas/     # Joi validation schemas for requests
├── routes/             # API routes
├── seeders/            # Database seeders
├── services/           # Business logic and external API services
├── sms_templates/      # Templates for SMS notifications
├── socket/             # Socket.IO configuration and events
├── uploads/            # Uploaded files (users, pools)
├── utils/              # Helper utilities
├── views/              # EJS template views
├── app.js              # Application entry point
└── package.json        # Project metadata and dependencies
```

## 🛠 Prerequisites

Make sure you have the following installed to run this project:
- **Node.js**: v18.x or higher recommended
- **NPM**: v8.x or higher
- **MySQL**: Running MySQL Server instance

## ⚙️ Environment Variables

Create a `.env` file in the root directory and add the following required variables. Note that the server will fail to start if the required variables are missing.

```env
# Required Variables
PAYPAL_CLIENT_ID=your_paypal_client_id
PAYPAL_MERCHANT_ID=your_paypal_merchant_id
BASE_URL=http://localhost:2502
SESSION_SECRET=your_session_secret

# Server Config
PORT=2502
HOST=localhost
NODE_ENV=development

# Database Config (example Sequelize env vars)
DB_HOST=localhost
DB_USER=root
DB_PASS=password
DB_NAME=collectly_db

# SSL (optional for local HTTPS)
# Key and Cert should be placed in ./certificates/cert.key & cert.crt
```

## 🏃‍♂️ Getting Started

1. **Clone the repository:**
   ```bash
   git clone <repository_url>
   cd Collectly-Backend
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Database Setup:**
   Ensure MySQL is running and set up your database using Sequelize CLI to run migrations and seeders:
   ```bash
   # If you use Sequelize CLI
   npx sequelize-cli db:migrate
   npx sequelize-cli db:seed:all
   ```

4. **Start the development server:**
   ```bash
   npm run start
   ```
   *This starts the server using Nodemon for hot-reloading.*

## 📚 API Endpoints Overview

The primary API lives under `/api/v1/` prefix.

- **`/api/v1/auth`** - Authentication (Login, Register, OAuth)
- **`/api/v1/pools`** - Financial pools management
- **`/api/v1/finance`** - Financial operations (Plaid, external connections)
- **`/api/v1/user`** - User profile management
- **`/api/v1/subscriptions`** - Manage user subscriptions
- **`/api/v1/pool-payouts`** - Pool payout logic
- **`/api/v1/pool-voting`** - Voting system for pool decisions

## 📡 Socket.IO

Real-time capabilities are driven by Socket.IO. Setup and handlers can be found under the `/socket` directory.

## 🛡️ Security
This backend incorporates multiple layers of security to protect data:
- **Rate Limiting:** Protects endpoints (like `/api/v1/auth`) from brute-force attacks.
- **Helmet:** Sets secure HTTP headers.
- **CORS:** Secured with specific origins handling.
- **Payload Limits:** Limits JSON and URL-encoded payloads to `50mb`.

## 📜 License
ISC License
