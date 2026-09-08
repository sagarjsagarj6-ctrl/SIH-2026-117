const LAN_RANGES = [/^10\./, /^192\.168\./, /^172\.(1[6-9]|2\d|3[0-1])\./, /^127\.0\.0\.1/];

export class ABACEngine {
  static evaluate(user, resource = {}, context = {}) {
    const reasons = [];
    const ipAddress = context.ipAddress || '';
    const hour = context.hour ?? new Date().getHours();

    if (resource.department && user?.role !== 'Admin' && resource.department !== user?.department) {
      return { allowed: false, reasons: ['Department isolation policy denied the request.'] };
    }
    if (resource.sensitivity === 'Top-Secret' && user?.role !== 'Admin' && !resource.whitelistedUsers?.includes(String(user?._id || user?.id))) {
      return { allowed: false, reasons: ['Top-Secret resources require explicit user allow-list membership.'] };
    }
    if (user?.role === 'Employee' && (hour < 6 || hour > 22)) {
      return { allowed: false, reasons: ['Employee access is blocked outside approved hours.'] };
    }
    if (context.requireLan && !LAN_RANGES.some(pattern => pattern.test(ipAddress))) {
      return { allowed: false, reasons: ['The request originated outside the private LAN.'] };
    }

    reasons.push('ABAC conditions satisfied.');
    return { allowed: true, reasons };
  }
}