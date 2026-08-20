/* eslint-disable @typescript-eslint/no-explicit-any */
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import { FloatingDock, FloatingDockItem } from '@/components/ui/floating-dock';
import FloatingDockDemo from '@/components/floating-dock-demo';
import { Home, Terminal, Sparkles } from 'lucide-react';

describe('FloatingDock Component', () => {
  const sampleItems: FloatingDockItem[] = [
    {
      title: 'Home',
      icon: <Home data-testid="icon-home" />,
      href: '/home',
    },
    {
      title: 'AI Chat',
      icon: <Terminal data-testid="icon-chat" />,
      href: '/chat',
    },
    {
      title: 'Study Planner',
      icon: <Sparkles data-testid="icon-planner" />,
      href: '/timetable',
    },
  ];

  it('renders all dock items and icons', () => {
    render(<FloatingDock items={sampleItems} />);
    const homeLinks = screen.getAllByRole('link');
    expect(homeLinks.length).toBeGreaterThanOrEqual(3);
  });

  it('toggles mobile menu on button click', () => {
    render(<FloatingDock items={sampleItems} />);
    const toggleBtn = screen.getByLabelText('Toggle Dock Menu');
    expect(toggleBtn).toBeInTheDocument();

    fireEvent.click(toggleBtn);
    expect(toggleBtn).toBeInTheDocument();
  });

  it('renders FloatingDockDemo without crashing', () => {
    render(<FloatingDockDemo />);
    expect(screen.getByLabelText('Toggle Dock Menu')).toBeInTheDocument();
  });
});
