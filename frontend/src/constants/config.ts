export const ENV = {
  // Use NEXT_PUBLIC_BACKEND_URL for server/proxy routes, fallback to production URL
  // Vercel Preview deployments must have NEXT_PUBLIC_BACKEND_URL set in environment
  BACKEND_URL: process.env.NEXT_PUBLIC_BACKEND_URL || 'https://ai-study-planner-hp0e.onrender.com',
};
