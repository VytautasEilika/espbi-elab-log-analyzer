import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import LogUploader from './LogUploader';

describe('LogUploader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => {
      const reader = {
        readAsText: vi.fn(function(this: any) {
          if (this.onload) {
            this.onload({ target: { result: 'sample content' } });
          }
        }),
        onload: null as any,
        onerror: null as any,
        onprogress: null as any,
      };
      return reader;
    }));
  });

  it('renders the drop zone message', () => {
    const onFileLoaded = vi.fn();
    render(<LogUploader onFileLoaded={onFileLoaded} />);
    
    expect(screen.getByText(/Drop your log file here/i)).toBeInTheDocument();
  });

  it('triggers file upload when a file is selected', async () => {
    const user = userEvent.setup();
    const onFileLoaded = vi.fn();
    render(<LogUploader onFileLoaded={onFileLoaded} />);
    
    const input = screen.getByTestId('log-input');
    const file = new File(['content'], 'test.log', { type: 'text/plain' });
    
    await user.upload(input, file);

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith('sample content', 'test.log');
    }, { timeout: 2000 });
  });

  it('shows loading state when file is being processed', async () => {
    const user = userEvent.setup();
    const onFileLoaded = vi.fn();
    
    // Mock a slow FileReader
    vi.stubGlobal('FileReader', vi.fn().mockImplementation(() => ({
      readAsText: vi.fn(), // Never completes
      onload: null,
      onerror: null,
      onprogress: null,
    })));

    render(<LogUploader onFileLoaded={onFileLoaded} />);
    
    const input = screen.getByTestId('log-input');
    const file = new File(['log'], 'test.log', { type: 'text/plain' });
    
    await user.upload(input, file);

    expect(screen.getByText(/Loading file.../i)).toBeInTheDocument();
  });
});
