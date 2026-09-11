/**
 * Small in-process event bus for live workflow updates.
 * MongoDB remains the source of truth; this bus only wakes connected clients.
 */

const subscribers = new Map();

export class WorkflowEventBus {
  static publish(workflowId, event) {
    const listeners = subscribers.get(String(workflowId));
    if (!listeners) return;
    const payload = `event: workflow-update\ndata: ${JSON.stringify(event)}\n\n`;
    for (const response of listeners) {
      try {
        response.write(payload);
      } catch {
        listeners.delete(response);
      }
    }
  }

  static subscribe(workflowId, response) {
    const key = String(workflowId);
    if (!subscribers.has(key)) subscribers.set(key, new Set());
    subscribers.get(key).add(response);
    return () => {
      const listeners = subscribers.get(key);
      if (!listeners) return;
      listeners.delete(response);
      if (listeners.size === 0) subscribers.delete(key);
    };
  }
}

