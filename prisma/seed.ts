// prisma/seed.ts — Données initiales de démonstration

import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main(): Promise<void> {
    console.log('🌱 Seed InviThé Gourmand...');

    // ─── Admin par défaut ───
    const adminPassword = await bcrypt.hash(process.env.ADMIN_PASSWORD || 'Admin123!', 12);
    await prisma.adminUser.upsert({
        where: { email: process.env.ADMIN_EMAIL || 'admin@invithegourmand.fr' },
        update: {},
        create: {
            email: process.env.ADMIN_EMAIL || 'admin@invithegourmand.fr',
            password: adminPassword,
            name: process.env.ADMIN_NAME || 'Administrateur',
            role: 'admin',
        },
    });
    console.log('✅ Admin créé');

    // ─── Catégories ───
    const categories = await Promise.all([
        prisma.category.upsert({
            where: { slug: 'thes' },
            update: {},
            create: {
                name: 'Thés',
                slug: 'thes',
                description: 'Notre sélection de thés bio du monde entier',
                imageUrl: '/images/categories/thes.jpg',
                displayOrder: 1,
            },
        }),
        prisma.category.upsert({
            where: { slug: 'cafes' },
            update: {},
            create: {
                name: 'Cafés',
                slug: 'cafes',
                description: 'Cafés de spécialité torréfiés artisanalement',
                imageUrl: '/images/categories/cafes.jpg',
                displayOrder: 2,
            },
        }),
        prisma.category.upsert({
            where: { slug: 'macarons' },
            update: {},
            create: {
                name: 'Macarons',
                slug: 'macarons',
                description: 'Macarons artisanaux aux saveurs raffinées',
                imageUrl: '/images/categories/macarons.jpg',
                displayOrder: 3,
            },
        }),
        prisma.category.upsert({
            where: { slug: 'patisseries' },
            update: {},
            create: {
                name: 'Pâtisseries',
                slug: 'patisseries',
                description: 'Gâteaux et douceurs faits maison chaque jour',
                imageUrl: '/images/categories/patisseries.jpg',
                displayOrder: 4,
            },
        }),
        prisma.category.upsert({
            where: { slug: 'glaces' },
            update: {},
            create: {
                name: 'Glaces Artisanales',
                slug: 'glaces',
                description: 'Glaces et sorbets fabriqués sur place',
                imageUrl: '/images/categories/glaces.jpg',
                displayOrder: 5,
            },
        }),
        prisma.category.upsert({
            where: { slug: 'coffrets' },
            update: {},
            create: {
                name: 'Coffrets Cadeaux',
                slug: 'coffrets',
                description: 'Offrez une pause gourmande avec nos coffrets',
                imageUrl: '/images/categories/coffrets.jpg',
                displayOrder: 6,
            },
        }),
    ]);

    const [thes, cafes, macarons, patisseries, glaces, coffrets] = categories;
    console.log('✅ Catégories créées');

    // ─── Produits ───
    const products = [
        // Thés
        {
            categoryId: thes.id,
            name: 'Thé Vert Sencha Bio',
            slug: 'the-vert-sencha-bio',
            shortDescription: 'Un thé vert japonais délicat aux notes végétales fraîches',
            longDescription: 'Notre Sencha bio provient des jardins de thé de Shizuoka au Japon. Récolté à la main au printemps, ce thé vert offre une liqueur d\'un vert jade lumineux avec des notes végétales fraîches, une légère douceur umami et une finale délicatement iodée. Parfait pour un moment de sérénité.',
            price: 12.90,
            weight: '100g',
            ingredients: 'Thé vert Sencha bio (Camellia sinensis)',
            preparationTips: 'Infuser 2g dans 200ml d\'eau à 70°C pendant 2 minutes. Peut se réinfuser 2-3 fois.',
            allergens: 'Aucun',
            stock: 45,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/sencha-1.jpg', '/images/products/sencha-2.jpg']),
            tags: JSON.stringify(['bio', 'japon', 'vert', 'classique']),
        },
        {
            categoryId: thes.id,
            name: 'Earl Grey Impérial',
            slug: 'earl-grey-imperial',
            shortDescription: 'Thé noir parfumé à la bergamote de Calabre, élégant et corsé',
            longDescription: 'Notre Earl Grey Impérial est un assemblage de thés noirs de Ceylan et de Darjeeling, parfumé à l\'huile essentielle de bergamote de Calabre. Sa tasse cuivrée délivre des notes maltées et rondes, rehaussées par l\'éclat citronné et floral de la bergamote. Un classique indémodable, sublimé.',
            price: 14.50,
            weight: '100g',
            ingredients: 'Thé noir (Ceylan, Darjeeling), huile essentielle de bergamote',
            preparationTips: 'Infuser 2.5g dans 200ml d\'eau à 95°C pendant 3-4 minutes. Délicieux avec un nuage de lait.',
            allergens: 'Aucun',
            stock: 38,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/earl-grey-1.jpg']),
            tags: JSON.stringify(['noir', 'bergamote', 'classique']),
        },
        {
            categoryId: thes.id,
            name: 'Rooibos Vanille & Amande',
            slug: 'rooibos-vanille-amande',
            shortDescription: 'Infusion sud-africaine sans théine, douce et réconfortante',
            longDescription: 'Ce rooibos d\'Afrique du Sud est sublimé par des éclats de vanille bourbon de Madagascar et des amandes effilées. Sans théine, il est parfait à toute heure. Sa liqueur ambrée et veloutée évoque la douceur d\'un dessert. Un câlin dans une tasse.',
            price: 11.90,
            weight: '100g',
            ingredients: 'Rooibos bio, éclats de vanille bourbon, amandes effilées, arôme naturel de vanille',
            preparationTips: 'Infuser 3g dans 200ml d\'eau à 100°C pendant 5-7 minutes. Sans théine, parfait pour le soir.',
            allergens: 'Fruits à coque (amandes)',
            stock: 52,
            isFeatured: false,
            isNew: true,
            images: JSON.stringify(['/images/products/rooibos-1.jpg']),
            tags: JSON.stringify(['rooibos', 'sans-theine', 'vanille', 'gourmand']),
        },
        {
            categoryId: thes.id,
            name: 'Thé Matcha Cérémoniel',
            slug: 'the-matcha-ceremoniel',
            shortDescription: 'Poudre de matcha premium de Uji, Kyoto — qualité cérémonielle',
            longDescription: 'Notre matcha cérémoniel provient de la région de Uji près de Kyoto, berceau du matcha japonais. Les feuilles de tencha sont ombragées 3 semaines avant la récolte, puis broyées sur meule de pierre. Le résultat : une poudre d\'un vert émeraude intense, au goût umami profond avec une douceur naturelle. Idéal en koicha ou usucha.',
            price: 29.90,
            weight: '30g',
            ingredients: 'Thé vert matcha bio (Camellia sinensis var. Yabukita)',
            preparationTips: 'Tamiser 2g de matcha, ajouter 70ml d\'eau à 80°C, fouetter vigoureusement au chasen en formant un W.',
            allergens: 'Aucun',
            stock: 20,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/matcha-1.jpg', '/images/products/matcha-2.jpg']),
            tags: JSON.stringify(['matcha', 'japon', 'bio', 'premium']),
        },
        {
            categoryId: thes.id,
            name: 'Infusion Détox Gingembre & Citron',
            slug: 'infusion-detox-gingembre-citron',
            shortDescription: 'Mélange vivifiant sans théine pour purifier le corps et l\'esprit',
            longDescription: 'Un mélange tonique de gingembre frais, de citronnelle, d\'écorce de citron et de menthe poivrée. Cette infusion sans théine est idéale après un repas ou en cure détox. Piquante et rafraîchissante, elle réchauffe et revigore.',
            price: 10.50,
            weight: '80g',
            ingredients: 'Gingembre, citronnelle, écorce de citron, menthe poivrée, racine de réglisse',
            preparationTips: 'Infuser 3g dans 250ml d\'eau bouillante pendant 6-8 minutes.',
            allergens: 'Aucun',
            stock: 60,
            isFeatured: false,
            isNew: true,
            images: JSON.stringify(['/images/products/detox-1.jpg']),
            tags: JSON.stringify(['infusion', 'sans-theine', 'detox', 'gingembre']),
        },
        // Cafés
        {
            categoryId: cafes.id,
            name: 'Espresso Blend Maison',
            slug: 'espresso-blend-maison',
            shortDescription: 'Notre assemblage signature pour un espresso intense et velouté',
            longDescription: 'Un assemblage maison de grains d\'Éthiopie Yirgacheffe et de Brésil Santos, torréfiés en petits lots à Paris. En espresso, il délivre un corps soyeux, des notes de chocolat noir, de noisette grillée et une finale légèrement fruitée. Crema épaisse et persistante.',
            price: 16.90,
            weight: '250g',
            ingredients: 'Café arabica (Éthiopie Yirgacheffe 60%, Brésil Santos 40%)',
            preparationTips: 'Mouture fine pour espresso. 18g pour un double shot, extraction 25-30 secondes.',
            allergens: 'Aucun',
            stock: 30,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/espresso-1.jpg']),
            tags: JSON.stringify(['cafe', 'espresso', 'blend', 'signature']),
        },
        {
            categoryId: cafes.id,
            name: 'Café Filtre Éthiopie Sidamo',
            slug: 'cafe-filtre-ethiopie-sidamo',
            shortDescription: 'Single origin aux notes florales et fruitées, idéal en filtre',
            longDescription: 'Cultivé en altitude dans la région de Sidamo en Éthiopie, ce café single origin dévoile des arômes délicats de jasmin, de myrtille et d\'agrume. Torréfié légèrement pour préserver sa complexité aromatique. Un café d\'exception pour les amateurs de douceur.',
            price: 14.50,
            weight: '250g',
            ingredients: 'Café arabica single origin (Éthiopie Sidamo)',
            preparationTips: 'Mouture moyenne. Pour V60 : ratio 1:16, eau à 93°C, infusion 3 min.',
            allergens: 'Aucun',
            stock: 25,
            isFeatured: false,
            isNew: true,
            images: JSON.stringify(['/images/products/sidamo-1.jpg']),
            tags: JSON.stringify(['cafe', 'filtre', 'single-origin', 'ethiopie']),
        },
        // Macarons
        {
            categoryId: macarons.id,
            name: 'Coffret 12 Macarons Signature',
            slug: 'coffret-12-macarons-signature',
            shortDescription: 'Assortiment de nos 6 parfums les plus appréciés, 2 de chaque',
            longDescription: 'Notre coffret signature réunit 12 macarons artisanaux dans nos 6 parfums emblématiques : pistache de Sicile, framboise, chocolat noir intense, vanille bourbon, caramel beurre salé et rose litchi. Chaque macaron est préparé le matin même avec des ingrédients nobles. Coques lisses, ganaches onctueuses — la perfection à chaque bouchée.',
            price: 24.90,
            weight: '180g',
            ingredients: 'Poudre d\'amande, sucre, blancs d\'œufs, beurre, chocolat, pistache, framboise, vanille, caramel, rose, litchi',
            allergens: 'Fruits à coque, œufs, lait, gluten (traces)',
            stock: 15,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/macarons-coffret-1.jpg', '/images/products/macarons-coffret-2.jpg']),
            tags: JSON.stringify(['macarons', 'coffret', 'cadeau', 'signature']),
        },
        {
            categoryId: macarons.id,
            name: 'Macarons Pistache (x6)',
            slug: 'macarons-pistache-6',
            shortDescription: 'Macarons à la pistache de Sicile, ganache crémeuse et intense',
            longDescription: 'Six macarons à la pistache de Bronte (Sicile), ce terroir d\'exception qui donne à nos macarons une saveur incomparable. Coques d\'un vert tendre, garnies d\'une ganache onctueuse à la pistache pure sans colorant. Un délice d\'authenticité.',
            price: 14.90,
            weight: '90g',
            ingredients: 'Poudre d\'amande, sucre, blancs d\'œufs, beurre, pâte de pistache de Sicile',
            allergens: 'Fruits à coque, œufs, lait',
            stock: 22,
            isFeatured: false,
            isNew: false,
            images: JSON.stringify(['/images/products/macarons-pistache-1.jpg']),
            tags: JSON.stringify(['macarons', 'pistache', 'sicile']),
        },
        // Pâtisseries
        {
            categoryId: patisseries.id,
            name: 'Tarte au Citron Meringuée',
            slug: 'tarte-citron-meringuee',
            shortDescription: 'Pâte sablée croustillante, crème citron acidulée, meringue italienne torchée',
            longDescription: 'Notre tarte au citron est un hommage à la pâtisserie française. Une pâte sablée dorée et friable abrite une crème au citron de Menton vif et soyeux. Le tout est couronné d\'une meringue italienne torchée au chalumeau, aérienne et caramélisée. Un classique exécuté à la perfection.',
            price: 7.50,
            ingredients: 'Farine, beurre, œufs, sucre, citrons de Menton, blancs d\'œufs',
            allergens: 'Gluten, œufs, lait',
            stock: 8,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/tarte-citron-1.jpg']),
            tags: JSON.stringify(['patisserie', 'tarte', 'citron', 'classique']),
        },
        {
            categoryId: patisseries.id,
            name: 'Éclair au Chocolat',
            slug: 'eclair-chocolat',
            shortDescription: 'Pâte à choux garnie de crème pâtissière au chocolat noir 70%',
            longDescription: 'Un éclair généreux en pâte à choux dorée et craquante, garni d\'une crème pâtissière au chocolat noir Valrhona 70%. Le glaçage miroir chocolat apporte une touche d\'élégance. Préparé chaque matin dans notre atelier.',
            price: 5.90,
            ingredients: 'Farine, beurre, œufs, lait, chocolat noir Valrhona 70%, crème',
            allergens: 'Gluten, œufs, lait, soja (traces)',
            stock: 12,
            isFeatured: false,
            isNew: false,
            images: JSON.stringify(['/images/products/eclair-chocolat-1.jpg']),
            tags: JSON.stringify(['patisserie', 'eclair', 'chocolat']),
        },
        {
            categoryId: patisseries.id,
            name: 'Paris-Brest Praliné',
            slug: 'paris-brest-praline',
            shortDescription: 'Couronne de choux craquante, crème mousseline au praliné noisette',
            longDescription: 'Notre Paris-Brest est un hommage à la course cycliste légendaire. Un choux croustillant en forme de couronne, parsemé d\'amandes effilées grillées, renferme une généreuse crème mousseline au praliné noisette du Piémont. Un monument de gourmandise.',
            price: 8.50,
            ingredients: 'Farine, beurre, œufs, noisettes du Piémont, amandes, sucre, crème',
            allergens: 'Gluten, œufs, lait, fruits à coque',
            stock: 6,
            isFeatured: false,
            isNew: true,
            images: JSON.stringify(['/images/products/paris-brest-1.jpg']),
            tags: JSON.stringify(['patisserie', 'praline', 'noisette', 'classique']),
        },
        // Glaces
        {
            categoryId: glaces.id,
            name: 'Glace Vanille Bourbon (500ml)',
            slug: 'glace-vanille-bourbon-500ml',
            shortDescription: 'Crème glacée onctueuse à la vanille bourbon de Madagascar',
            longDescription: 'Notre glace vanille est préparée avec de la vraie gousse de vanille bourbon de Madagascar, de la crème fraîche fermière et du lait entier. Onctueuse, crémeuse, parsemée de grains de vanille — un basique incontournable qui atteint l\'excellence.',
            price: 9.90,
            weight: '500ml',
            ingredients: 'Lait entier, crème fraîche, sucre, jaunes d\'œufs, gousses de vanille bourbon',
            allergens: 'Lait, œufs',
            stock: 18,
            isFeatured: false,
            isNew: false,
            images: JSON.stringify(['/images/products/glace-vanille-1.jpg']),
            tags: JSON.stringify(['glace', 'vanille', 'artisanale']),
        },
        {
            categoryId: glaces.id,
            name: 'Sorbet Mangue & Passion (500ml)',
            slug: 'sorbet-mangue-passion-500ml',
            shortDescription: 'Sorbet tropical intense, 100% fruits, sans produit laitier',
            longDescription: 'Un sorbet vibrant qui capture l\'essence de la mangue Alphonso et du fruit de la passion. 100% fruit, sans lait, sans gluten — une explosion de fraîcheur tropicale. La texture est soyeuse, l\'acidité parfaitement dosée. Un rayon de soleil en pot.',
            price: 8.90,
            weight: '500ml',
            ingredients: 'Purée de mangue Alphonso, purée de fruit de la passion, sucre, eau, jus de citron',
            allergens: 'Aucun',
            stock: 14,
            isFeatured: false,
            isNew: true,
            images: JSON.stringify(['/images/products/sorbet-mangue-1.jpg']),
            tags: JSON.stringify(['sorbet', 'mangue', 'passion', 'vegan']),
        },
        // Coffrets
        {
            categoryId: coffrets.id,
            name: 'Coffret Découverte Thés du Monde',
            slug: 'coffret-decouverte-thes-monde',
            shortDescription: '5 thés d\'exception en sachets kraft — le tour du monde en tasse',
            longDescription: 'Un voyage sensoriel à travers 5 thés sélectionnés aux quatre coins du globe : Sencha du Japon, Darjeeling de l\'Inde, Oolong de Taïwan, Thé blanc de Chine et Rooibos d\'Afrique du Sud. Chaque sachet kraft contient 30g (environ 15 tasses). Le coffret est présenté dans une boîte en carton recyclé avec un guide de dégustation inclus. Le cadeau parfait pour un amateur de thé.',
            price: 39.90,
            weight: '5 x 30g',
            ingredients: 'Thés et infusions bio sélectionnés',
            allergens: 'Aucun',
            stock: 10,
            isFeatured: true,
            isNew: false,
            images: JSON.stringify(['/images/products/coffret-thes-1.jpg', '/images/products/coffret-thes-2.jpg']),
            tags: JSON.stringify(['coffret', 'cadeau', 'thes', 'decouverte']),
        },
        {
            categoryId: coffrets.id,
            name: 'Coffret Gourmand Complet',
            slug: 'coffret-gourmand-complet',
            shortDescription: 'Thé + macarons + miel artisanal — le cadeau ultime',
            longDescription: 'Notre coffret le plus généreux : un thé Earl Grey Impérial (100g), un coffret de 6 macarons assortis, un pot de miel de lavande artisanal (125g) et une cuillère à thé en bois d\'olivier. Présenté dans un élégant coffret kraft avec nœud en tissu. Pour remercier, célébrer ou simplement faire plaisir.',
            price: 54.90,
            weight: '~450g',
            ingredients: 'Thé, macarons, miel de lavande, accessoire bois d\'olivier',
            allergens: 'Fruits à coque, œufs, lait, gluten (traces)',
            stock: 7,
            isFeatured: true,
            isNew: true,
            images: JSON.stringify(['/images/products/coffret-gourmand-1.jpg']),
            tags: JSON.stringify(['coffret', 'cadeau', 'premium', 'gourmand']),
        },
    ];

    for (const product of products) {
        await prisma.product.upsert({
            where: { slug: product.slug },
            update: {},
            create: product,
        });
    }
    console.log('✅ Produits créés');

    // ─── Items du menu du salon ───
    const menuItems = [
        // Thés chauds
        { section: 'thes_chauds', name: 'Thé Vert Sencha Bio', description: 'Thé vert japonais délicat, notes végétales', price: 5.50, displayOrder: 1 },
        { section: 'thes_chauds', name: 'Earl Grey Impérial', description: 'Thé noir à la bergamote de Calabre', price: 5.50, displayOrder: 2 },
        { section: 'thes_chauds', name: 'Darjeeling First Flush', description: 'Thé noir indien, muscaté et floral', price: 6.00, displayOrder: 3 },
        { section: 'thes_chauds', name: 'Oolong Tie Guan Yin', description: 'Thé semi-oxydé taïwanais, notes de orchidée', price: 6.50, displayOrder: 4 },
        { section: 'thes_chauds', name: 'Matcha Latte', description: 'Matcha cérémoniel fouetté au lait mousseux', price: 6.90, displayOrder: 5 },
        { section: 'thes_chauds', name: 'Rooibos Vanille & Amande', description: 'Infusion sans théine, douce et réconfortante', price: 5.00, displayOrder: 6 },
        // Thés glacés
        { section: 'thes_glaces', name: 'Thé Glacé Pêche & Jasmin', description: 'Thé vert au jasmin, sirop de pêche blanche', price: 6.50, displayOrder: 1 },
        { section: 'thes_glaces', name: 'Matcha Glacé Latte', description: 'Matcha sur glace avec lait d\'avoine', price: 7.00, displayOrder: 2 },
        { section: 'thes_glaces', name: 'Infusion Glacée Fruits Rouges', description: 'Hibiscus, framboise, cranberry, servie frappée', price: 6.00, displayOrder: 3 },
        // Cafés
        { section: 'cafes', name: 'Espresso', description: 'Notre blend signature, intense et velouté', price: 3.50, displayOrder: 1 },
        { section: 'cafes', name: 'Cappuccino', description: 'Espresso, lait mousseux, art latte', price: 5.00, displayOrder: 2 },
        { section: 'cafes', name: 'Latte Noisette', description: 'Espresso allongé, lait, sirop noisette artisanal', price: 5.50, displayOrder: 3 },
        { section: 'cafes', name: 'Café Filtre V60', description: 'Single origin du moment, préparé minute', price: 4.50, displayOrder: 4 },
        { section: 'cafes', name: 'Affogato', description: 'Espresso versé sur glace vanille artisanale', price: 6.50, displayOrder: 5 },
        // Pâtisseries
        { section: 'patisseries', name: 'Tarte au Citron Meringuée', description: 'Crème citron de Menton, meringue italienne torchée', price: 7.50, displayOrder: 1 },
        { section: 'patisseries', name: 'Éclair au Chocolat', description: 'Chocolat noir Valrhona 70%, glaçage miroir', price: 5.90, displayOrder: 2 },
        { section: 'patisseries', name: 'Paris-Brest Praliné', description: 'Crème mousseline, praliné noisette du Piémont', price: 8.50, displayOrder: 3 },
        { section: 'patisseries', name: 'Cheesecake Spéculoos', description: 'Base spéculoos, cream cheese, coulis fruits rouges', price: 7.00, displayOrder: 4 },
        { section: 'patisseries', name: 'Fondant au Chocolat', description: 'Cœur coulant, chocolat 70%, crème anglaise', price: 8.00, displayOrder: 5 },
        // Macarons
        { section: 'macarons', name: 'Macaron à l\'unité', description: 'Choix du jour : pistache, framboise, chocolat, vanille, caramel, rose-litchi', price: 2.50, displayOrder: 1 },
        { section: 'macarons', name: 'Boîte de 6 macarons', description: 'Assortiment de 6 parfums au choix', price: 14.90, displayOrder: 2 },
        { section: 'macarons', name: 'Boîte de 12 macarons', description: 'Notre coffret signature, 6 parfums', price: 24.90, displayOrder: 3 },
        // Formules
        { section: 'formules', name: 'Formule Goûter', description: 'Boisson chaude + pâtisserie du jour', price: 11.90, displayOrder: 1 },
        { section: 'formules', name: 'Tea Time Royal', description: 'Thé + 2 macarons + pâtisserie + mignardises', price: 19.90, displayOrder: 2 },
        { section: 'formules', name: 'Brunch du Week-end', description: 'Boisson + viennoiserie + tartine + jus + fruit (Sam-Dim)', price: 24.90, displayOrder: 3 },
    ];

    for (const item of menuItems) {
        await prisma.menuItem.create({ data: item });
    }
    console.log('✅ Menu du salon créé');

    // ─── Code promo de démo ───
    await prisma.promoCode.create({
        data: {
            code: 'BIENVENUE10',
            discountType: 'percentage',
            discountValue: 10,
            minOrderAmount: 20,
            maxUses: 100,
            isActive: true,
            expiresAt: new Date('2027-12-31'),
        },
    });
    console.log('✅ Code promo créé');

    console.log('🎉 Seed terminé avec succès !');
}

main()
    .catch((e) => {
        console.error('❌ Erreur seed :', e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
