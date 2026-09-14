import { ExecutionEngine } from './ExecutionEngine.js';
import { WorkflowStore } from './WorkflowStore.js';

const sameMinute = (left, right) => left && right
  && left.getFullYear() === right.getFullYear()
  && left.getMonth() === right.getMonth()
  && left.getDate() === right.getDate()
  && left.getHours() === right.getHours()
  && left.getMinutes() === right.getMinutes();

const cronPartMatches = (part, value, min, max) => {
  if (part === '*') return true;
  if (part.startsWith('*/')) {
    const step = Number(part.slice(2));
    return Number.isInteger(step) && step > 0 && (value - min) % step === 0;
  }
  return part.split(',').some((item) => Number(item) === value) || (Number(part) >= min && Number(part) <= max && Number(part) === value);
};

const cronMatchesNow = (expression, date) => {
  const parts = String(expression || '').trim().split(/\s+/);
  if (parts.length !== 5) return false;
  return cronPartMatches(parts[0], date.getMinutes(), 0, 59)
    && cronPartMatches(parts[1], date.getHours(), 0, 23)
    && cronPartMatches(parts[2], date.getDate(), 1, 31)
    && cronPartMatches(parts[3], date.getMonth() + 1, 1, 12)
    && cronPartMatches(parts[4], date.getDay(), 0, 6);
};

const scheduleNode = (workflow) => workflow.nodes.find((node) => node.type === 'trigger.schedule');

const isDue = (workflow, node, now) => {
  const lastRun = workflow.lastRunAt ? new Date(workflow.lastRunAt) : null;
  if (lastRun && sameMinute(lastRun, now)) return false;
  const config = node.data?.config || {};
  if (config.scheduleType === 'cron') return cronMatchesNow(config.cronExpression, now);
  const interval = Math.max(1, Number(config.intervalMinutes) || 15);
  return !lastRun || now.getTime() - lastRun.getTime() >= interval * 60 * 1000;
};

export class TriggerManager {
  static timer = null;

  static start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick().catch((error) => console.error(`[Playground scheduler] ${error.message}`)), 60 * 1000);
    this.timer.unref?.();
    this.tick().catch((error) => console.error(`[Playground scheduler] ${error.message}`));
  }

  static async tick() {
    const active = await WorkflowStore.listActive();
    const now = new Date();
    for (const workflow of active) {
      const node = scheduleNode(workflow);
      if (!node || !isDue(workflow, node, now)) continue;
      const user = await WorkflowStore.getOwner(workflow);
      if (!user) continue;
      const input = { scheduledAt: now.toISOString(), value: node.data?.config?.input || '' };
      ExecutionEngine.run({ workflow, user, input, trigger: 'schedule' })
        .catch((error) => console.error(`[Playground scheduler] ${workflow._id}: ${error.message}`));
    }
  }
}
