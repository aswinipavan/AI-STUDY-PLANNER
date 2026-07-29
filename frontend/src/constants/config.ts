export const ENV = {
  // Use NEXT_PUBLIC_API_BASE_URL for client, NEXT_PUBLIC_BACKEND_URL for server/proxy
  // Fallback to production URL if not set
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || process.env.NEXT_PUBLIC_API_BASE_URL || 'https://ai-study-planner-hp0e.onrender.com',
};
