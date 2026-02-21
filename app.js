// Load environment variables
require('dotenv').config();

const express = require('express');
const fs = require('fs');
const path = require('path');
const passport = require('passport');
const moment = require('moment');
const nocache = require('nocache');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const fileUpload = require('express-fileupload');
const session = require('express-session');
const http = require('http');
const https = require('https');

const app = express();

// -----------------------------------------------------------------------------
// 1. SSL SETUP WITH FAILOVER TO HTTP
// -----------------------------------------------------------------------------
let serverOptions = {};
let useHttps = false;

//Uncomment for local HTTPS development
// if (process.env.NODE_ENV === 'development') {
//   try {
//     const keyPath = path.resolve(__dirname, 'certificates', 'cert.key');
//     const certPath = path.resolve(__dirname, 'certificates', 'cert.crt');
//     if (fs.existsSync(keyPath) && fs.existsSync(certPath)) {
//       serverOptions = { key: fs.readFileSync(keyPath), cert: fs.readFileSync(certPath) };
//       useHttps = true;
//     } else {
//       console.warn('⚠️ SSL certificates not found.  Falling back to HTTP.');
//     }
//   } catch (err) {
//     console.error('❌ Error loading SSL certificates:', err.message);
//   }
// }

// -----------------------------------------------------------------------------
// 2.  SECURITY & PERFORMANCE MIDDLEWARE
// -----------------------------------------------------------------------------
// ✅ Configure Helmet - DISABLE CSP globally, we'll set it per-route
app.use(helmet({
  crossOriginResourcePolicy: false,
  contentSecurityPolicy: false, // ✅ CRITICAL: Disabled so route-level CSP works
  crossOriginEmbedderPolicy: false,
  crossOriginOpenerPolicy: false
}));

// ✅ CORS Configuration
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true
}));

// Rate limiting
if (process.env.ENABLE_RATE_LIMIT === 'true') {
  const generalLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
  });

  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 20,
    message: 'Too many login attempts, please try again later.'
  });

  app.use('/api/v1/auth', authLimiter);
  app.use('/api/v1', generalLimiter);
}

// Compression & cache control
app.use(compression());
app.use(nocache());

// Body parsers
app.use(express.urlencoded({
  extended: true,
  limit: '50mb',
  parameterLimit: 10000
}));
app.use(express.json({
  limit: '50mb',
  strict: true
}));

// -----------------------------------------------------------------------------
// 3. FILE UPLOADS
// -----------------------------------------------------------------------------
app.use(fileUpload({
  limits: { fileSize: 50 * 1024 * 1024 },
  abortOnLimit: true,
  responseOnLimit: 'File size limit exceeded'
}));

// -----------------------------------------------------------------------------
// 4. SESSIONS & AUTH
// -----------------------------------------------------------------------------
const sessionConfig = {
  secret: process.env.SESSION_SECRET || 'default_secret_key_change_in_production',
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 24 * 60 * 60 * 1000
  }
};

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
  sessionConfig.cookie.secure = true;
}

app.use(session(sessionConfig));
app.use(passport.initialize());
app.use(passport.session());

// -----------------------------------------------------------------------------
// 5. GLOBAL SETTINGS
// -----------------------------------------------------------------------------
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views')); // ✅ Explicitly set views directory
app.set('trust proxy', true);
global.__basedir = __dirname;

// Moment.js locals
app.use((req, res, next) => {
  res.locals.moment = moment;
  next();
});

// Ensure upload directories exist
['./uploads/pool', './uploads/user', './download-export'].forEach(dir => {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
});

// -----------------------------------------------------------------------------
// 6. STATIC FILES
// -----------------------------------------------------------------------------
app.use("/assets", express.static(path.join(__dirname, "assets"), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
  setHeaders: (res, filePath) => {
    const ext = path.extname(filePath);
    if (ext === '.css') {
      res.setHeader('Content-Type', 'text/css');
    } else if (ext === '.js') {
      res.setHeader('Content-Type', 'application/javascript');
    } else if (['.png', '.jpg', '.jpeg'].includes(ext)) {
      res.setHeader('Content-Type', `image/${ext.slice(1)}`);
    } else if (ext === '.svg') {
      res.setHeader('Content-Type', 'image/svg+xml');
    } else if (ext === '.ico') {
      res.setHeader('Content-Type', 'image/x-icon');
    }
  }
}));

app.use("/public", express.static(path.join(__dirname, "uploads"), {
  maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0'
}));

app.use("/.well-known", express.static(path.join(__dirname, ".well-known"), {
  setHeaders: (res, filePath) => {
    // Set correct Content-Type for JSON files
    if (filePath.endsWith('.json')) {
      res.setHeader('Content-Type', 'application/json');
    }
    // For apple-app-site-association (no extension)
    if (filePath.includes('apple-app-site-association')) {
      res.setHeader('Content-Type', 'application/json');
    }
    // Prevent caching during development
    if (process.env.NODE_ENV !== 'production') {
      res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    }
  }
}));

