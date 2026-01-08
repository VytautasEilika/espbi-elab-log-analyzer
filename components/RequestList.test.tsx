import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import RequestList from './RequestList';
import { RequestGroup } from '@/lib/log-parser';

describe('RequestList', () => {
  const mockRequests: RequestGroup[] = [
    {
      requestId: 'REQ-1',
      entries: [],
      hasErrors: false,
      hasWarnings: false,
      startTime: '2025-12-23 10:00:00',
      durationMs: 100,
      url: '/api/v1/user'
    },
    {
      requestId: 'REQ-ERROR',
      entries: [],
      hasErrors: true,
      hasWarnings: false,
      startTime: '2025-12-23 10:05:00',
      durationMs: 500,
      url: '/api/v1/payment'
    }
  ];

  it('renders a list of requests', () => {
    const onSelectRequest = vi.fn();
    render(
      <RequestList 
        requests={mockRequests} 
        onSelectRequest={onSelectRequest} 
        searchTerm=""
        environmentFilter="ALL"
        showErrorsOnly={false}
      />
    );
    
    expect(screen.getByText('REQ-1')).toBeInTheDocument();
    expect(screen.getByText('REQ-ERROR')).toBeInTheDocument();
    expect(screen.getByText('/api/v1/user')).toBeInTheDocument();
    expect(screen.getByText('/api/v1/payment')).toBeInTheDocument();
  });

  it('shows error badge for requests with errors', () => {
    const onSelectRequest = vi.fn();
    render(
      <RequestList 
        requests={mockRequests} 
        onSelectRequest={onSelectRequest} 
        searchTerm=""
        environmentFilter="ALL"
        showErrorsOnly={false}
      />
    );
    
    const errorRequests = screen.getAllByText(/ERROR/);
    expect(errorRequests.length).toBeGreaterThan(0);
  });

  it('shows empty state when no requests match filter', () => {
    const onSelectRequest = vi.fn();
    render(
      <RequestList 
        requests={[]} 
        onSelectRequest={onSelectRequest} 
        searchTerm=""
        environmentFilter="ALL"
        showErrorsOnly={false}
      />
    );
    
    expect(screen.getByText(/No requests found/i)).toBeInTheDocument();
  });
});
