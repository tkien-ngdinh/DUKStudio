import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../components/DataStates.jsx';

/**
 * Currency formatter following project brief conventions (e.g. 1.800.000đ)
 */
function formatVND(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

/**
 * Assign package visual theme based on package identifier or sequential index
 */
const PACKAGE_THEMES = ['package--lime', 'package--blue', 'package--pink'];

function resolvePackageTheme(pkgId, index) {
  if (pkgId?.includes('premium') || pkgId?.includes('tot-nghiep')) return 'package--blue';
  if (pkgId?.includes('ky-yeu')) return 'package--lime';
  if (pkgId?.includes('chan-dung')) return 'package--pink';
  return PACKAGE_THEMES[index % PACKAGE_THEMES.length];
}

const PACKAGE_MARKS = ['✳', '✦', '✿', '★'];

// Deduplicate concurrent /api/catalog calls across React 18 StrictMode double-mounts
let inflightCatalogPromise = null;

function fetchCatalogOnce(force = false) {
  if (force) {
    inflightCatalogPromise = null;
  }
  if (inflightCatalogPromise) {
    return inflightCatalogPromise;
  }
  inflightCatalogPromise = apiFetch('/api/catalog').finally(() => {
    inflightCatalogPromise = null;
  });
  return inflightCatalogPromise;
}

export default function HomePage() {
  const [catalog, setCatalog] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [retrying, setRetrying] = useState(false);

  const fetchCatalogData = (isRetry = false) => {
    if (isRetry) setRetrying(true);
    else setLoading(true);
    setError(null);

    fetchCatalogOnce(isRetry)
      .then((data) => {
        setCatalog(data);
      })
      .catch((err) => {
        setError(err?.message || 'Không thể tải danh mục dịch vụ. Vui lòng thử lại.');
      })
      .finally(() => {
        setLoading(false);
        setRetrying(false);
      });
  };

  useEffect(() => {
    let ignore = false;
    setLoading(true);
    setError(null);

    fetchCatalogOnce(false)
      .then((data) => {
        if (!ignore) setCatalog(data);
      })
      .catch((err) => {
        if (!ignore) {
          setError(err?.message || 'Không thể tải danh mục dịch vụ. Vui lòng thử lại.');
        }
      })
      .finally(() => {
        if (!ignore) setLoading(false);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return (
    <div className="home-page">
      {/* 1. Hero Section (PA#2 Brand Identity) */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="hero-illustration">
          <div className="hero-feather">
            <img
              src="/assets/hero.svg"
              alt="Ảnh minh họa concept tốt nghiệp DUKStudio"
              width="416"
              height="340"
            />
          </div>
        </div>
        <div className="hero-copy">
          <h1 id="hero-title">Lưu lại ngày ra trường</h1>
          <p>
            Trang phục chỉn chu, ảnh chụp tự nhiên, nhận ảnh đúng hẹn. Tư vấn qua chat ngay bên
            dưới hoặc chọn gói trước.
          </p>
          <div className="hero-actions">
            <a className="pink-cta" href="#dich-vu">
              Xem gói chụp
            </a>
            <Link className="blue-cta" to="/chat">
              Tư vấn đặt lịch
            </Link>
          </div>
        </div>
      </section>

      {/* 2. Main Catalog Content with UX States */}
      {loading ? (
        <div className="page-main">
          <LoadingState label="Đang tải danh mục dịch vụ DUKStudio..." />
        </div>
      ) : error ? (
        <div className="page-main">
          <ErrorState
            title="Lỗi tải danh mục dịch vụ"
            message={error}
            onRetry={() => fetchCatalogData(true)}
            retrying={retrying}
          />
        </div>
      ) : !catalog || !catalog.services || catalog.services.length === 0 ? (
        <div className="page-main">
          <EmptyState
            title="Chưa có dịch vụ nào"
            description="Studio hiện đang cập nhật danh mục dịch vụ mới. Vui lòng quay lại sau."
          />
        </div>
      ) : (
        <div className="catalog-content">
          {/* Section: Services & Grouped Packages */}
          <section className="section services-section" id="dich-vu" aria-labelledby="services-title">
            <div className="section-intro">
              <p className="eyebrow">&lt; Dịch vụ &gt;</p>
              <h2 id="services-title">Dịch vụ & Gói chụp tốt nghiệp</h2>
              <p className="section-microcopy">
                Một lịch hẹn cho cả buổi chụp — từ hỏi giá, chốt giờ đến nhận ảnh. Dịch vụ được phân
                tách rõ ràng kèm các gói chi tiết.
              </p>
            </div>

            {/* Loop through each service to present services strictly separated from packages */}
            <div className="services-container">
              {catalog.services.map((service) => (
                <article
                  key={service.id}
                  className="service-group"
                  aria-labelledby={`svc-heading-${service.id}`}
                >
                  <header className="service-header">
                    <div className="service-header-main">
                      <h3 id={`svc-heading-${service.id}`} className="service-title">
                        {service.title}
                      </h3>
                      <p className="service-desc">{service.description}</p>
                    </div>
                    <div className="service-pricing-badge" aria-label={`Giá khởi điểm từ ${formatVND(service.startingPrice)} trên mỗi ${service.unit}`}>
                      <span className="service-price-label">Khởi điểm từ</span>
                      <strong className="service-starting-price">
                        {formatVND(service.startingPrice)}
                      </strong>
                      <span className="service-unit">/{service.unit}</span>
                    </div>
                  </header>

                  {/* Packages nested strictly under their owning service */}
                  <div className="packages">
                    {service.packages && service.packages.length > 0 ? (
                      service.packages.map((pkg, idx) => {
                        const theme = resolvePackageTheme(pkg.id, idx);
                        const mark = PACKAGE_MARKS[idx % PACKAGE_MARKS.length];
                        const stepNum = String(idx + 1).padStart(2, '0');

                        return (
                          <article key={pkg.id} className={`package ${theme}`}>
                            <div className="package-top">
                              <span>
                                {stepNum} / {pkg.durationHours}h chụp · {pkg.editedPhotos} ảnh chỉnh
                              </span>
                              <span className="package-mark" aria-hidden="true">
                                {mark}
                              </span>
                            </div>

                            <div className="package-inner">
                              <span className="package-kicker">{service.title}</span>
                              <h4 className="package-heading">{pkg.name}</h4>

                              {pkg.features && pkg.features.length > 0 && (
                                <ul className="package-features-list">
                                  {pkg.features.map((feature, fIdx) => (
                                    <li key={fIdx}>
                                      <span aria-hidden="true">✓</span> {feature}
                                    </li>
                                  ))}
                                </ul>
                              )}

                              <div className="package-deposit-info">
                                <span>Cọc 30%: <strong>{formatVND(pkg.deposit30)}</strong></span>
                                <span>Còn lại: <strong>{formatVND(pkg.remaining70)}</strong></span>
                              </div>
                            </div>

                            <div className="package-bottom">
                              <p className="package-price">
                                Từ <strong>{formatVND(pkg.price)}</strong>
                                {service.unit === 'người' ? <small>/người</small> : ''}
                              </p>
                              <Link
                                to="/chat"
                                className="pink-cta package-cta"
                                aria-label={`Tư vấn đặt ${pkg.name} qua chat`}
                              >
                                Tư vấn gói này
                              </Link>
                            </div>
                          </article>
                        );
                      })
                    ) : (
                      <p className="empty-subtext">Dịch vụ này hiện chưa có gói chụp cụ thể.</p>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </section>

          {/* Section: Accessories */}
          <section
            className="section accessories-section"
            id="phu-kien"
            aria-labelledby="accessories-title"
          >
            <div className="section-intro">
              <p className="eyebrow">&lt; Phụ kiện &gt;</p>
              <h2 id="accessories-title">Phụ kiện & Trang phục hỗ trợ</h2>
              <p className="section-microcopy">
                Các phụ kiện và lễ phục có sẵn tại studio để phục vụ phối đồ trong buổi chụp.
              </p>
            </div>

            {!catalog.accessories || catalog.accessories.length === 0 ? (
              <p className="empty-subtext">Hiện chưa có phụ kiện trưng bày trong danh mục.</p>
            ) : (
              <div className="accessories-grid">
                {catalog.accessories.map((acc) => (
                  <article key={acc.id} className="accessory-card">
                    <div className="accessory-badge" aria-hidden="true">
                      ★
                    </div>
                    <div className="accessory-body">
                      <h3 className="accessory-name">{acc.name}</h3>
                      <p className="accessory-desc">{acc.description}</p>
                      <p className="accessory-price">
                        Giá tham khảo: <strong>{formatVND(acc.price)}</strong>
                        <small>/{acc.unit}</small>
                      </p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Section: Sample Photos (No real people photos - abstract illustration placeholder) */}
          <section
            className="section samples-section"
            id="anh-mau"
            aria-labelledby="samples-title"
          >
            <div className="section-intro">
              <p className="eyebrow">&lt; Portfolio &gt;</p>
              <h2 id="samples-title">Ảnh mẫu & Concept thực hiện</h2>
              <p className="section-microcopy">
                Các concept chụp mẫu do DUKStudio xây dựng (hiển thị đồ họa minh họa trừu tượng,
                tuân thủ quy định không dùng ảnh người thật).
              </p>
            </div>

            {!catalog.samplePhotos || catalog.samplePhotos.length === 0 ? (
              <p className="empty-subtext">Hiện chưa có ảnh mẫu nào trong danh mục.</p>
            ) : (
              <div className="samples-grid">
                {catalog.samplePhotos.map((photo) => (
                  <article key={photo.id} className="sample-card">
                    <div className="sample-graphic-box" aria-hidden="true">
                      <svg
                        viewBox="0 0 160 120"
                        className="sample-svg-art"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                      >
                        <rect width="160" height="120" rx="8" fill="var(--light-blue)" />
                        <circle cx="80" cy="50" r="28" fill="var(--blue)" opacity="0.15" />
                        <path
                          d="M50 85L75 60L95 80L115 65L130 85H50Z"
                          fill="var(--blue)"
                          opacity="0.35"
                        />
                        <circle cx="108" cy="40" r="8" fill="var(--lime)" />
                        <rect
                          x="20"
                          y="96"
                          width="120"
                          height="6"
                          rx="3"
                          fill="var(--blue)"
                          opacity="0.2"
                        />
                      </svg>
                      <span className="sample-category-tag">{photo.category}</span>
                    </div>
                    <div className="sample-card-body">
                      <h3 className="sample-title">{photo.title}</h3>
                      <p className="sample-description">{photo.description}</p>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>

          {/* Section: Customer Reviews */}
          <section
            className="section reviews-section"
            id="danh-gia"
            aria-labelledby="reviews-title"
          >
            <div className="section-intro">
              <p className="eyebrow">&lt; Đánh giá &gt;</p>
              <h2 id="reviews-title">Cảm nhận từ khách hàng</h2>
              <p className="section-microcopy">
                Phản hồi chân thực từ các bạn học sinh, sinh viên đã trải nghiệm dịch vụ tại DUKStudio.
              </p>
            </div>

            {!catalog.reviews || catalog.reviews.length === 0 ? (
              <p className="empty-subtext">Chưa có đánh giá nào được hiển thị.</p>
            ) : (
              <div className="reviews-grid">
                {catalog.reviews.map((rev) => {
                  const starCount = Math.max(1, Math.min(5, rev.rating || 5));
                  const emptyStars = Math.max(0, 5 - starCount);

                  return (
                    <article key={rev.id} className="review-card">
                      <div className="review-card-header">
                        <div className="review-author-meta">
                          <h3 className="review-customer-name">{rev.customerName}</h3>
                          <p className="review-service-badge">{rev.service}</p>
                        </div>
                        <div
                          className="review-rating"
                          aria-label={`Đánh giá ${starCount} trên 5 sao`}
                        >
                          <span className="review-stars" aria-hidden="true">
                            {'★'.repeat(starCount)}
                            {'☆'.repeat(emptyStars)}
                          </span>
                        </div>
                      </div>
                      <blockquote className="review-comment">
                        <p>"{rev.comment}"</p>
                      </blockquote>
                      <div className="review-footer">
                        <time dateTime={rev.date} className="review-date">
                          {rev.date}
                        </time>
                      </div>
                    </article>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section: Chat Call-to-Action */}
          <section className="section chat-cta-section" aria-labelledby="cta-chat-title">
            <div className="chat-cta-card">
              <p className="eyebrow">&lt; Đặt lịch trực tiếp &gt;</p>
              <h2 id="cta-chat-title">Sẵn sàng lưu giữ khoảnh khắc tốt nghiệp?</h2>
              <p className="chat-cta-desc">
                Trò chuyện trực tiếp với studio để kiểm tra lịch trống và nhận tư vấn chi tiết cho
                buổi chụp của bạn.
              </p>
              <div className="chat-cta-actions">
                <Link to="/chat" className="pink-cta">
                  Nhắn tin với studio
                </Link>
              </div>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
