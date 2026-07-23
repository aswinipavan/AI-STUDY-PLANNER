import { LRUCache } from 'lru-cache';

type Options = {
  uniqueTokenPerInterval?: number;
  interval?: number;
};

export default function rateLimit(options?: Options) {
  const tokenCache = new LRUCache({
    max: options?.uniqueTokenPerInterval || 500,
    ttl: options?.interval || 60000,
  });

  return {
    check: (res: { setHeader: (key: string, value: string) => void }, limit: number, token: string) =>
      new Promise<void>((resolve, reject) => {
        const tokenCount = (tokenCache.get(token) as number[]) || [0];
        if (tokenCount[0] === 0) {
          tokenCache.set(token, tokenCount);
        }
        tokenCount[0] += 1;

        const currentUsage = tokenCount[0];
        const isRateLimited = currentUsage > limit;
        
        // Use provided headers interface or skip if not available (App Router Response headers are set later)
        if (res && res.setHeader) {
          res.setHeader('X-RateLimit-Limit', limit.toString());
          res.setHeader('X-RateLimit-Remaining', isRateLimited ? '0' : (limit - currentUsage).toString());
        }

        return isRateLimited ? reject('Rate rate limit exceeded') : resolve();
      }),
  };
}
