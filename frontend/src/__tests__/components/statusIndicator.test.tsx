import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { StatusIndicator } from '@/components/ui/StatusIndicator';

describe('StatusIndicator Component', () => {
  it('renders UPCOMING status correctly', () => {
    render(<StatusIndicator state="UPCOMING" />);
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
  });

  it('renders ACTIVE status with pulse dot', () => {
    render(<StatusIndicator state="ACTIVE" showDot />);
    expect(screen.getByText('Active Now')).toBeInTheDocument();
  });

  it('renders COMPLETED, MISSED, CATCH_UP, and LOCKED states', () => {
    const { rerender } = render(<StatusIndicator state="COMPLETED" />);
    expect(screen.getByText('Completed')).toBeInTheDocument();

    rerender(<StatusIndicator state="MISSED" />);
    expect(screen.getByText('Missed')).toBeInTheDocument();

    rerender(<StatusIndicator state="CATCH_UP" />);
    expect(screen.getByText('Catch-Up Today')).toBeInTheDocument();

    rerender(<StatusIndicator state="LOCKED" />);
    expect(screen.getByText('Locked')).toBeInTheDocument();
  });

  it('renders custom label and subtext', () => {
    render(
      <StatusIndicator
        state="ACTIVE"
        label="Study Window Active"
        subtext="Ends at 7:00 PM"
      />
    );
    expect(screen.getByText('Study Window Active')).toBeInTheDocument();
    expect(screen.getByText('Ends at 7:00 PM')).toBeInTheDocument();
  });
});
