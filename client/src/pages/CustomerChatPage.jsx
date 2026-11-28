import { useEffect, useRef, useState } from 'react';
import { apiFetch } from '../api/client.js';
import { EmptyState, ErrorState, LoadingState } from '../components/DataStates.jsx';

/**
 * Deduplicate concurrent GET requests across React 18 StrictMode double-mounts
 */
const inflightGetRequests = new Map();

function fetchGetOnce(path, force = false) {
  if (force) {
    inflightGetRequests.delete(path);
  }
  if (inflightGetRequests.has(path)) {
    return inflightGetRequests.get(path);
  }
  const promise = apiFetch(path).finally(() => {
    inflightGetRequests.delete(path);
  });
  inflightGetRequests.set(path, promise);
  return promise;
}

/**
 * Format currency according to project brief (e.g. 1.800.000đ)
 */
function formatVND(amount) {
  if (typeof amount !== 'number') return '';
  return new Intl.NumberFormat('vi-VN').format(amount) + 'đ';
}

/**
 * Format ISO timestamp to localized readable time
 */
function formatTime(isoString) {
  if (!isoString) return '';
  try {
    const d = new Date(isoString);
    if (isNaN(d.getTime())) return isoString;
    return (
      d.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }) +
      ' · ' +
      d.toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' })
    );
  } catch {
    return isoString;
  }
}

/** Convert internal room IDs in legacy/API proposal data into customer-facing names. */
function formatRoomName(room) {
  if (typeof room !== 'string' || !room.trim()) return 'Phòng chụp';
  const value = room.trim();
  const roomLabels = { 'room-a': 'Phòng A', 'room-b': 'Phòng B' };
  return roomLabels[value.toLowerCase()] || value;
}

/**
 * Pick the conversation with the latest lastMessageAt timestamp
 */
function getLatestConversationId(list) {
  if (!Array.isArray(list) || list.length === 0) return null;
  let latest = list[0];
  let latestTime = new Date(latest.lastMessageAt || 0).getTime();
  for (let i = 1; i < list.length; i++) {
    const time = new Date(list[i].lastMessageAt || 0).getTime();
    if (time > latestTime) {
      latest = list[i];
      latestTime = time;
    }
  }
  return latest.id;
}

/** Prefer the conversation's active proposal status when older message snapshots are stale. */
function syncActiveProposalStatus(conversation) {
  if (!conversation?.activeProposal || !Array.isArray(conversation.messages)) return conversation;

  let latestProposalIndex = -1;
  for (let index = conversation.messages.length - 1; index >= 0; index -= 1) {
    if (conversation.messages[index].proposal) {
      latestProposalIndex = index;
      break;
    }
  }
  if (latestProposalIndex < 0) return conversation;

  return {
    ...conversation,
    messages: conversation.messages.map((message, index) =>
      index === latestProposalIndex
        ? {
            ...message,
            proposal: {
              ...message.proposal,
              ...conversation.activeProposal,
              status: conversation.activeProposal.status
            }
          }
        : message
    )
  };
}

