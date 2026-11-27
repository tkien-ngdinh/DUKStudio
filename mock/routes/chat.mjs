import { getStore, findUserByToken } from '../data/store.mjs';

function getNextTimestamp(messages) {
  if (!messages || messages.length === 0) return '2026-10-20T17:20:00Z';
  const lastTs = messages[messages.length - 1].timestamp;
  const d = new Date(lastTs);
  d.setMinutes(d.getMinutes() + 1);
  return d.toISOString().replace('.000Z', 'Z');
}

function getNextMessageId(messages) {
  const count = (messages || []).length + 1;
  return `m-${String(count).padStart(2, '0')}`;
}

/**
 * Register chat and conversation routes (serving Steps G3, G4, G5, G6)
 * @param {import('../server.mjs').Router} router
 */
export function register(router) {
  // 1. GET /api/conversations
  router.get('/api/conversations', async (req, res) => {
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

    if (user.role !== 'admin' && user.role !== 'customer') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Customer or Admin role required'
        }
      });
    }

    const store = getStore();
    let conversations = store.conversations || [];
    if (user.role === 'customer') {
      conversations = conversations.filter((conversation) => conversation.customerId === user.id);
    }

    const statusFilter = req.query.status;
    if (statusFilter) {
      const statusMap = {
        'waiting_for_studio': 'Chưa trả lời',
        'waiting': 'Chưa trả lời',
        'studio_answered': 'Đang tư vấn',
        'advising': 'Đang tư vấn',
        'deposit_pending': 'Đã chốt lịch',
        'done': 'Hoàn thành'
      };
      const normalized = statusMap[statusFilter.toLowerCase()] || statusFilter;
      conversations = conversations.filter(
        (c) => c.status === normalized || c.status === statusFilter
      );
    }

    return res.status(200).json({
      conversations
    });
  });

  // 2. GET /api/conversations/:id
  router.get('/api/conversations/:id', async (req, res) => {
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

    const store = getStore();
    const convId = req.params.id;
    const conversation = (store.conversations || []).find((c) => c.id === convId);

    if (!conversation) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Conversation ${convId} not found`
        }
      });
    }

    if (user.role !== 'admin' && user.id !== conversation.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You are not authorized to view this conversation'
        }
      });
    }

    return res.status(200).json({
      conversation
    });
  });

  // 3. POST /api/conversations
  router.post('/api/conversations', async (req, res) => {
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

    if (user.role !== 'customer') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Customer role required to initiate inquiry'
        }
      });
    }

    const body = req.body || {};
    const fields = {};
    if (!body.packageId || !String(body.packageId).trim()) {
      fields.packageId = 'Package ID is required';
    }
    if (!body.preferredDate || !String(body.preferredDate).trim()) {
      fields.preferredDate = 'Preferred shoot date is required';
    }
    if (!body.message || !String(body.message).trim()) {
      fields.message = 'Inquiry message is required';
    }

    const requestedPackage = (getStore().packages || []).find((p) => p.id === body.packageId);
    if (requestedPackage?.priceUnit === 'người' && (!Number.isInteger(body.participantCount) || body.participantCount < 1)) {
      fields.participantCount = 'Participant count must be a positive integer for a per-person package';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid conversation payload',
          fields
        }
      });
    }

    const store = getStore();
    store.conversations = store.conversations || [];
    const latest = store.conversations.filter((c) => c.customerId === user.id)
      .sort((a, b) => String(b.lastMessageAt || '').localeCompare(String(a.lastMessageAt || '')))[0];
    if (latest && latest.status !== 'Hoàn thành' && !latest.bookingId) {
      const timestamp = getNextTimestamp(latest.messages);
      const message = { id: getNextMessageId(latest.messages), sender: 'customer', senderName: user.name || 'Linh', text: body.message, timestamp };
      latest.messages.push(message);
      latest.lastMessageAt = timestamp;
      latest.request = { packageId: body.packageId, preferredDate: body.preferredDate, preferredTime: body.preferredTime || null, participantCount: body.participantCount || null, extras: body.extras || [], notes: body.notes || '' };
      return res.status(200).json({ conversation: latest, reused: true });
    }
    const existingIds = new Set(store.conversations.map((c) => c.id));
    let sequence = store.conversations.length + 1;
    let newId = `c-${user.id.replace('u-', '')}-${String(sequence).padStart(2, '0')}`;
    while (existingIds.has(newId)) {
      sequence += 1;
      newId = `c-${user.id.replace('u-', '')}-${String(sequence).padStart(2, '0')}`;
    }
    const timestamp = '2026-10-21T09:00:00Z';

    const newConversation = {
      id: newId,
      customerId: user.id,
      customerName: user.name || 'Nguyễn Thị Thúy Linh',
      status: 'Chưa trả lời',
      lastMessageAt: timestamp,
      bookingId: null,
      request: { packageId: body.packageId, preferredDate: body.preferredDate, preferredTime: body.preferredTime || null, participantCount: body.participantCount || null, extras: body.extras || [], notes: body.notes || '' },
      messages: [
        {
          id: 'm-inquiry-01',
          sender: 'customer',
          senderName: 'Linh',
          text: body.message,
          timestamp
        }
      ]
    };

    store.conversations.push(newConversation);

    return res.status(201).json({
      conversation: newConversation
    });
  });

  // 4. POST /api/conversations/:id/messages
  router.post('/api/conversations/:id/messages', async (req, res) => {
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

    const store = getStore();
    const convId = req.params.id;
    const conversation = (store.conversations || []).find((c) => c.id === convId);

    if (!conversation) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Conversation ${convId} not found`
        }
      });
    }

    if (user.role !== 'admin' && user.id !== conversation.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. You are not authorized to send messages to this conversation'
        }
      });
    }

    if (user.role === 'customer' && conversation.status === 'Hoàn thành') {
      const body = req.body || {};
      if (!body.text || !String(body.text).trim()) return res.status(400).json({ error: { code: 'BAD_REQUEST', message: 'Invalid message payload', fields: { text: 'Message text is required' } } });
      const existingIds = new Set(store.conversations.map((c) => c.id));
      let sequence = store.conversations.length + 1;
      let id = `c-${user.id.replace('u-', '')}-${String(sequence).padStart(2, '0')}`;
      while (existingIds.has(id)) {
        sequence += 1;
        id = `c-${user.id.replace('u-', '')}-${String(sequence).padStart(2, '0')}`;
      }
      const timestamp = getNextTimestamp([]);
      const next = { id, customerId: user.id, customerName: user.name || conversation.customerName, status: 'Chưa trả lời', lastMessageAt: timestamp, bookingId: null, request: null, messages: [{ id: 'm-01', sender: 'customer', senderName: user.name || 'Linh', text: body.text, timestamp }] };
      store.conversations.push(next);
      return res.status(201).json({ conversation: next });
    }

    const body = req.body || {};
    if (!body.text || !String(body.text).trim()) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid message payload',
          fields: {
            text: 'Message text is required'
          }
        }
      });
    }

    const msgId = getNextMessageId(conversation.messages);
    const timestamp = getNextTimestamp(conversation.messages);
    const sender = user.role === 'admin' ? 'admin' : 'customer';
    const senderName = user.role === 'admin' ? 'DUKStudio' : 'Linh';

    const message = {
      id: msgId,
      sender,
      senderName,
      text: body.text,
      timestamp
    };

    conversation.messages.push(message);
    conversation.lastMessageAt = timestamp;

    // Advance conversation state to 'Đang tư vấn' when admin replies
    if (user.role === 'admin' && !conversation.bookingId && conversation.status === 'Chưa trả lời') {
      conversation.status = 'Đang tư vấn';
    }

    return res.status(201).json({
      message
    });
  });

  // 5. POST /api/conversations/:id/propose-time
  router.post('/api/conversations/:id/propose-time', async (req, res) => {
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

    if (user.role !== 'admin') {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Admin role required'
        }
      });
    }

    const store = getStore();
    const convId = req.params.id;
    const conversation = (store.conversations || []).find((c) => c.id === convId);

    if (!conversation) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Conversation ${convId} not found`
        }
      });
    }

    if (conversation.bookingId) {
      return res.status(409).json({ error: { code: 'CONFLICT', message: 'A conversation with a booking cannot receive another time proposal' } });
    }

    const body = req.body || {};
    const fields = {};
    if (!body.date || !String(body.date).trim()) {
      fields.date = 'Shoot date is required';
    }
    if (!body.makeup || !String(body.makeup).trim()) {
      fields.makeup = 'Makeup timeslot is required';
    }
    if (!body.shoot || !String(body.shoot).trim()) {
      fields.shoot = 'Shoot timeslot is required';
    }
    if (!body.room || !String(body.room).trim()) {
      fields.room = 'Studio room is required';
    }

    if (Object.keys(fields).length > 0) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid proposal payload',
          fields
        }
      });
    }

    const proposal = {
      date: body.date,
      makeup: body.makeup,
      shoot: body.shoot,
      room: body.room,
      status: 'pending'
    };

    const msgId = getNextMessageId(conversation.messages);
    const timestamp = getNextTimestamp(conversation.messages);
    const text =
      body.text ||
      `Studio đề xuất điều chỉnh lịch chụp: makeup ${body.makeup} và chụp ${body.shoot} (${body.room}) ngày ${body.date} nhé!`;

    const message = {
      id: msgId,
      sender: 'admin',
      senderName: 'DUKStudio',
      text,
      timestamp,
      proposal
    };

    conversation.activeProposal = proposal;
    conversation.messages.push(message);
    conversation.lastMessageAt = timestamp;

    // Advance conversation state to 'Đang tư vấn' when admin proposes a time
    conversation.status = 'Đang tư vấn';

    return res.status(200).json({
      proposal,
      message
    });
  });

  // 6. POST /api/conversations/:id/respond-proposal
  router.post('/api/conversations/:id/respond-proposal', async (req, res) => {
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

    const store = getStore();
    const convId = req.params.id;
    const conversation = (store.conversations || []).find((c) => c.id === convId);

    if (!conversation) {
      return res.status(404).json({
        error: {
          code: 'NOT_FOUND',
          message: `Conversation ${convId} not found`
        }
      });
    }

    if (user.role !== 'customer' || user.id !== conversation.customerId) {
      return res.status(403).json({
        error: {
          code: 'FORBIDDEN',
          message: 'Access denied. Only the customer who owns this conversation can respond to the proposal'
        }
      });
    }

    const body = req.body || {};
    if (!body.decision || (body.decision !== 'accept' && body.decision !== 'decline')) {
      return res.status(400).json({
        error: {
          code: 'BAD_REQUEST',
          message: 'Invalid proposal response',
          fields: {
            decision: "Decision must be either 'accept' or 'decline'"
          }
        }
      });
    }

    // Find the pending proposal
    const proposal = conversation.activeProposal;
    if (!proposal || proposal.status !== 'pending') {
      return res.status(409).json({
        error: {
          code: 'CONFLICT',
          message: 'No pending time proposal exists to respond to'
        }
      });
    }

    const msgId = getNextMessageId(conversation.messages);
    const timestamp = getNextTimestamp(conversation.messages);

    if (body.decision === 'decline') {
      proposal.status = 'declined';
      conversation.status = 'Đang tư vấn';

      const message = {
        id: msgId,
        sender: 'customer',
        senderName: 'Linh',
        text: 'Dạ khung giờ này em bận mất rồi, studio còn giờ nào khác không ạ?',
        timestamp
      };

      conversation.messages.push(message);
      conversation.lastMessageAt = timestamp;

      return res.status(200).json({
        status: conversation.status,
        proposal,
        message
      });
    } else {
      proposal.status = 'agreed';
      conversation.status = 'Đã chốt lịch';

      const makeupStart = proposal.makeup.split(' - ')[0];
      const shootStart = proposal.shoot.split(' - ')[0];
      const text = `Dạ em đồng ý lịch ${makeupStart} makeup và ${shootStart} chụp ạ!`;

      const message = {
        id: msgId,
        sender: 'customer',
        senderName: 'Linh',
        text,
        timestamp
      };

      conversation.messages.push(message);
      conversation.lastMessageAt = timestamp;

      return res.status(200).json({
        status: conversation.status,
        proposal,
        message
      });
    }
  });
}
