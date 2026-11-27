import { getStore } from '../data/store.mjs';

/**
 * Register catalog routes (serving Step G1)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  router.get('/api/catalog', async (req, res) => {
    const store = getStore();
    const serviceFilter = req.query.service;
    const catalogServices = (store.services || []).map((service) => {
      const packages = (store.packages || []).filter((p) => p.serviceId === service.id);
      return {
        id: service.id,
        title: service.name,
        description: service.description,
        unit: packages[0]?.priceUnit || 'buổi',
        startingPrice: packages.length ? Math.min(...packages.map((p) => p.price)) : 0,
        packages: packages.map((p) => ({
          id: p.id,
          name: p.name,
          price: p.price,
          durationHours: p.shootMinutes / 60,
          editedPhotos: p.maxSelect,
          deposit30: Math.round(p.price * 0.3),
          remaining70: p.price - Math.round(p.price * 0.3),
          features: p.includes || []
        }))
      };
    });

    if (serviceFilter) {
      const aliases = { 's-tot-nghiep': 'svc-tot-nghiep', 's-ky-yeu': 'svc-ky-yeu', 's-chan-dung': 'svc-chan-dung' };
      const matched = catalogServices.find((s) => s.id === (aliases[serviceFilter] || serviceFilter));

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
      const sampleCategory = Object.entries(aliases).find(([, serviceId]) => serviceId === matched.id)?.[0] || serviceFilter;
      const samplePhotos = (store.samplePhotos || []).filter((sp) => sp.category === sampleCategory);
      const reviews = (store.reviews || [])
        .filter((r) => packageNames.has(r.service || (store.packages || []).find((p) => p.id === r.packageId)?.name))
        .map((r) => ({
          id: r.id,
          customerName: r.customerName || r.author,
          service: r.service || (store.packages || []).find((p) => p.id === r.packageId)?.name,
          rating: r.rating ?? r.stars,
          comment: r.comment || r.text,
          date: r.date || '2026-10-25'
        }));

      return res.status(200).json({
        services: [matched],
        accessories: store.accessories || [],
        samplePhotos,
        reviews
      });
    }

    return res.status(200).json({
      services: catalogServices,
      accessories: store.accessories || [],
      samplePhotos: store.samplePhotos || [],
      reviews: (store.reviews || []).map((r) => ({
        id: r.id,
        customerName: r.customerName || r.author,
        service: r.service || (store.packages || []).find((p) => p.id === r.packageId)?.name,
        rating: r.rating ?? r.stars,
        comment: r.comment || r.text,
        date: r.date || '2026-10-25'
      }))
    });
  });
}
