import { state } from '../config/db.js';

const asString = (value) => String(value || '');

const isConnectedToActiveLan = (userId) => {
  const normalizedUserId = asString(userId);
  return (state.memoryDb.networks || []).some(network => (
    network.status === 'Active'
    && (network.members || []).some(member => asString(member.userId || member.id) === normalizedUserId)
  ));
};

export const pushNotifications = ({
  recipientUserIds = [],
  type,
  title,
  message,
  summary,
  copyMessage = '',
  workflowId = '',
  networkId = '',
  networkName = '',
  networkKey = '',
  metadata = {}
}) => {
  const uniqueRecipients = [...new Set(recipientUserIds.map(asString).filter(Boolean))];
  const createdAt = new Date().toISOString();
  const notifications = uniqueRecipients.map((userId, index) => ({
    _id: `notification_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    userId,
    type,
    title,
    message,
    summary: summary || message,
    copyMessage,
    workflowId,
    networkId,
    networkName,
    networkKey,
    metadata,
    createdAt,
    read: false
  }));

  state.memoryDb.notifications.unshift(...notifications);
  return notifications;
};

export const createAIHandoff = ({
  workflowId,
  sourceUserId,
  targetUserId,
  targetAgent,
  eventType,
  summary,
  modelName = ''
}) => {
  if (!targetUserId) return { status: 'not_assigned', targetAgent, workflowId };

  const existing = (state.memoryDb.aiHandoffEvents || []).find(event => (
    event.workflowId === workflowId
    && event.targetUserId === asString(targetUserId)
    && event.eventType === eventType
  ));
  if (existing) return existing;

  const connected = isConnectedToActiveLan(targetUserId);
  const event = {
    _id: `handoff_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    workflowId,
    sourceUserId: asString(sourceUserId),
    targetUserId: asString(targetUserId),
    targetAgent,
    eventType,
    modelName,
    summary,
    status: connected ? 'delivered' : 'queued_until_lan',
    createdAt: new Date().toISOString(),
    deliveredAt: connected ? new Date().toISOString() : null
  };

  state.memoryDb.aiHandoffEvents.unshift(event);
  if (connected) {
    pushNotifications({
      recipientUserIds: [targetUserId],
      type: 'WORKFLOW_AI_HANDOFF',
      title: `${targetAgent} received a synchronized workflow update`,
      message: summary,
      summary,
      workflowId,
      metadata: { targetAgent, eventType, modelName, handoffStatus: 'delivered' }
    });
  }

  return event;
};

export const deliverQueuedAIHandoffs = (userId) => {
  const normalizedUserId = asString(userId);
  const queued = (state.memoryDb.aiHandoffEvents || []).filter(event => (
    event.targetUserId === normalizedUserId && event.status === 'queued_until_lan'
  ));

  queued.forEach(event => {
    event.status = 'delivered';
    event.deliveredAt = new Date().toISOString();
    pushNotifications({
      recipientUserIds: [normalizedUserId],
      type: 'WORKFLOW_AI_HANDOFF',
      title: `${event.targetAgent} received a queued LAN workflow update`,
      message: event.summary,
      summary: event.summary,
      workflowId: event.workflowId,
      metadata: { targetAgent: event.targetAgent, eventType: event.eventType, modelName: event.modelName, handoffStatus: 'delivered_after_lan_join' }
    });
  });

  return queued.length;
};

export const userIsConnectedToLan = isConnectedToActiveLan;
