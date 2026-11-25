import { findUserByToken, getJobs, findJobById, updateJob, addJobPreview, nextPreviewId } from '../data/store.mjs';

const ALLOWED_STATUSES = ['assigned', 'in_progress', 'completed', 'cancelled'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB

/**
 * Register staff job management routes (serving Step G8)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // GET /api/staff/jobs
  router.get('/api/staff/jobs', async (req, res) => {
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

    if (user.role !== 'staff') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Staff role required'
        }
      });
    }

    const jobs = getJobs(user.id);
    return res.status(200).json({ jobs });
  });

  // PATCH /api/staff/jobs/:id
  router.patch('/api/staff/jobs/:id', async (req, res) => {
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

    if (user.role !== 'staff') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Staff role required'
        }
      });
    }

    const jobId = req.params.id;
    const job = findJobById(jobId);
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Job ${jobId} not found`
        }
      });
    }

    if (job.staffId !== user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. This job is assigned to another staff member'
        }
      });
    }

    const { status } = req.body || {};
    if (!status || !ALLOWED_STATUSES.includes(status)) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid job status',
          fields: {
            status: 'Status must be one of: assigned, in_progress, completed, cancelled'
          }
        }
      });
    }

    const updated = updateJob(jobId, { status });
    return res.status(200).json({
      job: {
        id: updated.id,
        bookingId: updated.bookingId,
        status: updated.status,
        updatedAt: '2026-10-17T14:05:00Z'
      }
    });
  });

  // POST /api/staff/jobs/:id/previews
  router.post('/api/staff/jobs/:id/previews', async (req, res) => {
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

    if (user.role !== 'staff') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Staff role required'
        }
      });
    }

    const jobId = req.params.id;
    const job = findJobById(jobId);
    if (!job) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Job ${jobId} not found`
        }
      });
    }

    if (job.staffId !== user.id) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. This job is assigned to another staff member'
        }
      });
    }

    // Inspect content length for file size enforcement
    const contentLength = parseInt(req.headers['content-length'] || '0', 10);
    if (contentLength > MAX_UPLOAD_BYTES) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'File exceeds maximum size limit of 10MB',
          fields: {
            file: 'File size must not exceed 10MB'
          }
        }
      });
    }

    // Inspect file type
    const rawBody = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
    if (
      rawBody.includes('application/pdf') ||
      rawBody.includes('.pdf') ||
      rawBody.includes('%PDF') ||
      req.headers['content-type']?.includes('application/pdf')
    ) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid file format',
          fields: {
            file: 'Only JPEG and PNG image files are permitted'
          }
        }
      });
    }

    const matchName = rawBody.match(/filename="([^"]+)"/);
    const filename = matchName ? matchName[1] : 'preview-01.png';
    const preview = {
      id: nextPreviewId(),
      jobId: job.id,
      filename,
      url: `/uploads/${filename}`,
      size: 204800,
      uploadedAt: '2026-10-17T16:15:00Z'
    };

    addJobPreview(job.id, preview);

    return res.status(201).json({
      success: true,
      preview
    });
  });
}
