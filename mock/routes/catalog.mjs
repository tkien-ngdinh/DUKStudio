import { getStore } from '../data/store.mjs';

/**
 * Register catalog routes (serving Step G1)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  router.get('/api/catalog', async (req, res) => {
    const store = getStore();
    const serviceFilter = req.query.service;

    if (serviceFilter) {
      const services = store.services || [];
      const matched = services.find((s) => s.id === serviceFilter);

      if (!matched) {
        return res.status(400).json({
          error: {
            code: 'BAD_REQUEST',
            message: 'Invalid catalog filter parameter',
            fields: {
              service: `Service '${serviceFilter}' does not exist`
            }
          }
        });
      }

      const packageNames = new Set((matched.packages || []).map((p) => p.name));
      const samplePhotos = (store.samplePhotos || []).filter((sp) => sp.category === serviceFilter);
      const reviews = (store.reviews || []).filter((r) => packageNames.has(r.service));

      return res.status(200).json({
        services: [matched],
        accessories: store.accessories || [],
        samplePhotos,
        reviews
      });
    }

    return res.status(200).json({
      services: store.services || [],
      accessories: store.accessories || [],
      samplePhotos: store.samplePhotos || [],
      reviews: store.reviews || []
    });
  });
}
