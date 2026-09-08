/**
 * AgentMemory — Short-term (conversation) and Long-term (session context) Memory Management.
 */

export class AgentMemory {
  constructor(sessionId = 'default_session') {
    this.sessionId = sessionId;
    this.shortTermHistory = []; // { role: 'user' | 'agent' | 'system', content: string, agentName: string, timestamp: string }
    this.longTermContext = new Map(); // key-value stored facts / intermediate artifacts
  }

  addMessage({ role, content, agentName = 'System', metadata = {} }) {
    this.shortTermHistory.push({
      role,
      content,
      agentName,
      metadata,
      timestamp: new Date().toISOString()
    });

    // Retain last 30 interactions for context window bounds
    if (this.shortTermHistory.length > 30) {
      this.shortTermHistory.shift();
    }
  }

  getRecentHistory(limit = 6) {
    return this.shortTermHistory.slice(-limit);
  }

  setArtifact(key, value) {
    this.longTermContext.set(key, value);
  }

  getArtifact(key) {
    return this.longTermContext.get(key);
  }

  getAllArtifacts() {
    return Object.fromEntries(this.longTermContext.entries());
  }

  clear() {
    this.shortTermHistory = [];
    this.longTermContext.clear();
  }
}

// Global session memory cache
export const GlobalSessionMemories = new Map();

export const getSessionMemory = (sessionId) => {
  if (!GlobalSessionMemories.has(sessionId)) {
    GlobalSessionMemories.set(sessionId, new AgentMemory(sessionId));
  }
  return GlobalSessionMemories.get(sessionId);
};
