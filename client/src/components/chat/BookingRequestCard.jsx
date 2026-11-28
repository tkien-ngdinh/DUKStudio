import { formatDate } from '../../utils/format.js';

/**
 * The customer's booking request of a conversation, exactly the `request` fields of
 * 03-chat.md: packageId, preferredDate, preferredTime, extras, notes, participantCount.
 * The shoot type (service title), the package name and the extra names come from
 * GET /api/catalog (02-catalog.md); until the catalog is loaded, or if it fails, the ids are shown.
 *
 * Props:
 * - request: the conversation's `request` object
 * - catalog: { phase: 'loading' | 'ready' | 'error', data, message, onRetry }
 */
export default function BookingRequestCard({ request, catalog }) {
  if (!request) return null;

  const services = catalog.phase === 'ready' && Array.isArray(catalog.data?.services) ? catalog.data.services : [];
  const extrasCatalog = catalog.phase === 'ready' && Array.isArray(catalog.data?.extras) ? catalog.data.extras : [];
  const service = services.find((s) => (s.packages || []).some((p) => p.id === request.packageId));
  const pkg = service?.packages.find((p) => p.id === request.packageId);

  const fromCatalog = (name, id) => {
    if (name) return name;
    if (catalog.phase === 'loading') return 'Đang tải…';
    return id ? `${id} (không có trong danh mục)` : 'Chưa có';
  };

  const extras = Array.isArray(request.extras) ? request.extras : [];
  const extraNames = extras.map((id) => fromCatalog(extrasCatalog.find((e) => e.id === id)?.name, id));

  return (
    <section className="chat-request-banner admin-request" aria-labelledby="admin-request-title">
      <h3 className="request-banner-title" id="admin-request-title">
        Yêu cầu đặt lịch của khách
      </h3>
      <dl className="request-banner-grid admin-request-list">
        <div>
          <dt>Loại chụp</dt>
          <dd>{service?.title || (catalog.phase === 'loading' ? 'Đang tải…' : 'Chưa rõ')}</dd>
        </div>
        <div>
          <dt>Gói chụp</dt>
          <dd>{fromCatalog(pkg?.name, request.packageId)}</dd>
        </div>
        <div>
          <dt>Ngày chụp mong muốn</dt>
          <dd>{formatDate(request.preferredDate) || 'Chưa chọn'}</dd>
        </div>
        <div>
          <dt>Giờ bắt đầu mong muốn</dt>
          <dd>{request.preferredTime || 'Chưa chọn'}</dd>
        </div>
        {request.participantCount != null && (
          <div>
            <dt>Số người</dt>
            <dd>{request.participantCount}</dd>
          </div>
        )}
        <div>
          <dt>Dịch vụ phối hợp thêm</dt>
          <dd>{extraNames.length ? extraNames.join(', ') : 'Không có'}</dd>
        </div>
        {request.notes && (
          <div className="request-banner-full">
            <dt>Ghi chú</dt>
            <dd>{request.notes}</dd>
          </div>
        )}
      </dl>

      {catalog.phase === 'error' && (
        <div className="admin-request-error" role="alert">
          <p>Không tải được danh mục gói nên đang hiện mã gói. {catalog.message}</p>
          <button type="button" className="blue-cta" onClick={catalog.onRetry}>
            Thử lại tải danh mục
          </button>
        </div>
      )}
    </section>
  );
}
