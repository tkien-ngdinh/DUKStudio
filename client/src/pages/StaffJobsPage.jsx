import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../components/DataStates.jsx';
import { useAuth } from '../context/AuthContext.jsx';

const ALLOWED_JOB_STATUSES = ['Chưa bắt đầu', 'Đang làm', 'Hoàn thành'];
const MAX_UPLOAD_BYTES = 10 * 1024 * 1024; // 10MB per docs/api/08-jobs.md
const ALLOWED_MIME_TYPES = new Set(['image/jpeg', 'image/png']);
const ALLOWED_EXTENSION_RE = /\.(jpe?g|png)$/i;

const ROLE_LABELS = {
  photographer: 'Nhiếp ảnh (Photographer)',
  makeup: 'Trang điểm (Makeup)'
};

const STATUS_BADGE_CLASSES = {
  'Chưa bắt đầu': 'job-status-pill job-status-pill--pending',
  'Đang làm': 'job-status-pill job-status-pill--active',
  'Hoàn thành': 'job-status-pill job-status-pill--done'
};

// Deduplicate concurrent GET /api/staff/jobs calls across React 18 StrictMode double-mounts
const inflightJobsByToken = new Map();

function fetchJobsOnce(token, force = false) {
  const key = token || 'anon';
  if (force) {
    inflightJobsByToken.delete(key);
  }
  if (inflightJobsByToken.has(key)) {
    return inflightJobsByToken.get(key);
  }
  const promise = apiFetch('/api/staff/jobs').finally(() => {
    inflightJobsByToken.delete(key);
  });
  inflightJobsByToken.set(key, promise);
  return promise;
}

