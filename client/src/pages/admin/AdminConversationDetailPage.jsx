import { useCallback, useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { apiFetch } from '../../api/client.js';
import { ErrorState, LoadingState } from '../../components/DataStates.jsx';
import ChatMessageList from '../../components/chat/ChatMessageList.jsx';
import BookingRequestCard from '../../components/chat/BookingRequestCard.jsx';
import ClashCheckPanel from '../../components/admin/ClashCheckPanel.jsx';
import { formatDateTime } from '../../utils/format.js';
import { getOnce } from '../../utils/requests.js';
import { conversationBadgeClass, conversationListHref } from '../../utils/conversationStatus.js';

/**
 * G4 + G5: one conversation for the admin (03-chat.md), with the clash check under the chat.
 * - GET /api/conversations/:id once; GET /api/catalog (public, 02-catalog.md) once, for the
 *   package and extra names of the request and the package list of the clash check.
 * - Reply: POST /api/conversations/:id/messages. The new message comes from the 201 answer;
 *   the conversation is not loaded again.
 */
export default function AdminConversationDetailPage() {
  const { id } = useParams();
  const [state, setState] = useState({ phase: 'loading', conversation: null, error: null });
  const [catalog, setCatalog] = useState({ phase: 'idle', data: null, message: '' });
  const [replyText, setReplyText] = useState('');
  const [replyError, setReplyError] = useState('');
  const [formError, setFormError] = useState('');
  const [sending, setSending] = useState(false);
  const [sentNotice, setSentNotice] = useState('');
  const requestId = useRef(0);
  const mounted = useRef(true);
  const replyInput = useRef(null);

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  useEffect(() => {
    document.title = `DUKStudio — Hội thoại ${id}`;
  }, [id]);

  const load = useCallback(async () => {
    const current = ++requestId.current;
    setState({ phase: 'loading', conversation: null, error: null });
    try {
      const data = await getOnce(`/api/conversations/${encodeURIComponent(id)}`);
      if (current !== requestId.current) return;
      if (!data?.conversation) throw new Error('Máy chủ không trả về hội thoại.');
      setState({ phase: 'ready', conversation: data.conversation, error: null });
    } catch (err) {
      if (current !== requestId.current) return;
      setState({
        phase: 'error',
        conversation: null,
        error: { status: err?.status, message: err?.message || 'Không thể tải hội thoại.' }
      });
    }
  }, [id]);

  useEffect(() => {
    // A new :id starts with an empty reply form
    setReplyText('');
    setReplyError('');
    setFormError('');
    setSentNotice('');
    load();
    return () => {
      requestId.current += 1;
    };
  }, [load]);

  const loadCatalog = useCallback(async () => {
    setCatalog({ phase: 'loading', data: null, message: '' });
    try {
      const data = await getOnce('/api/catalog', { skipAuth: true });
      if (mounted.current) setCatalog({ phase: 'ready', data, message: '' });
    } catch (err) {
      if (mounted.current) setCatalog({ phase: 'error', data: null, message: err?.message || '' });
    }
  }, []);

  // The catalog gives the package names of the request and the package list of the clash check
  const conversationReady = state.phase === 'ready';
  useEffect(() => {
    if (conversationReady && catalog.phase === 'idle') loadCatalog();
  }, [conversationReady, catalog.phase, loadCatalog]);

  // POST …/propose-time answered {proposal, message}: add the message to the chat (03-chat.md:
  // the conversation is now "Đang tư vấn", waiting for the customer's answer)
  const handleProposed = useCallback((data) => {
    const message = data?.message;
    if (!message) return;
    setState((prev) => {
      if (!prev.conversation) return prev;
      const conv = prev.conversation;
      return {
        ...prev,
        conversation: {
          ...conv,
          messages: [...(Array.isArray(conv.messages) ? conv.messages : []), message],
          lastMessageAt: message.timestamp || conv.lastMessageAt,
          status: 'Đang tư vấn'
        }
      };
    });
  }, []);

  async function handleReply(event) {
    event.preventDefault();
    if (sending) return;
    setSentNotice('');
    setFormError('');

    const text = replyText.trim();
    if (!text) {
      setReplyError('Vui lòng nhập nội dung tin nhắn.');
      replyInput.current?.focus();
      return;
    }
    setReplyError('');
    setSending(true);
    try {
      const data = await apiFetch(`/api/conversations/${encodeURIComponent(id)}/messages`, {
        method: 'POST',
        body: { text }
      });
      if (!mounted.current) return;
      const message = data?.message;
      if (message) {
        setState((prev) => {
          if (!prev.conversation) return prev;
          const conv = prev.conversation;
          return {
            ...prev,
            conversation: {
              ...conv,
              messages: [...(Array.isArray(conv.messages) ? conv.messages : []), message],
              lastMessageAt: message.timestamp || conv.lastMessageAt,
              // 03-chat.md: an admin reply moves a conversation from Chưa trả lời to Đang tư vấn
              status: conv.status === 'Chưa trả lời' ? 'Đang tư vấn' : conv.status
            }
          };
        });
      }
      setReplyText('');
      setSentNotice('Đã gửi tin nhắn cho khách.');
    } catch (err) {
      if (!mounted.current) return;
      if (err?.status === 400 && err.fields?.text) {
        setReplyError(err.fields.text);
        replyInput.current?.focus();
      } else {
        setFormError(err?.message || 'Không gửi được tin nhắn. Vui lòng thử lại.');
      }
    } finally {
      if (mounted.current) setSending(false);
    }
  }

  const { phase, conversation, error } = state;

  return (
    <div className="page-main admin-chat-page">
      <p className="admin-back">
        <Link className="admin-back-link" to={conversationListHref(conversation?.status)}>
          ← Danh sách hội thoại
        </Link>
      </p>

      <div className="page-heading">
        <p className="eyebrow">&lt; G4 &gt;</p>
        <h1>Hội thoại {id}</h1>
        <p className="page-subtitle">Đọc tin nhắn, xem yêu cầu đặt lịch và trả lời khách.</p>
      </div>

      {phase === 'loading' && <LoadingState label="Đang tải hội thoại..." />}

      {phase === 'error' && error?.status === 404 && (
        <ErrorState title="Không tìm thấy hội thoại" message={error.message} />
      )}

      {phase === 'error' && error?.status !== 404 && (
        <ErrorState title="Không thể tải hội thoại" message={error?.message} onRetry={load} />
      )}

      {phase === 'ready' && conversation && (
        <div className="admin-detail-layout">
          <section className="chat-window inpage-chat admin-chat" aria-labelledby="admin-chat-heading">
            <div className="chat-header">
              <div className="chat-icon" aria-hidden="true">
                {String(conversation.customerName || '?').slice(0, 1).toUpperCase()}
              </div>
              <div className="chat-heading">
                <h2 id="admin-chat-heading">{conversation.customerName || conversation.customerId}</h2>
                <p>
                  {conversation.id}
                  {conversation.lastMessageAt && (
                    <>
                      {' · '}cập nhật{' '}
                      <time dateTime={conversation.lastMessageAt}>{formatDateTime(conversation.lastMessageAt)}</time>
                    </>
                  )}
                </p>
              </div>
              <span className={`status-badge ${conversationBadgeClass(conversation.status)}`}>
                {conversation.status}
              </span>
            </div>

            {conversation.bookingId && (
              <p className="admin-chat-booking">
                Booking của hội thoại:{' '}
                <Link to={`/admin/bookings/${encodeURIComponent(conversation.bookingId)}`}>
                  {conversation.bookingId}
                </Link>
              </p>
            )}

            <BookingRequestCard
              request={conversation.request}
              catalog={{ ...catalog, onRetry: loadCatalog }}
            />

            <ChatMessageList messages={conversation.messages} />

            <form className="admin-reply-form" onSubmit={handleReply} noValidate>
              <div className="form-group">
                <label className="form-label" htmlFor="admin-reply-text">
                  Trả lời khách
                </label>
                <textarea
                  id="admin-reply-text"
                  ref={replyInput}
                  className="form-input admin-reply-input"
                  rows={3}
                  value={replyText}
                  onChange={(e) => {
                    setReplyText(e.target.value);
                    if (replyError && e.target.value.trim()) setReplyError('');
                  }}
                  aria-invalid={replyError ? 'true' : undefined}
                  aria-describedby={replyError ? 'admin-reply-error' : undefined}
                />
                {replyError && (
                  <p id="admin-reply-error" className="field-error" role="alert">
                    {replyError}
                  </p>
                )}
              </div>

              {formError && (
                <div className="form-banner-error admin-reply-banner" role="alert">
                  {formError}
                </div>
              )}

              <div className="admin-reply-actions">
                <button type="submit" className="blue-cta" disabled={sending}>
                  {sending ? 'Đang gửi...' : 'Gửi trả lời'}
                </button>
                <p className="admin-reply-status" role="status">
                  {sentNotice}
                </p>
              </div>
            </form>
          </section>

          <ClashCheckPanel
            key={conversation.id}
            conversationId={conversation.id}
            request={conversation.request}
            catalog={{ ...catalog, onRetry: loadCatalog }}
            onProposed={handleProposed}
          />
        </div>
      )}
    </div>
  );
}
