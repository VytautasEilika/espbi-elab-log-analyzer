import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RequestDetail from './RequestDetail';
import { RequestGroup } from '@/lib/log-parser';

describe('RequestDetail', () => {
  const mockRequest: RequestGroup = {
    requestId: 'REQ-123',
    entries: [
      {
        lineNumber: 1,
        content: '[2025-12-23 10:00:00] production.INFO: REQ-123 START',
        level: 'INFO',
        timestamp: '2025-12-23 10:00:00',
        requestId: 'REQ-123'
      },
      {
        lineNumber: 2,
        content: '[2025-12-23 10:00:01] production.ERROR: REQ-123 Failed to process',
        level: 'ERROR',
        timestamp: '2025-12-23 10:00:01',
        requestId: 'REQ-123'
      }
    ],
    hasErrors: true,
    hasWarnings: false,
    startTime: '2025-12-23 10:00:00',
    endTime: '2025-12-23 10:00:01',
    durationMs: 1000,
    environment: 'production'
  };

  it('renders request header information', () => {
    const onBack = vi.fn();
    render(<RequestDetail request={mockRequest} onBack={onBack} />);
    
    expect(screen.getByText('REQ-123')).toBeInTheDocument();
    expect(screen.getByText('production')).toBeInTheDocument();
    expect(screen.getByText('1.00s')).toBeInTheDocument();
  });

  it('calls onBack when back button is clicked', () => {
    const onBack = vi.fn();
    render(<RequestDetail request={mockRequest} onBack={onBack} />);
    
    const backButton = screen.getByText(/Back to Requests/i);
    fireEvent.click(backButton);
    expect(onBack).toHaveBeenCalled();
  });

  it('renders log entries', () => {
    const onBack = vi.fn();
    render(<RequestDetail request={mockRequest} onBack={onBack} />);
    
    expect(screen.getByText(/START/)).toBeInTheDocument();
    expect(screen.getByText(/Failed to process/)).toBeInTheDocument();
  });
});