function formatBytes(bytes) {
  if (typeof bytes !== 'number' || Number.isNaN(bytes)) return '';
  if (bytes >= 1024 * 1024) {
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
  return `${Math.max(1, Math.round(bytes / 1024))} KB`;
}

function validatePreviewFile(file) {
  if (!file) {
    return 'Vui lòng chọn tệp ảnh JPEG hoặc PNG trước khi tải lên.';
  }
  const hasValidMime = ALLOWED_MIME_TYPES.has(file.type);
  const hasValidExtension = ALLOWED_EXTENSION_RE.test(file.name || '');
  if (!hasValidMime && !(file.type === '' && hasValidExtension)) {
    return 'Định dạng không hợp lệ. Chỉ chấp nhận tệp ảnh JPEG hoặc PNG.';
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return 'Dung lượng tệp vượt quá giới hạn tối đa 10MB.';
  }
  return '';
}

export default function StaffJobsPage() {
  const { token, user } = useAuth();
  const [jobs, setJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [retrying, setRetrying] = useState(false);
  const [loadError, setLoadError] = useState('');

  // Per-job status update form states
  const [draftStatuses, setDraftStatuses] = useState({});
  const [statusErrors, setStatusErrors] = useState({});
  const [statusBanners, setStatusBanners] = useState({});
  const [statusSuccess, setStatusSuccess] = useState({});
  const [updatingJobId, setUpdatingJobId] = useState(null);

  // Per-job preview upload form states
  const [selectedFiles, setSelectedFiles] = useState({});
  const [fileErrors, setFileErrors] = useState({});
  const [uploadBanners, setUploadBanners] = useState({});
  const [uploadSuccess, setUploadSuccess] = useState({});
  const [uploadedPreviewsByJob, setUploadedPreviewsByJob] = useState({});
  const [uploadingJobId, setUploadingJobId] = useState(null);

  const fileInputRefs = useRef({});
  const isMountedRef = useRef(true);

  useEffect(() => {
    document.title = 'DUKStudio — Công việc được giao';
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  const syncDraftStatuses = useCallback((loadedJobs) => {
    const nextDrafts = {};
    for (const job of loadedJobs) {
      nextDrafts[job.id] = job.status;
    }
    setDraftStatuses(nextDrafts);
  }, []);

  const loadJobs = useCallback(
    async (isRetry = false) => {
      if (isRetry) {
        setRetrying(true);
      } else {
        setLoading(true);
      }
      setLoadError('');

      try {
        const data = await fetchJobsOnce(token, isRetry);
        if (!isMountedRef.current) return;
        const nextJobs = Array.isArray(data?.jobs) ? data.jobs : [];
        setJobs(nextJobs);
        syncDraftStatuses(nextJobs);
      } catch (err) {
        if (!isMountedRef.current) return;
        setLoadError(
          err?.message || 'Không thể tải danh sách công việc được giao. Vui lòng thử lại.'
        );
      } finally {
        if (isMountedRef.current) {
          setLoading(false);
          setRetrying(false);
        }
      }
    },
    [token, syncDraftStatuses]
  );

  useEffect(() => {
    loadJobs(false);
  }, [loadJobs]);

  const handleStatusChange = (jobId, nextValue) => {
    setDraftStatuses((prev) => ({ ...prev, [jobId]: nextValue }));
    setStatusErrors((prev) => ({ ...prev, [jobId]: '' }));
    setStatusBanners((prev) => ({ ...prev, [jobId]: '' }));
    setStatusSuccess((prev) => ({ ...prev, [jobId]: '' }));
  };

  const handleStatusSubmit = async (event, jobId) => {
    event.preventDefault();
    if (updatingJobId === jobId) return;

    const chosenStatus = draftStatuses[jobId] ?? '';
    setStatusBanners((prev) => ({ ...prev, [jobId]: '' }));
    setStatusSuccess((prev) => ({ ...prev, [jobId]: '' }));

    if (!ALLOWED_JOB_STATUSES.includes(chosenStatus)) {
      setStatusErrors((prev) => ({
        ...prev,
        [jobId]: 'Trạng thái phải thuộc một trong: Chưa bắt đầu, Đang làm, Hoàn thành.'
      }));
      return;
    }

    setStatusErrors((prev) => ({ ...prev, [jobId]: '' }));
    setUpdatingJobId(jobId);

    try {
      const data = await apiFetch(`/api/staff/jobs/${encodeURIComponent(jobId)}`, {
        method: 'PATCH',
        body: { status: chosenStatus }
      });

      const updatedStatus = data?.job?.status || chosenStatus;
      setJobs((prev) =>
        prev.map((item) => (item.id === jobId ? { ...item, status: updatedStatus } : item))
      );
      setDraftStatuses((prev) => ({ ...prev, [jobId]: updatedStatus }));
      setStatusSuccess((prev) => ({
        ...prev,
        [jobId]: `Đã cập nhật trạng thái thành "${updatedStatus}".`
      }));
    } catch (err) {
      if (err?.status === 400 && err?.fields?.status) {
        setStatusErrors((prev) => ({ ...prev, [jobId]: err.fields.status }));
      }
      setStatusBanners((prev) => ({
        ...prev,
        [jobId]: err?.message || 'Không thể cập nhật trạng thái công việc. Vui lòng thử lại.'
      }));
    } finally {
      setUpdatingJobId(null);
    }
  };

  const handleFileChange = (jobId, event) => {
    const file = event.target.files?.[0] || null;
    setSelectedFiles((prev) => ({ ...prev, [jobId]: file }));
    setUploadBanners((prev) => ({ ...prev, [jobId]: '' }));
    setUploadSuccess((prev) => ({ ...prev, [jobId]: '' }));

    if (file) {
      const validationMsg = validatePreviewFile(file);
      setFileErrors((prev) => ({ ...prev, [jobId]: validationMsg }));
    } else {
      setFileErrors((prev) => ({ ...prev, [jobId]: '' }));
    }
  };

  const handlePreviewSubmit = async (event, jobId) => {
    event.preventDefault();
    if (uploadingJobId === jobId) return;

    const file = selectedFiles[jobId] || null;
    setUploadBanners((prev) => ({ ...prev, [jobId]: '' }));
    setUploadSuccess((prev) => ({ ...prev, [jobId]: '' }));

    const clientError = validatePreviewFile(file);
    if (clientError) {
      setFileErrors((prev) => ({ ...prev, [jobId]: clientError }));
      return;
    }

    setFileErrors((prev) => ({ ...prev, [jobId]: '' }));
    setUploadingJobId(jobId);

    try {
      const formData = new FormData();
      formData.append('file', file);

      const data = await apiFetch(`/api/staff/jobs/${encodeURIComponent(jobId)}/previews`, {
        method: 'POST',
        body: formData
      });

      const uploaded = data?.preview;
      setJobs((prev) =>
        prev.map((item) =>
          item.id === jobId
            ? { ...item, previewsCount: (item.previewsCount || 0) + 1 }
            : item
        )
      );
      if (uploaded) {
        setUploadedPreviewsByJob((prev) => ({
          ...prev,
          [jobId]: [...(prev[jobId] || []), uploaded]
        }));
      }
      setSelectedFiles((prev) => ({ ...prev, [jobId]: null }));
      if (fileInputRefs.current[jobId]) {
        fileInputRefs.current[jobId].value = '';
      }
      setUploadSuccess((prev) => ({
        ...prev,
        [jobId]: uploaded
          ? `Đã tải lên ảnh xem trước "${uploaded.filename}" (${uploaded.id}).`
          : 'Đã tải lên ảnh xem trước thành công.'
      }));
    } catch (err) {
      if (err?.status === 400 && err?.fields?.file) {
        setFileErrors((prev) => ({ ...prev, [jobId]: err.fields.file }));
      }
      setUploadBanners((prev) => ({
        ...prev,
        [jobId]: err?.message || 'Không thể tải ảnh xem trước. Vui lòng thử lại.'
      }));
    } finally {
      setUploadingJobId(null);
    }
  };

  return (
    <div className="page-main">
      <div className="page-heading">
        <p className="eyebrow">&lt; Nhân sự studio · G8 &gt;</p>
        <h1>Công việc được giao</h1>
        <p className="page-subtitle">
          {user?.name ? `Nhân sự ${user.name}` : 'Nhân sự'} theo dõi lịch chụp / trang điểm, cập
          nhật tiến độ và tải ảnh xem trước có watermark lên booking.
        </p>
      </div>

      {loading && <LoadingState label="Đang tải danh sách công việc được giao..." />}

      {!loading && loadError && (
        <ErrorState
          title="Không thể tải danh sách công việc"
          message={loadError}
          onRetry={() => loadJobs(true)}
          retrying={retrying}
        />
      )}

      {!loading && !loadError && jobs.length === 0 && (
        <EmptyState
          title="Chưa có công việc nào được giao"
          description="Hiện chưa có lịch chụp hoặc trang điểm nào được phân công cho tài khoản của bạn."
        />
      )}

      {!loading && !loadError && jobs.length > 0 && (
        <section className="staff-jobs-section" aria-labelledby="jobs-list-heading">
          <div className="section-bar">
            <h2 id="jobs-list-heading">Danh sách lịch làm việc ({jobs.length})</h2>
            <p className="section-note">
              Cập nhật trạng thái từng đầu việc và tải ảnh xem trước (JPEG/PNG, tối đa 10MB).
            </p>
          </div>

          <div className="jobs-grid">
            {jobs.map((job) => {
              const statusSelectId = `job-status-${job.id}`;
              const statusErrorId = `job-status-error-${job.id}`;
              const fileInputId = `job-preview-${job.id}`;
              const fileErrorId = `job-preview-error-${job.id}`;
              const fileHelpId = `job-preview-help-${job.id}`;

              const isUpdating = updatingJobId === job.id;
              const isUploading = uploadingJobId === job.id;
              const currentFile = selectedFiles[job.id];
              const uploadedList = uploadedPreviewsByJob[job.id] || [];
              const badgeClass =
                STATUS_BADGE_CLASSES[job.status] || 'job-status-pill job-status-pill--pending';

              return (
                <article key={job.id} className="job-card" aria-labelledby={`job-title-${job.id}`}>
                  <header className="job-card-header">
                    <div>
                      <p className="job-booking-code">
                        Booking <strong>{job.bookingId}</strong> · Mã việc <code>{job.id}</code>
                      </p>
                      <h3 id={`job-title-${job.id}`}>{job.service}</h3>
                    </div>
                    <span className={badgeClass}>{job.status}</span>
                  </header>

                  <dl className="job-meta-list">
                    <div className="job-meta-row">
                      <dt>Khách hàng</dt>
                      <dd>{job.customerName}</dd>
                    </div>
                    <div className="job-meta-row">
                      <dt>Nhiệm vụ</dt>
                      <dd>{ROLE_LABELS[job.role] || job.role}</dd>
                    </div>
                    <div className="job-meta-row">
                      <dt>Ngày</dt>
                      <dd>{job.date}</dd>
                    </div>
                    <div className="job-meta-row">
                      <dt>Khung giờ</dt>
                      <dd>{job.time}</dd>
                    </div>
                    <div className="job-meta-row">
                      <dt>Địa điểm</dt>
                      <dd>{job.location}</dd>
                    </div>
                    <div className="job-meta-row">
                      <dt>Ảnh xem trước</dt>
                      <dd>{job.previewsCount} ảnh</dd>
                    </div>
                  </dl>

                  <div className="job-forms-stack">
                    {/* Update job status form */}
                    <form
                      className="job-subform"
                      onSubmit={(e) => handleStatusSubmit(e, job.id)}
                      noValidate
                    >
                      <div className="form-group">
                        <label className="form-label" htmlFor={statusSelectId}>
                          Cập nhật trạng thái
                        </label>
                        <select
                          id={statusSelectId}
                          name="status"
                          className="form-input"
                          value={draftStatuses[job.id] ?? job.status}
                          onChange={(e) => handleStatusChange(job.id, e.target.value)}
                          aria-invalid={Boolean(statusErrors[job.id])}
                          aria-describedby={statusErrors[job.id] ? statusErrorId : undefined}
                        >
                          {ALLOWED_JOB_STATUSES.map((st) => (
                            <option key={st} value={st}>
                              {st}
                            </option>
                          ))}
                        </select>
                        {statusErrors[job.id] && (
                          <p id={statusErrorId} className="field-error">
                            {statusErrors[job.id]}
                          </p>
                        )}
                      </div>

                      {statusBanners[job.id] && (
                        <p className="form-banner-error" role="alert">
                          {statusBanners[job.id]}
                        </p>
                      )}

                      {statusSuccess[job.id] && (
                        <p className="form-banner-success" role="status">
                          {statusSuccess[job.id]}
                        </p>
                      )}

                      <button type="submit" className="blue-cta" disabled={isUpdating}>
                        {isUpdating ? 'Đang lưu trạng thái...' : 'Lưu trạng thái'}
                      </button>
                    </form>

                    {/* Upload preview photo form */}
                    <form
                      className="job-subform"
                      onSubmit={(e) => handlePreviewSubmit(e, job.id)}
                      noValidate
                    >
                      <div className="form-group">
                        <label className="form-label" htmlFor={fileInputId}>
                          Tải ảnh xem trước (JPEG/PNG, tối đa 10MB)
                        </label>
                        <input
                          ref={(el) => {
                            fileInputRefs.current[job.id] = el;
                          }}
                          id={fileInputId}
                          name="file"
                          type="file"
                          accept=".jpg,.jpeg,.png,image/jpeg,image/png"
                          className="form-input form-input--file"
                          onChange={(e) => handleFileChange(job.id, e)}
                          aria-invalid={Boolean(fileErrors[job.id])}
                          aria-describedby={
                            fileErrors[job.id] ? `${fileHelpId} ${fileErrorId}` : fileHelpId
                          }
                        />
                        <p id={fileHelpId} className="field-hint">
                          {currentFile
                            ? `Đã chọn: ${currentFile.name} (${formatBytes(currentFile.size)})`
                            : 'Chọn ảnh có watermark định dạng .jpg/.jpeg hoặc .png, không quá 10MB.'}
                        </p>
                        {fileErrors[job.id] && (
                          <p id={fileErrorId} className="field-error">
                            {fileErrors[job.id]}
                          </p>
                        )}
                      </div>

                      {uploadBanners[job.id] && (
                        <p className="form-banner-error" role="alert">
                          {uploadBanners[job.id]}
                        </p>
                      )}

                      {uploadSuccess[job.id] && (
                        <p className="form-banner-success" role="status">
                          {uploadSuccess[job.id]}
                        </p>
                      )}

                      <button type="submit" className="pink-cta" disabled={isUploading}>
                        {isUploading ? 'Đang tải ảnh lên...' : 'Tải ảnh xem trước'}
                      </button>
                    </form>

                    {uploadedList.length > 0 && (
                      <div className="uploaded-previews-box" aria-live="polite">
                        <p className="uploaded-previews-title">
                          Ảnh vừa tải lên cho booking {job.bookingId}:
                        </p>
                        <ul className="uploaded-previews-list">
                          {uploadedList.map((prev) => (
                            <li key={prev.id}>
                              <code>{prev.id}</code> — {prev.filename} ({formatBytes(prev.size)})
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}
    </div>
  );
}
