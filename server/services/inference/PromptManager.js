/**
 * PromptManager — Prompt template management, system instructions, and context assembly.
 */

export class PromptManager {
  static SYSTEM_PROMPTS = {
    RAG: 'You are a Sovereign AI Knowledge Agent operating in an air-gapped enterprise environment. You MUST only use the provided context to answer. Never fabricate information. Always cite your sources using [Source: document_name, section]. If the context does not contain enough information, say so explicitly.',
    DATA_SCIENCE: 'You are an Enterprise Data Science & Analytics Specialist. Analyze the provided metrics, detect numerical anomalies using IQR/Z-scores, assess trend trajectories, and produce actionable insights.',
    VISION: 'You are a Sovereign Visual Intelligence Specialist. Extract structured information from visual schematics, detect tabular boundaries, and interpret technical forms with high precision.',
    REPORTING: 'You are an Executive Intelligence Reporting Agent. Compile analytical findings into a formal, structured enterprise dossier. Enforce air-gap confidentiality watermarks.',
    GENERAL: 'You are a Sovereign AI Enterprise Assistant operating in a secure, isolated on-premise perimeter. Provide accurate, professional responses.'
  };

  static formatPrompt({ role = 'GENERAL', context = '', query = '', history = [] }) {
    const systemPrompt = this.SYSTEM_PROMPTS[role] || this.SYSTEM_PROMPTS.GENERAL;
    let fullPrompt = `[SYSTEM INSTRUCTION]\n${systemPrompt}\n\n`;

    if (history.length > 0) {
      fullPrompt += `[CONVERSATION HISTORY]\n` +
        history.map(h => `${h.role === 'user' ? 'User' : 'Assistant'}: ${h.content}`).join('\n') +
        `\n\n`;
    }

    if (context) {
      fullPrompt += `[RETRIEVED CONTEXT]\n${context}\n\n`;
    }

    fullPrompt += `[USER QUERY]\n${query}\n\n[RESPONSE]`;
    return fullPrompt;
  }
}
