import { getStore, findUserByToken } from '../data/store.mjs';

/**
 * Register gallery and photo delivery routes (serving Step G9)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // 1. POST /api/gallery/:id/select
  router.post('/api/gallery/:id/select', async (req, res) => {
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
    if (!body.photoIds || !Array.isArray(body.photoIds)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid selection payload',
          fields: {
            photoIds: 'photoIds is required and must be an array'
          }
        }
      });
    }

    if (body.photoIds.length === 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid selection payload',
          fields: {
            photoIds: 'At least 1 photo must be selected'
          }
        }
      });
    }

    if (body.photoIds.length > 30) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid selection payload',
          fields: {
            photoIds: 'Maximum 30 photos can be selected for retouching'
          }
        }
      });
    }

    const store = getStore();
    const bookingId = req.params.id;
    const booking = (store.bookings || []).find((b) => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Booking ${bookingId} not found`
        }
      });
    }

    if (user.role !== 'customer' || user.id !== booking.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Only the booking owner can select photos'
        }
      });
    }

    booking.photos = body.photoIds;
    booking.status = 'Đang chỉnh sửa';

    return res.status(200).json({
      success: true,
      bookingId: booking.id,
      selectedCount: body.photoIds.length,
      selectedPhotos: body.photoIds,
      status: 'Đang chỉnh sửa',
      submittedAt: '2026-10-25T09:00:00Z'
    });
  });

  // 2. POST /api/gallery/:id/receive
  router.post('/api/gallery/:id/receive', async (req, res) => {
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

    const store = getStore();
    const bookingId = req.params.id;
    const booking = (store.bookings || []).find((b) => b.id === bookingId);

    if (!booking) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Booking ${bookingId} not found`
        }
      });
    }

    if (user.role !== 'customer' || user.id !== booking.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Only the customer who owns this booking can confirm receipt'
        }
      });
    }

    if (!booking.photos || booking.photos.length === 0) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Photo selections must be submitted before confirming receipt'
        }
      });
    }

    if (!booking.hasFinalPayment) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Remaining 70% balance must be settled before confirming photo receipt'
        }
      });
    }

    if (!booking.finalFileLink) {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'Final photo deliverables archive link has not been attached yet'
        }
      });
    }

    booking.status = 'Hoàn thành';

    return res.status(200).json({
      success: true,
      booking: {
        id: booking.id,
        status: 'Hoàn thành',
        hasDeposit: true,
        hasFinalPayment: true,
        completedAt: '2026-10-26T14:00:00Z',
        finalFileLink: booking.finalFileLink
      }
    });
  });
}
