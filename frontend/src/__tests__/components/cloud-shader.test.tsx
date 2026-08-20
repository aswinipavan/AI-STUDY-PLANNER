/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { CloudShader } from '@/components/ui/cloud-shader';
import CloudShaderDemo from '@/components/cloud-shader-demo';

beforeAll(() => {
  // Mock ResizeObserver
  if (typeof global.ResizeObserver === 'undefined') {
    global.ResizeObserver = class ResizeObserver {
      observe = jest.fn();
      unobserve = jest.fn();
      disconnect = jest.fn();
    } as any;
  }

  // Mock HTMLCanvasElement.prototype.getContext to prevent JSDOM unimplemented error
  jest.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) => {
    if (contextId === 'webgl' || contextId === 'experimental-webgl') {
      return null;
    }
    return null;
  });
});

afterAll(() => {
  jest.restoreAllMocks();
});

describe('CloudShader Component', () => {
  it('renders canvas element and container cleanly', () => {
    const { container } = render(<CloudShader className="h-[20rem] w-full" />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(container.firstChild).toHaveClass('relative', 'min-h-80', 'overflow-hidden', 'h-[20rem]', 'w-full');
  });

  it('renders children over the cloud canvas when provided', () => {
    render(
      <CloudShader className="h-[20rem] w-full">
        <h1 data-testid="overlay-title">AI Cloud Workspace</h1>
      </CloudShader>
    );
    expect(screen.getByTestId('overlay-title')).toBeInTheDocument();
    expect(screen.getByText('AI Cloud Workspace')).toBeInTheDocument();
  });

  it('accepts custom shader parameters without throwing', () => {
    const { container } = render(
      <CloudShader
        speed={1.5}
        count={4}
        cloudColor="#ffffff"
        skyTopColor="#1e3a8a"
        skyBottomColor="#3b82f6"
        className="custom-cloud"
      />
    );
    expect(container.firstChild).toHaveClass('custom-cloud');
  });

  it('renders CloudShaderDemo without crashing', () => {
    const { container } = render(<CloudShaderDemo />);
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });
});
