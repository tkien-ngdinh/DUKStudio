import { getStore, findUserByToken } from '../data/store.mjs';

/**
 * Register payments routes (serving Steps G7, G9)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // 1. POST /api/payments/deposit
  router.post('/api/payments/deposit', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const user = findUserByToken(authHeader);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or expired authentication token'
        }
      });
    }

    const body = req.body || {};
    const fields = {};
    if (!body.bookingId || !String(body.bookingId).trim()) {
      fields.bookingId = 'Booking ID is required';
    }
    if (!body.paymentMethod || !String(body.paymentMethod).trim()) {
      fields.paymentMethod = 'Payment method is required';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid payment payload',
          fields
        }
      });
    }

    const store = getStore();
    const booking = (store.bookings || []).find((b) => b.id === body.bookingId);

    if (!booking) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Booking ${body.bookingId} not found`
        }
      });
    }

    if (user.role !== 'customer' || user.id !== booking.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Only the booking owner can initiate payment'
        }
      });
    }

    if (booking.hasDeposit) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Deposit has already been paid for this booking'
        }
      });
    }

    store.payments = store.payments || [];
    const hasPriorFailed = store.payments.some(
      (p) => p.bookingId === booking.id && p.type === 'deposit' && p.status === 'failed'
    );
    const transactionId = hasPriorFailed ? `tx-dep-${booking.id.replace('GS-', '')}` : `tx-dep-${booking.id.replace('GS-', '')}-fail`;

    const payment = {
      transactionId,
      bookingId: booking.id,
      type: 'deposit',
      amount: booking.depositAmount || 540000,
      percentage: 30,
      status: 'pending',
      redirectUrl: '/payment/test',
      paymentMethod: body.paymentMethod,
      customerId: user.id
    };

    store.payments.push(payment);

    return res.status(200).json({
      payment: {
        transactionId: payment.transactionId,
        bookingId: payment.bookingId,
        type: payment.type,
        amount: payment.amount,
        percentage: payment.percentage,
        status: payment.status,
        redirectUrl: payment.redirectUrl
      }
    });
  });

  // 2. POST /api/payments/test-result
  router.post('/api/payments/test-result', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const user = findUserByToken(authHeader);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or expired authentication token'
        }
      });
    }

    const body = req.body || {};
    const fields = {};
    if (!body.transactionId || !String(body.transactionId).trim()) {
      fields.transactionId = 'Transaction ID is required';
    }
    if (!body.result || (body.result !== 'success' && body.result !== 'failure')) {
      fields.result = "Result must be 'success' or 'failure'";
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid payment result payload',
          fields
        }
      });
    }

    const store = getStore();
    const payment = (store.payments || []).find((p) => p.transactionId === body.transactionId);

    if (!payment) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Transaction ${body.transactionId} not found`
        }
      });
    }

    const booking = (store.bookings || []).find((b) => b.id === payment.bookingId);
    if (!booking) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Booking ${payment.bookingId} not found`
        }
      });
    }

    if (user.role !== 'customer' || user.id !== booking.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Only the booking owner can submit payment results'
        }
      });
    }

    if (body.result === 'failure') {
      payment.status = 'failed';
      return res.status(200).json({
        payment: {
          transactionId: payment.transactionId,
          bookingId: payment.bookingId,
          type: payment.type,
          amount: payment.amount,
          status: 'failed'
        },
        booking: {
          id: booking.id,
          status: booking.status,
          hasDeposit: booking.hasDeposit
        }
      });
    } else {
      payment.status = 'paid';
      if (payment.type === 'deposit') {
        payment.paidAt = '2026-10-21T10:00:00Z';
        booking.hasDeposit = true;
        booking.status = 'Đã đặt lịch';

        return res.status(200).json({
          payment: {
            transactionId: payment.transactionId,
            bookingId: payment.bookingId,
            type: payment.type,
            amount: payment.amount,
            status: 'paid',
            paidAt: payment.paidAt
          },
          booking: {
            id: booking.id,
            status: booking.status,
            hasDeposit: true
          }
        });
      } else {
        payment.paidAt = '2026-10-25T11:00:00Z';
        booking.hasFinalPayment = true;
        booking.status = 'Đã đặt lịch';

        return res.status(200).json({
          payment: {
            transactionId: payment.transactionId,
            bookingId: payment.bookingId,
            type: payment.type,
            amount: payment.amount,
            status: 'paid',
            paidAt: payment.paidAt
          },
          booking: {
            id: booking.id,
            status: booking.status,
            hasDeposit: true,
            hasFinalPayment: true
          }
        });
      }
    }
  });

  // 3. POST /api/payments/remaining
  router.post('/api/payments/remaining', async (req, res) => {
    const authHeader = req.headers['authorization'];
    const user = findUserByToken(authHeader);

    if (!user) {
      return res.status(401).json({
        error: {
          code: 'UNAUTHORIZED',
          message: 'Missing or expired authentication token'
        }
      });
    }

    const body = req.body || {};
    const fields = {};
    if (!body.bookingId || !String(body.bookingId).trim()) {
      fields.bookingId = 'Booking ID is required';
    }
    if (!body.paymentMethod || !String(body.paymentMethod).trim()) {
      fields.paymentMethod = 'Payment method is required';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid payment payload',
          fields
        }
      });
    }

    const store = getStore();
    const booking = (store.bookings || []).find((b) => b.id === body.bookingId);

    if (!booking) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Booking ${body.bookingId} not found`
        }
      });
    }

    if (user.role !== 'customer' || user.id !== booking.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Only the booking owner can initiate payment'
        }
      });
    }

    if (!booking.hasDeposit) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Deposit must be settled before paying remaining balance'
        }
      });
    }

    if (booking.hasFinalPayment) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Remaining balance has already been settled'
        }
      });
    }

    store.payments = store.payments || [];
    const transactionId = `tx-rem-${booking.id.replace('GS-', '')}`;

    const payment = {
      transactionId,
      bookingId: booking.id,
      type: 'remaining',
      amount: booking.remainingAmount || 1260000,
      percentage: 70,
      status: 'pending',
      redirectUrl: '/payment/test',
      paymentMethod: body.paymentMethod,
      customerId: user.id
    };

    store.payments.push(payment);

    return res.status(200).json({
      payment: {
        transactionId: payment.transactionId,
        bookingId: payment.bookingId,
        type: payment.type,
        amount: payment.amount,
        percentage: payment.percentage,
        status: payment.status,
        redirectUrl: payment.redirectUrl
      }
    });
  });
}
