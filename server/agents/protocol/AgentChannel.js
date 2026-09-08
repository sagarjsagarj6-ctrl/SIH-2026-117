/**
 * AgentChannel — In-Memory Pub/Sub Event Bus for Agent-to-Agent Communication.
 */

import EventEmitter from 'events';

class AgentChannelEmitter extends EventEmitter {
  constructor() {
    super();
    this.messageLog = [];
    this.setMaxListeners(50);
  }

  publish(channelName, agentMessage) {
    this.messageLog.push(agentMessage);
    if (this.messageLog.length > 500) this.messageLog.shift();
    this.emit(channelName, agentMessage);
    this.emit('ALL_MESSAGES', agentMessage);
  }

  subscribe(channelName, listener) {
    this.on(channelName, listener);
    return () => this.off(channelName, listener);
  }

  getRecentMessages(limit = 20) {
    return this.messageLog.slice(-limit).reverse();
  }

  clear() {
    this.messageLog = [];
  }
}

export const AgentChannel = new AgentChannelEmitter();
