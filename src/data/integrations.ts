/** Public integration addresses only; model credentials belong to the AI server. */
export const integrations = {
  aiEndpoint: import.meta.env.VITE_AI_ENDPOINT || '/api/ai/chat',
};
