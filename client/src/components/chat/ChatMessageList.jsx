import { formatDate, formatDateTime } from '../../utils/format.js';

/**
 * Message history of one conversation (03-chat.md message objects), read only.
 * Uses the same markup and CSS classes as the customer chat (CustomerChatPage, G3), so a
 * customer and the admin see the same message and proposal objects the same way.
 * Fields used: message {id, sender, senderName, text, timestamp, proposal?};
 * proposal {date, makeup, shoot, room, status}.
 */

const PROPOSAL_STATUS_LABELS = {
  pending: 'Đang chờ phản hồi',
  agreed: 'Đã đồng ý',
  declined: 'Đã từ chối'
};

export function ProposalBox({ proposal }) {
  if (!proposal) return null;
  const statusLabel = PROPOSAL_STATUS_LABELS[proposal.status] || proposal.status || '';
  return (
    <div className="proposal-box">
      <p className="proposal-box-title">
        <strong>Lịch studio đề xuất:</strong>
      </p>
      <div className="proposal-box-details">
        <p>
          Ngày: <strong>{formatDate(proposal.date) || 'chưa có'}</strong>
          {proposal.room && (
            <>
              {' · '}Phòng: <strong>{proposal.room}</strong>
            </>
          )}
        </p>
        {proposal.makeup && (
          <p>
            Trang điểm: <strong>{proposal.makeup}</strong>
          </p>
        )}
        {proposal.shoot && (
          <p>
            Chụp ảnh: <strong>{proposal.shoot}</strong>
          </p>
        )}
        {statusLabel && (
          <p className="proposal-status-line">
            Trạng thái đề xuất: <strong className={`status-${proposal.status}`}>{statusLabel}</strong>
          </p>
        )}
      </div>
    </div>
  );
}

export default function ChatMessageList({ messages, emptyText = 'Hội thoại chưa có tin nhắn nào.' }) {
  const list = Array.isArray(messages) ? messages : [];
  return (
    <ol className="chat-messages" aria-label="Lịch sử tin nhắn">
      {list.length === 0 ? (
        <li className="empty-subtext">{emptyText}</li>
      ) : (
        list.map((m) => (
          <li key={m.id} className={`message ${m.sender === 'customer' ? 'message--guest' : 'message--duk'}`}>
            <p className="message-person">
              {m.senderName}
              {m.timestamp && (
                <>
                  {' · '}
                  <time dateTime={m.timestamp}>{formatDateTime(m.timestamp)}</time>
                </>
              )}
            </p>
            <p>{m.text}</p>
            <ProposalBox proposal={m.proposal} />
          </li>
        ))
      )}
    </ol>
  );
}