export default function CustomerChatPage() {
  // 1. Conversations list state
  const [conversations, setConversations] = useState([]);
  const [loadingConvs, setLoadingConvs] = useState(true);
  const [convsError, setConvsError] = useState(null);

  // 2. Selected conversation ID: string ID or 'new' for creating an inquiry
  const [selectedConvId, setSelectedConvId] = useState(null);

  // 3. Conversation details cache: { [id]: conversationObject }
  const [convDetails, setConvDetails] = useState({});
  const convDetailsRef = useRef(convDetails);
  convDetailsRef.current = convDetails;

  const [loadingActive, setLoadingActive] = useState(false);
  const [activeError, setActiveError] = useState(null);

  // Active conversation resolved from cache
  const activeConv =
    selectedConvId && selectedConvId !== 'new' ? convDetails[selectedConvId] || null : null;

  // 4. Catalog state (for packages & extras options in inquiry form)
  const [catalog, setCatalog] = useState(null);
  const [loadingCatalog, setLoadingCatalog] = useState(false);
  const [catalogError, setCatalogError] = useState(null);
  const packageNamesById = new Map(
    (catalog?.services || []).flatMap((service) =>
      (service.packages || []).map((pkg) => [pkg.id, pkg.name])
    )
  );
  const extraNamesById = new Map((catalog?.extras || []).map((extra) => [extra.id, extra.name]));

  // 5. Booking Inquiry Form State
  const [inquiryForm, setInquiryForm] = useState({
    packageId: '',
    preferredDate: '',
    preferredTime: '09:00',
    extras: [],
    participantCount: '',
    notes: '',
    message: ''
  });
  const [formErrors, setFormErrors] = useState({});
  const [submittingInquiry, setSubmittingInquiry] = useState(false);
  const [inquirySubmitError, setInquirySubmitError] = useState('');

  // 6. Regular Message Form State
  const [newMsgText, setNewMsgText] = useState('');
  const [sendingMsg, setSendingMsg] = useState(false);
  const [msgError, setMsgError] = useState('');

  // 7. Proposal Response State (G6)
  const [submittingProposalDecision, setSubmittingProposalDecision] = useState(false);
  const [proposalActionError, setProposalActionError] = useState('');
  const proposalDecisionLockRef = useRef(false);

  // Load conversations list
  const loadConversations = (force = false) => {
    setLoadingConvs(true);
    setConvsError(null);

    fetchGetOnce('/api/conversations', force)
      .then((data) => {
        const list = Array.isArray(data?.conversations) ? data.conversations : [];
        setConversations(list);
        if (list.length > 0) {
          setSelectedConvId((prev) => {
            // Keep existing manual selection if valid
            if (prev && (prev === 'new' || list.some((c) => c.id === prev))) {
              return prev;
            }
            // Pick conversation with latest lastMessageAt
            return getLatestConversationId(list);
          });
        } else {
          // No conversation exists: open inquiry form
          setSelectedConvId('new');
        }
      })
      .catch((err) => {
        setConvsError(err?.message || 'Không thể tải danh sách cuộc trò chuyện.');
      })
      .finally(() => {
        setLoadingConvs(false);
      });
  };

  // Load catalog for inquiry form options
  const loadCatalog = (force = false) => {
    setLoadingCatalog(true);
    setCatalogError(null);

    fetchGetOnce('/api/catalog', force)
      .then((data) => {
        setCatalog(data);
      })
      .catch((err) => {
        setCatalogError(err?.message || 'Không thể tải danh mục dịch vụ và tiện ích chụp.');
      })
      .finally(() => {
        setLoadingCatalog(false);
      });
  };

  // Initial load
  useEffect(() => {
    loadConversations(false);
    loadCatalog(false);
  }, []);

  // When selected conversation changes, fetch its detail only if not already cached
  useEffect(() => {
    setProposalActionError('');

    if (!selectedConvId || selectedConvId === 'new') {
      return;
    }

    // If detail is already cached (messages array present), reuse directly without GET
    if (convDetailsRef.current[selectedConvId]?.messages) {
      setLoadingActive(false);
      setActiveError(null);
      setMsgError('');
      return;
    }

    setLoadingActive(true);
    setActiveError(null);
    setMsgError('');

    fetchGetOnce(`/api/conversations/${selectedConvId}`, false)
      .then((data) => {
        if (data?.conversation) {
          const conversation = syncActiveProposalStatus(data.conversation);
          setConvDetails((prev) => ({
            ...prev,
            [conversation.id]: conversation
          }));
        }
      })
      .catch((err) => {
        setActiveError(err?.message || 'Không thể tải chi tiết cuộc trò chuyện.');
      })
      .finally(() => {
        setLoadingActive(false);
      });
  }, [selectedConvId]);

  // Handler for retry fetching active conversation
  const handleRetryActive = () => {
    if (!selectedConvId || selectedConvId === 'new') return;
    setLoadingActive(true);
    setActiveError(null);

    fetchGetOnce(`/api/conversations/${selectedConvId}`, true)
      .then((data) => {
        if (data?.conversation) {
          const conversation = syncActiveProposalStatus(data.conversation);
          setConvDetails((prev) => ({
            ...prev,
            [conversation.id]: conversation
          }));
        }
      })
      .catch((err) => {
        setActiveError(err?.message || 'Không thể tải chi tiết cuộc trò chuyện.');
      })
      .finally(() => {
        setLoadingActive(false);
      });
  };

  // Find parent service to determine if package is priced per person via contract unit field
  const selectedService = catalog?.services?.find((s) =>
    s.packages?.some((p) => p.id === inquiryForm.packageId)
  );
  const isPerPersonPackage = selectedService?.unit === 'người';

  // Toggle extras checkbox
  const handleExtraToggle = (extraId) => {
    setInquiryForm((prev) => {
      const exists = prev.extras.includes(extraId);
      return {
        ...prev,
        extras: exists ? prev.extras.filter((id) => id !== extraId) : [...prev.extras, extraId]
      };
    });
  };

  // Submit Booking Inquiry (POST /api/conversations)
  const handleSubmitInquiry = async (e) => {
    e.preventDefault();
    setInquirySubmitError('');

    // Client-side pre-validation
    const errors = {};
    if (!inquiryForm.packageId.trim()) {
      errors.packageId = 'Vui lòng chọn gói chụp';
    }
    if (!inquiryForm.preferredDate.trim()) {
      errors.preferredDate = 'Vui lòng chọn ngày chụp mong muốn';
    }
    if (!inquiryForm.message.trim()) {
      errors.message = 'Vui lòng nhập câu hỏi hoặc lời nhắn tư vấn';
    }
    if (isPerPersonPackage) {
      const count = parseInt(inquiryForm.participantCount, 10);
      if (isNaN(count) || count < 1) {
        errors.participantCount = 'Vui lòng nhập số người tham gia (tối thiểu 1 người)';
      }
    }

    if (Object.keys(errors).length > 0) {
      setFormErrors(errors);
      return;
    }

    setFormErrors({});
    setSubmittingInquiry(true);

    const payload = {
      packageId: inquiryForm.packageId,
      preferredDate: inquiryForm.preferredDate,
      message: inquiryForm.message.trim()
    };
    if (inquiryForm.preferredTime) {
      payload.preferredTime = inquiryForm.preferredTime;
    }
    if (inquiryForm.extras && inquiryForm.extras.length > 0) {
      payload.extras = inquiryForm.extras;
    }
    if (inquiryForm.notes && inquiryForm.notes.trim()) {
      payload.notes = inquiryForm.notes.trim();
    }
    if (isPerPersonPackage && inquiryForm.participantCount) {
      payload.participantCount = parseInt(inquiryForm.participantCount, 10);
    }

    try {
      // Pass object directly to apiFetch so Content-Type: application/json is set
      const data = await apiFetch('/api/conversations', {
        method: 'POST',
        body: payload
      });

      if (data?.conversation) {
        const created = data.conversation;
        // Cache full conversation response immediately to avoid redundant GET
        convDetailsRef.current[created.id] = created;
        setConvDetails((prev) => ({
          ...prev,
          [created.id]: created
        }));

        // Add to conversations list
        setConversations((prev) => [created, ...prev.filter((c) => c.id !== created.id)]);

        // Switch to newly created conversation
        setSelectedConvId(created.id);

        // Reset form
        setInquiryForm({
          packageId: '',
          preferredDate: '',
          preferredTime: '09:00',
          extras: [],
          participantCount: '',
          notes: '',
          message: ''
        });
      }
    } catch (err) {
      if (err?.status === 400 && err.fields) {
        setFormErrors(err.fields);
      } else {
        setInquirySubmitError(err?.message || 'Không thể gửi yêu cầu đặt lịch. Vui lòng thử lại.');
      }
    } finally {
      setSubmittingInquiry(false);
    }
  };

  // Send standard chat message (POST /api/conversations/:id/messages)
  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMsgText.trim() || !activeConv?.id) return;

    setMsgError('');
    setSendingMsg(true);

    try {
      // Pass object directly to apiFetch so Content-Type: application/json is set
      const data = await apiFetch(`/api/conversations/${activeConv.id}/messages`, {
        method: 'POST',
        body: { text: newMsgText.trim() }
      });

      if (data?.message) {
        const newMsg = data.message;
        // Append newly returned message to active conversation immediately
        setConvDetails((prev) => {
          const current = prev[activeConv.id];
          if (!current) return prev;
          const updatedMessages = [...(current.messages || []), newMsg];
          return {
            ...prev,
            [activeConv.id]: {
              ...current,
              messages: updatedMessages,
              lastMessageAt: newMsg.timestamp
            }
          };
        });
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id ? { ...c, lastMessageAt: newMsg.timestamp } : c
          )
        );
        setNewMsgText('');
      } else if (data?.conversation) {
        // If messaging a completed conversation created a new one (per contract rule)
        const newConv = data.conversation;
        convDetailsRef.current[newConv.id] = newConv;
        setConvDetails((prev) => ({
          ...prev,
          [newConv.id]: newConv
        }));
        setConversations((prev) => [newConv, ...prev.filter((c) => c.id !== newConv.id)]);
        setSelectedConvId(newConv.id);
        setNewMsgText('');
      }
    } catch (err) {
      if (err?.status === 400 && err.fields?.text) {
        setMsgError(err.fields.text);
      } else {
        setMsgError(err?.message || 'Không thể gửi tin nhắn. Vui lòng thử lại.');
      }
    } finally {
      setSendingMsg(false);
    }
  };

  // Respond to shoot schedule proposal (POST /api/conversations/:id/respond-proposal)
  const handleRespondProposal = async (decision) => {
    if (!activeConv?.id || !decision || proposalDecisionLockRef.current) return;

    proposalDecisionLockRef.current = true;
    setProposalActionError('');
    setSubmittingProposalDecision(true);

    try {
      // Pass object directly to apiFetch so Content-Type: application/json is set
      const data = await apiFetch(`/api/conversations/${activeConv.id}/respond-proposal`, {
        method: 'POST',
        body: { decision }
      });

      if (data) {
        // Update proposal status, conversation status, and messages from API response
        setConvDetails((prev) => {
          const current = prev[activeConv.id];
          if (!current) return prev;

          let updatedMessages = (current.messages || []).map((msg) => {
            if (msg.proposal && msg.proposal.status === 'pending') {
              return {
                ...msg,
                proposal: {
                  ...msg.proposal,
                  ...(data.proposal || {}),
                  status: data.proposal?.status || (decision === 'accept' ? 'agreed' : 'declined')
                }
              };
            }
            return msg;
          });

          if (data.message && !updatedMessages.some((message) => message.id === data.message.id)) {
            updatedMessages = [...updatedMessages, data.message];
          }

          const nextStatus = data.status || current.status;
          const nextTimestamp = data.message?.timestamp || current.lastMessageAt;

          const updatedConv = {
            ...current,
            status: nextStatus,
            activeProposal: data.proposal || current.activeProposal,
            messages: updatedMessages,
            lastMessageAt: nextTimestamp
          };

          convDetailsRef.current[activeConv.id] = updatedConv;
          return {
            ...prev,
            [activeConv.id]: updatedConv
          };
        });

        // Also update status and timestamp in conversations list
        setConversations((prev) =>
          prev.map((c) =>
            c.id === activeConv.id
              ? {
                  ...c,
                  status: data.status || c.status,
                  lastMessageAt: data.message?.timestamp || c.lastMessageAt
                }
              : c
          )
        );
      }
    } catch (err) {
      if (err?.status === 409) {
        try {
          const latestData = await fetchGetOnce(`/api/conversations/${activeConv.id}`, true);
          if (latestData?.conversation) {
            const latestConversation = syncActiveProposalStatus(latestData.conversation);
            const nextDetails = {
              ...convDetailsRef.current,
              [latestConversation.id]: latestConversation
            };
            convDetailsRef.current = nextDetails;
            setConvDetails(nextDetails);
            setConversations((prev) =>
              prev.map((conversation) =>
                conversation.id === latestConversation.id
                  ? {
                      ...conversation,
                      status: latestConversation.status,
                      lastMessageAt: latestConversation.lastMessageAt
                    }
                  : conversation
              )
            );
            setProposalActionError(
              latestConversation.activeProposal?.status === 'pending'
                ? err.message
                : ''
            );
            return;
          }
        } catch {
          // Fall through to the original conflict message if the refresh also fails.
        }
      }
      setProposalActionError(err?.message || 'Không thể gửi phản hồi đề xuất. Vui lòng thử lại.');
    } finally {
      proposalDecisionLockRef.current = false;
      setSubmittingProposalDecision(false);
    }
  };

  return (
    <div className="page-main chat-page-main">
      <header className="page-heading">
        <h1 id="chat-heading">Tư vấn & Yêu cầu đặt lịch</h1>
        <p className="page-subtitle">
          Trao đổi trực tiếp với DUKStudio, gửi yêu cầu đặt lịch và theo dõi tiến độ buổi chụp của bạn.
        </p>
      </header>

      {/* Primary loading/error states for conversations list */}
      {loadingConvs ? (
        <LoadingState label="Đang tải danh sách cuộc trò chuyện..." />
      ) : convsError ? (
        <ErrorState
          title="Không thể tải danh sách hội thoại"
          message={convsError}
          onRetry={() => loadConversations(true)}
        />
      ) : (
        <div className="chat-layout-wrapper">
          {/* Navigation bar: conversation switcher + new inquiry trigger */}
          <nav className="chat-nav-bar" aria-label="Danh sách cuộc hội thoại của bạn">
            <div className="chat-nav-tabs">
              <button
                type="button"
                className={`chat-tab-btn ${selectedConvId === 'new' ? 'is-active' : ''}`}
                onClick={() => setSelectedConvId('new')}
              >
                + Gửi yêu cầu đặt lịch mới
              </button>

              {conversations.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  className={`chat-tab-btn ${selectedConvId === c.id ? 'is-active' : ''}`}
                  onClick={() => setSelectedConvId(c.id)}
                >
                  <span className="conv-id">{c.id}</span>
                  <span className="conv-status-tag">{c.status}</span>
                </button>
              ))}
            </div>
          </nav>

          {/* Main Content: either Inquiry Form or Active Chat Thread */}
          {selectedConvId === 'new' ? (
            <section className="inquiry-form-card" aria-labelledby="new-inquiry-title">
              <header className="inquiry-form-header">
                <h2 id="new-inquiry-title">Gửi yêu cầu đặt lịch chụp ảnh</h2>
                <p>
                  Chọn gói chụp, ngày giờ mong muốn và gửi câu hỏi cho DUKStudio để được kiểm tra
                  lịch thợ và phòng chụp.
                </p>
              </header>

              {/* Explicit catalog states: loading, error with Retry, empty state */}
              {loadingCatalog ? (
                <LoadingState label="Đang tải danh mục dịch vụ và gói chụp..." />
              ) : catalogError ? (
                <ErrorState
                  title="Không thể tải danh mục dịch vụ"
                  message={catalogError}
                  onRetry={() => loadCatalog(true)}
                />
              ) : !catalog?.services || catalog.services.length === 0 ? (
                <EmptyState
                  title="Chưa có gói dịch vụ nào"
                  description="Hiện tại studio chưa có gói dịch vụ nào trên hệ thống để đặt lịch. Vui lòng quay lại sau."
                />
              ) : (
                <>
                  {inquirySubmitError && (
                    <div className="form-banner-error" role="alert">
                      {inquirySubmitError}
                    </div>
                  )}

                  <form className="form-stack" onSubmit={handleSubmitInquiry} noValidate>
                    {/* 1. Package Select (Mapped to packageId) */}
                    <div className="form-group">
                      <label htmlFor="inquiry-package" className="form-label">
                        Loại chụp & Gói dịch vụ <span className="req-star" aria-hidden="true">*</span>
                      </label>
                      <select
                        id="inquiry-package"
                        className="form-input"
                        value={inquiryForm.packageId}
                        onChange={(e) => {
                          const nextPkgId = e.target.value;
                          setInquiryForm((prev) => ({ ...prev, packageId: nextPkgId }));
                          setFormErrors((prev) => ({
                            ...prev,
                            packageId: undefined,
                            participantCount: undefined
                          }));
                        }}
                        aria-required="true"
                        aria-invalid={Boolean(formErrors.packageId)}
                        aria-describedby={formErrors.packageId ? 'inquiry-package-error' : undefined}
                      >
                        <option value="">-- Chọn gói chụp phù hợp --</option>
                        {catalog.services.map((svc) => (
                          <optgroup
                            key={svc.id}
                            label={`${svc.title} (Khởi điểm: ${formatVND(svc.startingPrice)}/${svc.unit})`}
                          >
                            {svc.packages?.map((pkg) => (
                              <option key={pkg.id} value={pkg.id}>
                                {pkg.name} — {formatVND(pkg.price)} ({pkg.durationHours}h chụp,{' '}
                                {pkg.editedPhotos} ảnh chỉnh)
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      {formErrors.packageId && (
                        <p id="inquiry-package-error" className="field-error" role="alert">
                          {formErrors.packageId}
                        </p>
                      )}
                    </div>

                    {/* Optional Participant Count if package is per-person */}
                    {isPerPersonPackage && (
                      <div className="form-group">
                        <label htmlFor="inquiry-participants" className="form-label">
                          Số lượng người tham gia <span className="req-star" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="inquiry-participants"
                          type="number"
                          min="1"
                          className="form-input"
                          value={inquiryForm.participantCount}
                          onChange={(e) => {
                            setInquiryForm({ ...inquiryForm, participantCount: e.target.value });
                            if (formErrors.participantCount) {
                              setFormErrors((prev) => ({ ...prev, participantCount: undefined }));
                            }
                          }}
                          placeholder="Nhập số lượng người tham gia"
                          aria-required="true"
                          aria-invalid={Boolean(formErrors.participantCount)}
                          aria-describedby={
                            formErrors.participantCount ? 'inquiry-participants-error' : undefined
                          }
                        />
                        {formErrors.participantCount && (
                          <p id="inquiry-participants-error" className="field-error" role="alert">
                            {formErrors.participantCount}
                          </p>
                        )}
                      </div>
                    )}

                    {/* 2. Date & Time Row */}
                    <div className="form-row-duo">
                      <div className="form-group">
                        <label htmlFor="inquiry-date" className="form-label">
                          Ngày chụp mong muốn <span className="req-star" aria-hidden="true">*</span>
                        </label>
                        <input
                          id="inquiry-date"
                          type="date"
                          className="form-input"
                          value={inquiryForm.preferredDate}
                          onChange={(e) => {
                            setInquiryForm({ ...inquiryForm, preferredDate: e.target.value });
                            if (formErrors.preferredDate) {
                              setFormErrors((prev) => ({ ...prev, preferredDate: undefined }));
                            }
                          }}
                          aria-required="true"
                          aria-invalid={Boolean(formErrors.preferredDate)}
                          aria-describedby={formErrors.preferredDate ? 'inquiry-date-error' : undefined}
                        />
                        {formErrors.preferredDate && (
                          <p id="inquiry-date-error" className="field-error" role="alert">
                            {formErrors.preferredDate}
                          </p>
                        )}
                      </div>

                      <div className="form-group">
                        <label htmlFor="inquiry-time" className="form-label">
                          Khung giờ mong muốn
                        </label>
                        <select
                          id="inquiry-time"
                          className="form-input"
                          value={inquiryForm.preferredTime}
                          onChange={(e) =>
                            setInquiryForm({ ...inquiryForm, preferredTime: e.target.value })
                          }
                        >
                          <option value="09:00">09:00 (Buổi sáng)</option>
                          <option value="10:30">10:30 (Buổi sáng)</option>
                          <option value="13:00">13:00 (Buổi chiều)</option>
                          <option value="14:00">14:00 (Buổi chiều)</option>
                          <option value="15:30">15:30 (Buổi chiều)</option>
                        </select>
                      </div>
                    </div>

                    {/* 3. Coordination Extras (from catalog.extras) */}
                    <div className="form-group">
                      <span className="form-label">Dịch vụ phối hợp thêm (Extras):</span>
                      <div className="checkbox-grid">
                        {catalog.extras?.map((extra) => (
                          <label
                            key={extra.id}
                            className="checkbox-item"
                            htmlFor={`extra-${extra.id}`}
                          >
                            <input
                              id={`extra-${extra.id}`}
                              type="checkbox"
                              checked={inquiryForm.extras.includes(extra.id)}
                              onChange={() => handleExtraToggle(extra.id)}
                            />
                            <span>{extra.name}</span>
                          </label>
                        ))}
                      </div>
                    </div>

                    {/* 4. Inquiry Message */}
                    <div className="form-group">
                      <label htmlFor="inquiry-message" className="form-label">
                        Câu hỏi / Lời nhắn tư vấn <span className="req-star" aria-hidden="true">*</span>
                      </label>
                      <textarea
                        id="inquiry-message"
                        rows="3"
                        className="form-input"
                        value={inquiryForm.message}
                        onChange={(e) => {
                          setInquiryForm({ ...inquiryForm, message: e.target.value });
                          if (formErrors.message) {
                            setFormErrors((prev) => ({ ...prev, message: undefined }));
                          }
                        }}
                        placeholder="Ví dụ: Gói tốt nghiệp có makeup còn lịch ngày 24/10 lúc 09:00 không?"
                        aria-required="true"
                        aria-invalid={Boolean(formErrors.message)}
                        aria-describedby={formErrors.message ? 'inquiry-message-error' : undefined}
                      />
                      {formErrors.message && (
                        <p id="inquiry-message-error" className="field-error" role="alert">
                          {formErrors.message}
                        </p>
                      )}
                    </div>

                    {/* 5. Notes */}
                    <div className="form-group">
                      <label htmlFor="inquiry-notes" className="form-label">
                        Yêu cầu / Ghi chú bổ sung (tùy chọn)
                      </label>
                      <textarea
                        id="inquiry-notes"
                        rows="2"
                        className="form-input"
                        value={inquiryForm.notes}
                        onChange={(e) =>
                          setInquiryForm({ ...inquiryForm, notes: e.target.value })
                        }
                        placeholder="Ví dụ: Cần hỗ trợ thuê 1 bộ áo cử nhân và hoa tươi..."
                      />
                    </div>

                    <div className="form-actions">
                      <button type="submit" className="pink-cta" disabled={submittingInquiry}>
                        {submittingInquiry ? 'Đang gửi yêu cầu...' : 'Gửi yêu cầu đặt lịch'}
                      </button>
                    </div>
                  </form>
                </>
              )}
            </section>
          ) : loadingActive && !activeConv ? (
            <LoadingState label="Đang nạp chi tiết cuộc trò chuyện..." />
          ) : activeError && !activeConv ? (
            <ErrorState
              title="Không thể tải nội dung hội thoại"
              message={activeError}
              onRetry={handleRetryActive}
            />
          ) : !activeConv ? (
            <EmptyState
              title="Chưa chọn hội thoại"
              description="Vui lòng chọn một cuộc trò chuyện từ danh sách hoặc gửi yêu cầu đặt lịch mới."
            />
          ) : (
            /* Active Conversation View */
            <section className="chat-window inpage-chat" aria-labelledby="active-chat-heading">
              <header className="chat-header">
                <div className="chat-icon" aria-hidden="true">
                  DUK
                </div>
                <div className="chat-heading">
                  <h2 id="active-chat-heading">Cuộc trò chuyện · {activeConv.id}</h2>
                  <p>
                    {activeConv.customerName} · Cập nhật: {formatTime(activeConv.lastMessageAt)}
                  </p>
                </div>
                <span className="chat-state">{activeConv.status}</span>
              </header>

              {/* Inquiry Request Details Banner (if conversation has request) */}
              {activeConv.request && (
                <div className="chat-request-banner" aria-label="Thông tin yêu cầu đặt lịch ban đầu">
                  <h3 className="request-banner-title">Yêu cầu chụp đã gửi</h3>
                  <div className="request-banner-grid">
                    <div>
                      <span>Gói chụp:</span>{' '}
                      <strong>
                        {packageNamesById.get(activeConv.request.packageId) ||
                          (catalog
                            ? 'Gói không còn trong danh mục hiện tại'
                            : catalogError
                            ? 'Chưa tải được tên gói'
                            : 'Đang tải tên gói')}
                      </strong>
                    </div>
                    <div>
                      <span>Ngày giờ:</span>{' '}
                      <strong>
                        {activeConv.request.preferredDate}{' '}
                        {activeConv.request.preferredTime
                          ? `(${activeConv.request.preferredTime})`
                          : ''}
                      </strong>
                    </div>
                    {activeConv.request.extras && activeConv.request.extras.length > 0 && (
                      <div>
                        <span>Dịch vụ thêm:</span>{' '}
                        <strong>
                          {activeConv.request.extras
                            .map((id) => extraNamesById.get(id))
                            .filter(Boolean)
                            .join(', ') ||
                            (catalog
                              ? 'Không có tên dịch vụ thêm trong danh mục hiện tại'
                              : catalogError
                              ? 'Chưa tải được tên dịch vụ thêm'
                              : 'Đang tải tên dịch vụ thêm')}
                        </strong>
                      </div>
                    )}
                    {activeConv.request.notes && (
                      <div className="request-banner-full">
                        <span>Ghi chú:</span> <em>{activeConv.request.notes}</em>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Message History Stream */}
              <ol className="chat-messages" aria-label="Lịch sử tin nhắn">
                {activeConv.messages && activeConv.messages.length > 0 ? (
                  activeConv.messages.map((m) => {
                    const isCustomer = m.sender === 'customer';
                    return (
                      <li
                        key={m.id}
                        className={`message ${isCustomer ? 'message--guest' : 'message--duk'}`}
                      >
                        <p className="message-person">
                          {m.senderName} · {formatTime(m.timestamp)}
                        </p>
                        <p>{m.text}</p>

                        {/* Proposal display (Read-only for G3; Accept/Decline actions belong to G6 prompt) */}
                        {m.proposal && (
                          <div className="proposal-box" aria-label="Lịch chụp studio đề xuất">
                            <p className="proposal-box-title">
                              <strong>Lịch studio đề xuất:</strong>
                            </p>
                            <div className="proposal-box-details">
                              <p>
                                Ngày: <strong>{m.proposal.date}</strong> · Phòng:{' '}
                                <strong>
                                  {formatRoomName(
                                    m.proposal.room || m.proposal.roomName || m.proposal.roomId
                                  )}
                                </strong>
                              </p>
                              {(m.proposal.makeup || m.proposal.makeupStart) && (
                                <p>
                                  Trang điểm:{' '}
                                  <strong>
                                    {m.proposal.makeup ||
                                      `${m.proposal.makeupStart} – ${m.proposal.makeupEnd}`}
                                  </strong>
                                </p>
                              )}
                              {(m.proposal.shoot || m.proposal.shootStart) && (
                                <p>
                                  Chụp ảnh:{' '}
                                  <strong>
                                    {m.proposal.shoot ||
                                      `${m.proposal.shootStart} – ${m.proposal.shootEnd}`}
                                  </strong>
                                </p>
                              )}
                              <p className="proposal-status-line">
                                Trạng thái đề xuất:{' '}
                                <strong className={`status-${m.proposal.status}`}>
                                  {m.proposal.status === 'agreed'
                                    ? 'Đã đồng ý'
                                    : m.proposal.status === 'declined'
                                    ? 'Đã từ chối'
                                    : 'Đang chờ phản hồi'}
                                </strong>
                              </p>
                            </div>

                            {/* G6 Proposal Actions: only show buttons when proposal is pending */}
                            {m.proposal.status === 'pending' && (
                              <div className="proposal-actions">
                                <button
                                  type="button"
                                  className="btn-proposal-accept"
                                  disabled={submittingProposalDecision}
                                  onClick={() => handleRespondProposal('accept')}
                                >
                                  {submittingProposalDecision ? 'Đang xử lý...' : 'Đồng ý đề xuất'}
                                </button>
                                <button
                                  type="button"
                                  className="btn-proposal-decline"
                                  disabled={submittingProposalDecision}
                                  onClick={() => handleRespondProposal('decline')}
                                >
                                  {submittingProposalDecision ? 'Đang xử lý...' : 'Từ chối đề xuất'}
                                </button>
                              </div>
                            )}

                            {/* Inline error if proposal response fails */}
                            {m.proposal.status === 'pending' && proposalActionError && (
                              <div className="proposal-error-banner" role="alert">
                                {proposalActionError}
                              </div>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })
                ) : (
                  <li className="empty-subtext">Hội thoại chưa có tin nhắn nào.</li>
                )}
              </ol>

              {/* Send New Message Form */}
              <form className="chat-form" onSubmit={handleSendMessage} noValidate>
                <label htmlFor="chat-message-input">Tin nhắn gửi studio</label>
                <div className="chat-controls">
                  <textarea
                    id="chat-message-input"
                    rows="2"
                    placeholder="Nhắn tin cho DUKStudio..."
                    value={newMsgText}
                    onChange={(e) => {
                      setNewMsgText(e.target.value);
                      if (msgError) setMsgError('');
                    }}
                    disabled={sendingMsg}
                    aria-describedby={msgError ? 'chat-message-error' : undefined}
                    aria-invalid={Boolean(msgError)}
                  />
                  <button
                    type="submit"
                    className="blue-cta"
                    disabled={sendingMsg || !newMsgText.trim()}
                  >
                    {sendingMsg ? 'Đang gửi...' : 'Gửi'}
                  </button>
                </div>
                {msgError && (
                  <p id="chat-message-error" className="field-error" role="alert">
                    {msgError}
                  </p>
                )}
              </form>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
