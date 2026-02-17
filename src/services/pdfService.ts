import PDFDocument from 'pdfkit';
import { Order, OrderItem } from '@prisma/client';
import { formatPrice } from '../utils/helpers';
import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

/**
 * Génère une facture PDF pour une commande
 */
export async function generateInvoice(order: Order & { items: OrderItem[] }): Promise<PDFKit.PDFDocument> {
    const doc = new PDFDocument({ margin: 50 });

    await generateHeader(doc, order);
    generateCustomerInformation(doc, order);
    generateInvoiceTable(doc, order);
    generateFooter(doc);

    return doc;
}

async function generateHeader(doc: PDFKit.PDFDocument, order: Order) {
    // Logo (Favicon SVG converted to PNG)
    try {
        const faviconPath = path.join(process.cwd(), 'public', 'images', 'favicon.svg');
        if (fs.existsSync(faviconPath)) {
            const svgBuffer = fs.readFileSync(faviconPath);
            const pngBuffer = await sharp(svgBuffer).png().toBuffer();
            doc.image(pngBuffer, 50, 45, { width: 50 });
        }
    } catch (error) {
        console.error('Error adding favicon to invoice:', error);
    }

    doc
        .fillColor('#C4704B')
        .fontSize(20)
        .text("L'InviThé Gourmand", 110, 45) // Shifted right to accommodate logo
        .fontSize(10)
        .text("L'InviThé Gourmand", 200, 45, { align: 'right' })
        .text("64 rue d'Alésia", 200, 60, { align: 'right' })
        .text("75014 Paris", 200, 75, { align: 'right' })
        .moveDown();
}

function generateCustomerInformation(doc: PDFKit.PDFDocument, order: Order) {
    doc
        .fillColor('#444444')
        .fontSize(20)
        .text('Facture', 50, 110);

    generateHr(doc, 135);

    const customerInformationTop = 150;

    doc
        .fontSize(10)
        .text('N° Commande:', 50, customerInformationTop)
        .font('Helvetica-Bold')
        .text(order.orderNumber, 150, customerInformationTop)
        .font('Helvetica')
        .text('Date:', 50, customerInformationTop + 15)
        .text(order.createdAt.toLocaleDateString('fr-FR'), 150, customerInformationTop + 15)

        .text(order.deliveryMethod === 'delivery' ? 'Créneau Livraison :' : 'Créneau Retrait :', 50, customerInformationTop + 30)
        .text((order as any).deliverySlot || 'Non spécifié', 150, customerInformationTop + 30)

        .text('Total:', 50, customerInformationTop + 45)
        .text(formatPrice(Number(order.total)), 150, customerInformationTop + 45)

        .font('Helvetica-Bold')
        .text(order.customerName, 300, customerInformationTop)
        .font('Helvetica')
        .text(order.customerEmail, 300, customerInformationTop + 15)
        .text(order.shippingAddress ? JSON.parse(order.shippingAddress).address : "Retrait en boutique", 300, customerInformationTop + 30)
        .moveDown();

    generateHr(doc, 210);
}

function generateInvoiceTable(doc: PDFKit.PDFDocument, order: Order & { items: OrderItem[] }) {
    let i;
    const invoiceTableTop = 240;

    doc.font('Helvetica-Bold');
    generateTableRow(
        doc,
        invoiceTableTop,
        'Article',
        'Prix Unitaire',
        'Quantité',
        'Total'
    );
    generateHr(doc, invoiceTableTop + 20);
    doc.font('Helvetica');

    for (i = 0; i < order.items.length; i++) {
        const item = order.items[i];
        const position = invoiceTableTop + (i + 1) * 30;
        generateTableRow(
            doc,
            position,
            item.productName,
            formatPrice(Number(item.unitPrice)),
            item.quantity.toString(),
            formatPrice(Number(item.totalPrice))
        );

        generateHr(doc, position + 20);
    }

    const subtotalPosition = invoiceTableTop + (i + 1) * 30;
    generateTableRow(
        doc,
        subtotalPosition,
        '',
        '',
        'Sous-total',
        formatPrice(Number(order.subtotal))
    );

    const shippingPosition = subtotalPosition + 20;
    generateTableRow(
        doc,
        shippingPosition,
        '',
        '',
        'Livraison',
        formatPrice(Number(order.shippingCost))
    );

    const totalPosition = shippingPosition + 25;
    doc.font('Helvetica-Bold');
    generateTableRow(
        doc,
        totalPosition,
        '',
        '',
        'Total',
        formatPrice(Number(order.total))
    );
    doc.font('Helvetica');
}

function generateFooter(doc: PDFKit.PDFDocument) {
    doc
        .fontSize(10)
        .text(
            'Merci pour votre commande chez L\'InviThé Gourmand.',
            50,
            730,
            { align: 'center', width: 500 }
        );
}

function generateTableRow(
    doc: PDFKit.PDFDocument,
    y: number,
    item: string,
    unitCost: string,
    quantity: string,
    lineTotal: string
) {
    doc
        .fontSize(10)
        .text(item, 50, y)
        .text(unitCost, 280, y, { width: 90, align: 'right' })
        .text(quantity, 370, y, { width: 90, align: 'right' })
        .text(lineTotal, 0, y, { align: 'right' });
}

function generateHr(doc: PDFKit.PDFDocument, y: number) {
    doc
        .strokeColor('#aaaaaa')
        .lineWidth(1)
        .moveTo(50, y)
        .lineTo(550, y)
        .stroke();
}
