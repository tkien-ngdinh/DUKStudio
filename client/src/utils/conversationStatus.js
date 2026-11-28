/**
 * The four conversation statuses of G4, named exactly as in the brief and as the API sends
 * `status` (03-chat.md). The badge colour only supports the status text; it never carries
 * the meaning alone.
 */
export const CONVERSATION_STATUSES = [
  { status: 'Chưa trả lời', badge: 'status-badge--new' },
  { status: 'Đang tư vấn', badge: 'status-badge--advising' },
  { status: 'Đã chốt lịch', badge: 'status-badge--agreed' },
  { status: 'Hoàn thành', badge: 'status-badge--done' }
];

export function conversationBadgeClass(status) {
  return CONVERSATION_STATUSES.find((item) => item.status === status)?.badge || '';
}

/** Link to the list tab of a status, e.g. /admin/conversations?status=%C4%90ang+t%C6%B0+v%E1%BA%A5n */
export function conversationListHref(status) {
  const known = CONVERSATION_STATUSES.some((item) => item.status === status);
  return known
    ? `/admin/conversations?${new URLSearchParams({ status }).toString()}`
    : '/admin/conversations';
}
