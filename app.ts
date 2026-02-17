// app.ts — Point d'entrée Express pour L'InviThé Gourmand

import dotenv from 'dotenv';
dotenv.config();

import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import session from 'express-session';
// import MySQLSessionStore from 'express-mysql-session';
import { setupSecurity } from './src/middlewares/security';
import { apiLimiter } from './src/middlewares/rateLimiter';
import { globalLimiter } from './src/middlewares/globalLimiter';
import publicRoutes from './src/routes/public';
import adminRoutes from './src/routes/admin';
import apiRoutes from './src/routes/api';
import NodeCache from 'node-cache';
import ejsMate from 'ejs-mate';
import swaggerUi from 'swagger-ui-express';
import swaggerDocument from './src/swagger.json';

/* ─── Cache global ─── */
export const appCache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

const app = express();
const PORT = parseInt(process.env.PORT || '3000', 10);

/* ─── Moteur de templates EJS (avec ejs-mate pour les layouts) ─── */
app.engine('ejs', ejsMate);
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

/* ─── Compression Gzip/Brotli ─── */
app.use(compression());

/* ─── Sécurité Helmet ─── */
setupSecurity(app);

/* ─── Rate Limiting Global ─── */
app.use(globalLimiter);

/* ─── Fichiers statiques avec cache long ─── */
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: process.env.NODE_ENV === 'production' ? '1y' : '0',
    etag: true,
    immutable: process.env.NODE_ENV === 'production',
}));

/* ─── Body parsers ─── */
// Webhook Stripe nécessite le raw body — déclaré dans les routes API avant le json parser
app.use('/api/webhooks/stripe', express.raw({ type: 'application/json' }));
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '5mb' }));
app.use(cookieParser());

/* ─── Sessions (Memory Store pour SQLite/Dev) ─── */
app.use(session({
    // store: default MemoryStore,
    secret: process.env.SESSION_SECRET || 'dev-secret-change-me-in-production-64chars-minimum-abcdefgh',
    resave: false,
    saveUninitialized: false,
    name: 'invithegourmand.sid',
    cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'strict',
        maxAge: 24 * 60 * 60 * 1000, // 24 heures
    },
}));

/* ─── Variables globales pour les templates ─── */
app.use((req: Request, res: Response, next: NextFunction) => {
    // Rendre les infos de session accessibles dans les templates
    res.locals.session = req.session;
    res.locals.currentPath = req.path;
    res.locals.cartCount = req.session.cart?.items?.length || 0;
    res.locals.stripePublishableKey = process.env.STRIPE_PUBLISHABLE_KEY || '';
    res.locals.appUrl = process.env.APP_URL || `http://localhost:${PORT}`;
    next();
});

/* ─── Rate limiting global sur les APIs ─── */
app.use('/api', apiLimiter);

/* ─── Routes ─── */
app.use('/', publicRoutes);
app.use('/admin', adminRoutes);
app.use('/api', apiRoutes);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

/* ─── Page 404 ─── */
app.use((_req: Request, res: Response) => {
    res.status(404).render('pages/404', {
        metaTitle: 'Page introuvable — L\'InviThé Gourmand',
        metaDescription: 'La page que vous recherchez n\'existe pas.',
        canonicalUrl: '',
    });
});

/* ─── Gestionnaire d'erreurs global ─── */
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error('❌ Erreur serveur :', err.stack);
    try {
        require('fs').appendFileSync('debug_error.log', `[${new Date().toISOString()}] Global Error: ${err.message}\nStack: ${err.stack}\nURL: ${_req.url}\n\n`);
    } catch (e) {
        console.error('Failed to write to log file');
    }
    res.status(500).render('pages/500', {
        metaTitle: 'Erreur serveur — L\'InviThé Gourmand',
        metaDescription: 'Une erreur inattendue est survenue.',
        canonicalUrl: '',
        error: process.env.NODE_ENV === 'development' ? err.message : 'Erreur interne',
    });
});

/* ─── Démarrage du serveur ─── */
app.listen(PORT, () => {
    console.log(`🍵 L'InviThé Gourmand démarre sur http://localhost:${PORT}`);
    console.log(`📦 Environnement : ${process.env.NODE_ENV || 'development'}`);
});

export default app;
