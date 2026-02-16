// src/services/imageService.ts — Upload et optimisation d'images (Multer + Sharp)

import multer, { FileFilterCallback } from 'multer';
import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { Request } from 'express';
import { OptimizedImage } from '../../types';

const UPLOAD_DIR = path.join(__dirname, '../../public/uploads');
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'];

/* ─── S'assurer que le dossier uploads existe ─── */
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

/* ─── Configuration Multer ─── */
const storage = multer.memoryStorage(); // Stockage en mémoire pour traitement Sharp

const fileFilter = (_req: Request, file: Express.Multer.File, cb: FileFilterCallback): void => {
    if (ALLOWED_MIMES.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error('Format de fichier non autorisé. Utilisez JPG, PNG ou WebP.'));
    }
};

/** Middleware Multer pour upload simple (1 image) */
export const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE },
}).single('image');

/** Middleware Multer pour upload multiple (max 5 images) */
export const uploadMultiple = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE, files: 5 },
}).array('images', 5);

/**
 * Génère un nom de fichier unique avec UUID
 */
function generateFilename(): string {
    return crypto.randomUUID();
}

/**
 * Optimise et redimensionne une image en 3 tailles + WebP
 * Retourne les chemins relatifs pour stockage en BDD
 */
export async function optimizeImage(buffer: Buffer, originalName: string): Promise<OptimizedImage> {
    const filename = generateFilename();
    const ext = '.webp';

    const sizes = [
        { name: 'thumbnail', width: 300, height: 300 },
        { name: 'medium', width: 800, height: 800 },
        { name: 'large', width: 1200, height: 1200 },
    ] as const;

    const paths: Record<string, string> = {};

    for (const size of sizes) {
        const outputFilename = `${filename}-${size.name}${ext}`;
        const outputPath = path.join(UPLOAD_DIR, outputFilename);

        await sharp(buffer)
            .resize(size.width, size.height, {
                fit: 'cover',
                position: 'center',
                withoutEnlargement: true,
            })
            .webp({ quality: 82 })
            .toFile(outputPath);

        paths[size.name] = `/uploads/${outputFilename}`;
    }

    // Sauvegarder aussi l'original optimisé
    const originalFilename = `${filename}-original${ext}`;
    const originalPath = path.join(UPLOAD_DIR, originalFilename);
    await sharp(buffer)
        .webp({ quality: 90 })
        .toFile(originalPath);
    paths['original'] = `/uploads/${originalFilename}`;

    return paths as unknown as OptimizedImage;
}

/**
 * Optimise plusieurs images
 */
export async function optimizeImages(files: Express.Multer.File[]): Promise<OptimizedImage[]> {
    const results: OptimizedImage[] = [];
    for (const file of files) {
        const optimized = await optimizeImage(file.buffer, file.originalname);
        results.push(optimized);
    }
    return results;
}

/**
 * Supprime les fichiers d'une image (toutes les tailles)
 */
export function deleteImageFiles(imagePath: string): void {
    const basePath = imagePath.replace(/-(thumbnail|medium|large|original)\.\w+$/, '');
    const sizes = ['thumbnail', 'medium', 'large', 'original'];

    for (const size of sizes) {
        const filePath = path.join(__dirname, '../../public', `${basePath}-${size}.webp`);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }
    }
}
