import { test, expect } from '@playwright/test';
import { setupAuthenticatedContext } from '../../../playwright/auth-setup';

const MOCK_JWT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMTExMTExMS0xMTExLTExMTEtMTExMS0xMTExMTExMTExMTEiLCJleHAiOjIwODI3MTUyMDB9.mockSignature';

test.describe('AI Tutor Chat Scrolling & Sticky Composer Master Verification', () => {
  const mockStudent = {
    id: '11111111-1111-1111-1111-111111111111',
    firebaseUid: 'test-chat-scroll-uid',
    fullName: 'Chat Test Student',
    name: 'Chat Test Student',
    email: 'chatstudent@example.com',
    collegeName: 'Engineering University',
    semester: 5,
    department: 'Computer Science',
    isPremium: false,
  };

  const longAssistantMessage = `## 1. Comprehensive Overview of Graph Algorithms

Graph algorithms form the backbone of modern computer science network routing.

### Core Theoretical Intuition
When solving shortest path problems on non-negative weighted directed graphs, Dijkstra algorithm greedily expands the frontier using a min-priority queue with O((V + E) log V) time complexity.

| Algorithm | Graph Type | Time Complexity | Space Complexity |
| :--- | :--- | :--- | :--- |
| **Dijkstra** | Non-negative edges | O((V + E) log V) | O(V) |
| **Bellman-Ford** | Negative edge weights | O(V * E) | O(V) |
| **Floyd-Warshall** | All-Pairs Shortest Path | O(V^3) | O(V^2) |
| **A* Search** | Heuristic directed graph | O(E) best case | O(V) |
| **Kruskal (MST)** | Undirected weighted graph | O(E log E) | O(V) |
| **Prim (MST)** | Undirected weighted graph | O(E log V) | O(V) |

> **Key Rule:** If graph has negative edge weight cycles, Dijkstra enters an infinite loop. Always employ Bellman-Ford.

### Step-by-Step Implementation Outline
1. Initialize distance array.
2. Push source to Min-Heap.
3. Extract-Min Loop.
4. Relax Neighbors.
5. Reconstruct Path.

Paragraph 1: Dijkstra algorithm is a fundamental graph search algorithm that solves the single-source shortest path problem for a graph with non-negative edge path costs, producing a shortest-path tree.

Paragraph 2: For a given source node in the graph, the algorithm finds the shortest path between that node and every other. It can also be used for finding the shortest paths from a single node to a single destination node by stopping the algorithm once the shortest path to the destination node has been determined.

Paragraph 3: Dijkstra algorithm uses labels that are positive integers or real numbers, which are totally ordered. We can label all nodes with distances from the starting point.

Paragraph 4: In many practical routing applications such as Open Shortest Path First (OSPF) and Intermediate System to Intermediate System (IS-IS), Dijkstra algorithm runs repeatedly.

Paragraph 5: Dynamic Programming formulations provide optimal substructure guarantees. Bellman equation decomposes problems into sub-problems.

Paragraph 6: A* search algorithm is an extension of Dijkstra algorithm with heuristics, guiding exploration towards destination node more efficiently.`;

  const mockSessions = [
    { id: 'session-1', title: 'Graph Algorithms & Shortest Path', createdAt: '2026-08-28T10:00:00Z' },
    { id: 'session-2', title: 'Calculus Derivatives & Integrals', createdAt: '2026-08-27T10:00:00Z' },
    { id: 'session-3', title: 'Operating Systems Virtual Memory', createdAt: '2026-08-26T10:00:00Z' },
    { id: 'session-4', title: 'Database Normalization & BCNF', createdAt: '2026-08-25T10:00:00Z' },
  ];

  test.beforeEach(async ({ page, context }) => {
    await setupAuthenticatedContext(context, mockStudent);

    await context.addInitScript((student) => {
      localStorage.setItem('ai-study-planner-onboarding-completed', 'true');
      const authState = {
        state: {
          user: student,
          token: 'mock-jwt-token',
          isAuthenticated: true,
          isPremium: false,
        },
        version: 0,
      };
      localStorage.setItem('auth-store', JSON.stringify(authState));
      localStorage.setItem('auth-storage', JSON.stringify(authState));
    }, mockStudent);

    await context.addCookies([
      { name: 'access_token', value: MOCK_JWT, url: 'http://localhost:3000', httpOnly: true, sameSite: 'Lax' },
      { name: '__session', value: MOCK_JWT, url: 'http://localhost:3000', sameSite: 'Lax' }
    ]);

    await page.route('**/api/students/me*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: mockStudent }),
      });
    });

    await page.route('**/api/students/me/subjects*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: [] }),
      });
    });

    await page.route('**/api/ai/chat/sessions*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK', data: mockSessions }),
      });
    });

    await page.route('**/api/ai/chat/history*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          success: true,
          message: 'OK',
          data: [
            {
              id: 'msg-u1',
              role: 'user',
              message: 'Explain shortest path algorithms in detail with a long response.',
              createdAt: '2026-08-28T10:00:00Z',
            },
            {
              id: 'msg-a1',
              role: 'assistant',
              message: longAssistantMessage,
              createdAt: '2026-08-28T10:00:05Z',
            },
          ],
        }),
      });
    });

    await page.route('**/api/performance/report*', async route => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, data: { overallAverage: 80.0 } }),
      });
    });

    await page.route('**/api/wake', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ status: 'awake' }) });
    });

    await page.route('**/api/notifications*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: [] }) });
    });

    await page.route('**/api/timetable/active*', async route => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ success: true, data: null }) });
    });
  });

  test('CHAT-SCROLL-01: Message container (.scrollArea) is the sole vertical scroll region with scrollHeight > clientHeight', async ({ page }) => {
    await page.goto('/chat/session-1');

    const scrollArea = page.locator('[data-testid="chat-scroll-area"]');
    await expect(scrollArea).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Explain shortest path algorithms')).toBeVisible({ timeout: 10000 });

    // Verify DOM layout and scroll ownership
    const metrics = await scrollArea.evaluate((el) => {
      const computed = window.getComputedStyle(el);
      return {
        scrollHeight: el.scrollHeight,
        clientHeight: el.clientHeight,
        overflowY: computed.overflowY,
        hasScroll: el.scrollHeight > el.clientHeight,
      };
    });

    expect(metrics.overflowY).toBe('auto');
    expect(metrics.hasScroll).toBe(true);
    expect(metrics.scrollHeight).toBeGreaterThan(metrics.clientHeight + 50);
  });

  test('CHAT-SCROLL-02: Scrolling message list increments messageContainer.scrollTop while document/body scrollTop remains 0', async ({ page }) => {
    await page.goto('/chat/session-1');

    const scrollArea = page.locator('[data-testid="chat-scroll-area"]');
    await expect(scrollArea).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=Explain shortest path algorithms')).toBeVisible({ timeout: 10000 });

    // Scroll to top
    await scrollArea.evaluate((el) => {
      el.scrollTo({ top: 0, behavior: 'instant' as ScrollBehavior });
    });
    await page.waitForTimeout(50);

    const initialTop = await scrollArea.evaluate((el) => el.scrollTop);
    expect(initialTop).toBeLessThanOrEqual(5);

    // Scroll down inside scrollArea
    await scrollArea.evaluate((el) => {
      el.scrollTo({ top: 300, behavior: 'instant' as ScrollBehavior });
    });
    await page.waitForTimeout(50);

    const updatedMetrics = await page.evaluate(() => {
      const scrollEl = document.querySelector('[data-testid="chat-scroll-area"]') as HTMLElement;
      const mainEl = document.querySelector('#main-content') as HTMLElement;
      return {
        chatScrollTop: scrollEl ? scrollEl.scrollTop : -1,
        mainScrollTop: mainEl ? mainEl.scrollTop : -1,
        bodyScrollTop: document.body.scrollTop || document.documentElement.scrollTop,
      };
    });

    expect(updatedMetrics.chatScrollTop).toBeGreaterThan(150);
    // Outer page and main element must NOT have scrolled
    expect(updatedMetrics.mainScrollTop).toBe(0);
    expect(updatedMetrics.bodyScrollTop).toBe(0);
  });

  test('CHAT-SCROLL-03: Composer remains anchored at bottom of viewport and fully visible when user scrolls through messages', async ({ page }) => {
    await page.goto('/chat/session-1');

    const composer = page.locator('[data-testid="chat-input-container"]');
    await expect(composer).toBeVisible({ timeout: 10000 });

    const initialComposerRect = await composer.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom, height: r.height, innerHeight: window.innerHeight };
    });

    // Composer must be near the bottom of the viewport
    expect(initialComposerRect.bottom).toBeLessThanOrEqual(initialComposerRect.innerHeight + 2);
    expect(initialComposerRect.top).toBeGreaterThan(initialComposerRect.innerHeight - 200);

    const scrollArea = page.locator('[data-testid="chat-scroll-area"]');

    // 1. Scroll to top
    await scrollArea.evaluate((el) => { el.scrollTop = 0; });
    await page.waitForTimeout(100);
    const topComposerRect = await composer.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    expect(Math.abs(topComposerRect.bottom - initialComposerRect.bottom)).toBeLessThanOrEqual(2);

    // 2. Scroll to middle
    await scrollArea.evaluate((el) => { el.scrollTop = el.scrollHeight / 2; });
    await page.waitForTimeout(100);
    const middleComposerRect = await composer.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    expect(Math.abs(middleComposerRect.bottom - initialComposerRect.bottom)).toBeLessThanOrEqual(2);

    // 3. Scroll to bottom
    await scrollArea.evaluate((el) => { el.scrollTop = el.scrollHeight; });
    await page.waitForTimeout(100);
    const bottomComposerRect = await composer.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return { top: r.top, bottom: r.bottom };
    });
    expect(Math.abs(bottomComposerRect.bottom - initialComposerRect.bottom)).toBeLessThanOrEqual(2);
  });

  test('CHAT-SCROLL-04: Composer input is reachable, focusable, and accepts text without shifting page layout', async ({ page }) => {
    await page.goto('/chat/session-1');

    const textarea = page.locator('#chat-textarea');
    await expect(textarea).toBeVisible({ timeout: 10000 });

    await textarea.focus();
    await textarea.fill('How does Bellman-Ford handle negative weight cycles?');

    await expect(textarea).toHaveValue('How does Bellman-Ford handle negative weight cycles?');

    // Page body scrollTop remains 0
    const bodyScroll = await page.evaluate(() => document.body.scrollTop || document.documentElement.scrollTop);
    expect(bodyScroll).toBe(0);
  });

  test('CHAT-SCROLL-05: Sidebar session list scrolls independently with its own scroll container', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/chat/session-1');

    const sidebarHistory = page.locator('[data-testid="chat-sidebar-history"]');
    await expect(sidebarHistory).toBeVisible({ timeout: 10000 });

    const overflowY = await sidebarHistory.evaluate((el) => window.getComputedStyle(el).overflowY);
    expect(overflowY).toBe('auto');
  });

  test('CHAT-SCROLL-06: Mobile viewport maintains sticky bottom composer, zero horizontal overflow, and mobile history drawer', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/chat/session-1');

    const scrollArea = page.locator('[data-testid="chat-scroll-area"]');
    const composer = page.locator('[data-testid="chat-input-container"]');
    await expect(scrollArea).toBeVisible({ timeout: 10000 });
    await expect(composer).toBeVisible({ timeout: 10000 });

    // Verify zero horizontal overflow on mobile
    const horizontalOverflow = await page.evaluate(() => {
      return document.documentElement.scrollWidth > window.innerWidth;
    });
    expect(horizontalOverflow).toBe(false);

    // Verify mobile history button opens drawer
    const historyBtn = page.locator('[data-testid="mobile-history-toggle-btn"]');
    await expect(historyBtn).toBeVisible();
    await historyBtn.click();

    const drawer = page.locator('[data-testid="mobile-drawer-content"]');
    await expect(drawer).toBeVisible();

    // Close drawer via backdrop click
    const backdrop = page.locator('[data-testid="mobile-drawer-backdrop"]');
    await backdrop.click({ position: { x: 350, y: 100 } });
    await expect(drawer).not.toBeVisible();
  });

  test('CHAT-SCROLL-07: Non-chat routes (Settings, Timetable) preserve their standard document scroll container and padding', async ({ page }) => {
    await page.goto('/settings');

    const mainElement = page.locator('#main-content');
    await expect(mainElement).toBeVisible({ timeout: 10000 });

    // Verify main on non-chat route has overflow-y: auto and padding
    const mainClasses = await mainElement.getAttribute('class');
    expect(mainClasses).toContain('overflow-y-auto');
    expect(mainClasses).toContain('p-4');
  });
});