// -----------------------------------------------------------------------------
// 7. ✅ REMOVED GLOBAL CSP MIDDLEWARE - NOW HANDLED PER ROUTE
// -----------------------------------------------------------------------------
// We removed the paymentCSPMiddleware that was interfering with route-specific CSP

// -----------------------------------------------------------------------------
// 8.  ✅ VALIDATE ENVIRONMENT VARIABLES ON STARTUP
// -----------------------------------------------------------------------------
const requiredEnvVars = [
  'PAYPAL_CLIENT_ID',
  'PAYPAL_MERCHANT_ID',
  'BASE_URL',
  'SESSION_SECRET'
];

const missingVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ CRITICAL: Missing required environment variables:');
  missingVars.forEach(varName => console.error(`   - ${varName}`));
  console.error('\n📝 Please add these to your .env file and restart the server.\n');
  process.exit(1);
}

// ✅ Log PayPal config on startup (partial for security)
console.log('💳 PayPal Configuration:');
console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
console.log(`   Client ID: ${process.env.PAYPAL_CLIENT_ID.substring(0, 8)}... ${process.env.PAYPAL_CLIENT_ID.slice(-4)}`);
console.log(`   Merchant ID: ${process.env.PAYPAL_MERCHANT_ID.substring(0, 8)}...${process.env.PAYPAL_MERCHANT_ID.slice(-4)}`);
console.log(`   Base URL: ${process.env.BASE_URL}`);

// -----------------------------------------------------------------------------
// 9.  ROUTES
// -----------------------------------------------------------------------------
const authRoutes = require('./routes/auth.routes');
const poolRoutes = require('./routes/pool.route');
const homeRoutes = require('./routes/home.route');
const financeRoutes = require('./routes/finance.route');
const userRoutes = require('./routes/user.routes');
const subscriptionRoutes = require('./routes/subscription.route');
const poolPayoutRoutes = require('./routes/poolPayout.route');
const poolPayoutSettingsRoutes = require('./routes/poolPayoutSettings.route');
const poolPayoutVotingRoutes = require('./routes/poolPayoutVoting.route');
const poolVotingSettingsRoutes = require('./routes/poolVotingSettings.route');


app.use('/home', homeRoutes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    paypalConfigured: ! !(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_MERCHANT_ID)
  });
});

// Mobile payment route
app.get('/mobile/payment/:payload', (req, res) => {
  const financeController = require("./controllers/finance.controller");
  return financeController.MobilePayment(req, res);
});

// Redirect root to home
app.get('/', (req, res) => res.redirect('/home/index'));


app.use('/api/v1', [
  authRoutes,
  poolRoutes,
  financeRoutes,
  userRoutes,
  subscriptionRoutes,
  poolPayoutRoutes,
  poolPayoutSettingsRoutes,
  poolPayoutVotingRoutes,
  poolVotingSettingsRoutes
]);

// -----------------------------------------------------------------------------
// 10. ERROR HANDLING
// -----------------------------------------------------------------------------
// 404 handler
app.use((req, res, next) => {
  res.status(404).json({
    response_code: 404,
    response_message: 'Route not found',
    path: req.path
  });
});

// Global error handler
app.use((err, req, res, next) => {
  console.error('🔥 Error:', err.stack);

  const statusCode = err.statusCode || 500;
  const response = {
    response_code: statusCode,
    response_message: statusCode === 500 ? 'Internal Server Error' : err.message,
  };

  if (process.env.NODE_ENV === 'development') {
    response.stack = err.stack;
    response.details = err;
  }

  res.status(statusCode).json(response);
});

// -----------------------------------------------------------------------------
// 11. SOCKET & SERVER INIT
// -----------------------------------------------------------------------------
const port = process.env.PORT || 2502;
const host = process.env.HOST || 'localhost';
const scheme = useHttps
  ? https.createServer(serverOptions, app)
  : http.createServer(app);

// Initialize Socket.IO
try {
  require('./socket/socket.js')(scheme);
  console.log('✅ Socket.IO initialized');
} catch (err) {
  console.warn('⚠️ Socket.IO initialization failed:', err.message);
}

// -----------------------------------------------------------------------------
// 12. START SERVER
// -----------------------------------------------------------------------------
scheme.listen(port, () => {
  const protocol = useHttps ? 'https' : 'http';
  console.log('\n' + '='.repeat(60));
  console.log(`✅ Server running at ${protocol}://${host}:${port}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`   PayPal: ${process.env.PAYPAL_CLIENT_ID ? '✅ Configured' : '❌ Missing'}`);
  console.log('='.repeat(60) + '\n');
});

// -----------------------------------------------------------------------------
// 13.  GLOBAL PROCESS HANDLERS
// -----------------------------------------------------------------------------
process.on('unhandledRejection', (reason, promise) => {
  console.error('🚨 Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', err => {
  console.error('💥 Uncaught Exception:', err);
  // In production, you may want to restart the process here
  if (process.env.NODE_ENV === 'production') {
    scheme.close(() => process.exit(1));
  }
});

process.on('SIGTERM', () => {
  console.log('👋 SIGTERM received, gracefully shutting down...');
  scheme.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('👋 SIGINT received, gracefully shutting down...');
  scheme.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

module.exports = app; // For testing