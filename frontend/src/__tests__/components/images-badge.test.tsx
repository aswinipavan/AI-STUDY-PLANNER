/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { ImagesBadge } from '@/components/ui/images-badge';
import ImagesBadgeDemo from '@/components/images-badge-demo';

describe('ImagesBadge Component', () => {
  const sampleImages = [
    'https://assets.aceternity.com/pro/agenforce-1.webp',
    'https://assets.aceternity.com/pro/agenforce-2.webp',
    'https://assets.aceternity.com/pro/agenforce-3.webp',
  ];

  it('renders badge text and images correctly', () => {
    render(<ImagesBadge text="Introducing AI Study Planner" images={sampleImages} />);
    expect(screen.getByText('Introducing AI Study Planner')).toBeInTheDocument();
    
    const previewImages = screen.getAllByRole('img');
    expect(previewImages).toHaveLength(3);
    expect(previewImages[0]).toHaveAttribute('src', sampleImages[0]);
  });

  it('renders as a link when href is provided', () => {
    render(
      <ImagesBadge
        text="Clickable Badge"
        images={sampleImages}
        href="https://example.com"
        target="_blank"
      />
    );
    const linkElement = screen.getByRole('link');
    expect(linkElement).toBeInTheDocument();
    expect(linkElement).toHaveAttribute('href', 'https://example.com');
    expect(linkElement).toHaveAttribute('target', '_blank');
    expect(linkElement).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('renders as div when href is omitted', () => {
    const { container } = render(
      <ImagesBadge text="Non-link Badge" images={sampleImages} />
    );
    expect(container.querySelector('a')).toBeNull();
    expect(screen.getByText('Non-link Badge')).toBeInTheDocument();
  });

  it('limits to at most 3 images', () => {
    const fourImages = [
      'https://assets.aceternity.com/pro/agenforce-1.webp',
      'https://assets.aceternity.com/pro/agenforce-2.webp',
      'https://assets.aceternity.com/pro/agenforce-3.webp',
      'https://assets.aceternity.com/pro/agenforce-4.webp',
    ];
    render(<ImagesBadge text="Max 3 test" images={fourImages} />);
    const previewImages = screen.getAllByRole('img');
    expect(previewImages).toHaveLength(3);
  });

  it('handles mouse enter and mouse leave hover events cleanly', () => {
    const { container } = render(
      <ImagesBadge text="Hoverable Badge" images={sampleImages} />
    );
    const root = container.firstChild as HTMLElement;
    fireEvent.mouseEnter(root);
    fireEvent.mouseLeave(root);
    expect(screen.getByText('Hoverable Badge')).toBeInTheDocument();
  });

  it('renders ImagesBadgeDemo without crashing', () => {
    render(<ImagesBadgeDemo />);
    expect(screen.getByText('Introducing Agenforce Marketing Template')).toBeInTheDocument();
  });
});
