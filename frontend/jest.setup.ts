/* eslint-disable @typescript-eslint/no-explicit-any */
/* eslint-disable @typescript-eslint/no-unused-vars */
import React from 'react';
import '@testing-library/jest-dom';

// Mock global fetch and Response FIRST - before any other imports
if (typeof global.fetch === 'undefined') {
  global.fetch = jest.fn();
}

if (typeof global.Response === 'undefined') {
  (global as any).Response = class Response {
    body: any;
    constructor(body: any) {
      this.body = body;
    }
  };
}

// Mock matchMedia for components like Carousel, Radix UI, etc.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // Deprecated
    removeListener: jest.fn(), // Deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      prefetch: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      pathname: '/',
    };
  },
  usePathname() {
    return '';
  },
  useSearchParams() {
    return new URLSearchParams();
  }
}));

// Mock react-markdown, remark-math, and rehype-katex for JSDOM
jest.mock('react-markdown', () => ({
  __esModule: true,
  default: ({ children }: any) => {
    return React.createElement('div', { 'data-testid': 'markdown-content' }, children);
  },
}));

jest.mock('remark-math', () => ({
  __esModule: true,
  default: () => () => {},
}));

jest.mock('remark-gfm', () => ({
  __esModule: true,
  default: () => () => {},
}));

jest.mock('rehype-katex', () => ({
  __esModule: true,
  default: () => () => {},
}));

