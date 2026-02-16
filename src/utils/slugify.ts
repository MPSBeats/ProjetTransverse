// src/utils/slugify.ts — Génération de slugs propres et compatibles URL

/**
 * Convertit un texte en slug URL-friendly
 * Gère les caractères accentués français et les cas spéciaux
 */
export function slugify(text: string): string {
    return text
        .toString()
        .normalize('NFD')                   // Décompose les caractères accentués
        .replace(/[\u0300-\u036f]/g, '')    // Supprime les diacritiques
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')              // Espaces → tirets
        .replace(/[^\w-]+/g, '')           // Supprime les caractères non alphanumériques
        .replace(/--+/g, '-')              // Réduit les tirets multiples
        .replace(/^-+/, '')                // Supprime le tiret initial
        .replace(/-+$/, '');               // Supprime le tiret final
}

/**
 * Génère un slug unique en ajoutant un suffixe si nécessaire
 */
export function slugifyUnique(text: string, existingSlugs: string[]): string {
    let slug = slugify(text);
    let counter = 1;
    const originalSlug = slug;

    while (existingSlugs.includes(slug)) {
        slug = `${originalSlug}-${counter}`;
        counter++;
    }

    return slug;
}
