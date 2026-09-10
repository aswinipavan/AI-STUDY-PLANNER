import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import { SessionProgressionStepper } from '@/components/timetable/SessionProgressionStepper';

describe('SessionProgressionStepper Component', () => {
  it('renders all 5 steps for upcoming session', () => {
    render(<SessionProgressionStepper canonicalState="UPCOMING" />);
    expect(screen.getByText('Verification Progression')).toBeInTheDocument();
    expect(screen.getByText('Step 1 of 5')).toBeInTheDocument();
    expect(screen.getByText('Upcoming')).toBeInTheDocument();
    expect(screen.getByText('Active Now')).toBeInTheDocument();
    expect(screen.getByText('Submitted')).toBeInTheDocument();
    expect(screen.getByText('AI Verified')).toBeInTheDocument();
    expect(screen.getByText('Completed')).toBeInTheDocument();
  });

  it('updates step count for ACTIVE session', () => {
    render(<SessionProgressionStepper canonicalState="ACTIVE" />);
    expect(screen.getByText('Step 2 of 5')).toBeInTheDocument();
  });

  it('updates step count when evidence is submitted', () => {
    render(
      <SessionProgressionStepper
        canonicalState="ACTIVE"
        hasEvidenceSubmitted={true}
      />
    );
    expect(screen.getByText('Step 3 of 5')).toBeInTheDocument();
  });

  it('updates step count when AI verified', () => {
    render(
      <SessionProgressionStepper
        canonicalState="ACTIVE"
        hasEvidenceSubmitted={true}
        isVerified={true}
      />
    );
    expect(screen.getByText('Step 4 of 5')).toBeInTheDocument();
  });

  it('displays 5 of 5 Completed when completed', () => {
    render(
      <SessionProgressionStepper
        canonicalState="COMPLETED"
        isCompleted={true}
      />
    );
    expect(screen.getByText('5 of 5 Completed')).toBeInTheDocument();
  });

  it('shows locked state indicator when session is locked', () => {
    render(<SessionProgressionStepper canonicalState="LOCKED" />);
    expect(screen.getByText('Locked until scheduled date')).toBeInTheDocument();
  });
});
