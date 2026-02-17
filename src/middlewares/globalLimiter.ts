
import rateLimit from 'express-rate-limit';

// Limiteur global pour protéger l'application contre les abus (DDoS, Brute Force)
// 300 requêtes par 15 minutes par IP
export const globalLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 300,
    standardHeaders: true, // Retourne les headers `RateLimit-*` standard
    legacyHeaders: false, // Désactive les headers `X-RateLimit-*`
    message: 'Trop de requêtes, veuillez réessayer plus tard.',
    skip: (req) => {
        // Exclure les ressources statiques communes pour éviter les faux positifs lors du chargement de page
        const ext = req.path.split('.').pop();
        return ['css', 'js', 'jpg', 'png', 'svg', 'ico', 'woff', 'woff2'].includes(ext || '');
    }
});
