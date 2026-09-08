import { RBACEngine } from './RBACEngine.js';
import { ABACEngine } from './ABACEngine.js';

export class PolicyEngine {
  static evaluate({ user, resource, action, context = {} }) {
    if (!RBACEngine.can(user, resource?.type, action)) {
      return { allowed: false, reasons: [`Role ${user?.role || 'Unknown'} cannot ${action} ${resource?.type || 'resource'}.`] };
    }

    const attributeDecision = ABACEngine.evaluate(user, resource, context);
    return {
      allowed: attributeDecision.allowed,
      reasons: attributeDecision.reasons
    };
  }
}