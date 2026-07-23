const { prisma } = require('../../config/db');
const logger = require('../../utils/logger');

class InvoiceService {
  static async generateInvoiceNumber() {
    const year = new Date().getFullYear();
    const count = await prisma.invoice.count({
      where: {
        createdAt: {
          gte: new Date(`${year}-01-01T00:00:00.000Z`),
        },
      },
    });
    return `LF-${year}-${String(count + 1).padStart(5, '0')}`;
  }

  static async createFromPayment({
    organizationId,
    subscriptionId = null,
    planName,
    amount,
    currency = 'INR',
    razorpayPaymentId = null,
    razorpayInvoiceId = null,
    billingPeriodStart = new Date(),
    billingPeriodEnd = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    status = 'paid',
  }) {
    const subtotal = Number(amount) || 0;
    const taxRate = 18;
    const taxAmount = Math.round(subtotal * taxRate) / 100;
    const totalAmount = subtotal + taxAmount;
    const invoiceNumber = await this.generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        organizationId,
        invoiceNumber,
        subscriptionId,
        subtotal,
        taxRate,
        taxAmount,
        totalAmount,
        currency,
        status,
        planName,
        razorpayPaymentId,
        razorpayInvoiceId,
        billingPeriodStart,
        billingPeriodEnd,
        paidAt: status === 'paid' ? new Date() : null,
      },
    });

    logger.info(`Invoice ${invoiceNumber} created for org ${organizationId}`);
    return invoice;
  }
}

module.exports = InvoiceService;
