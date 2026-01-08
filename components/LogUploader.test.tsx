import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import LogUploader from './LogUploader';

describe('LogUploader', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('renders the drop zone message', () => {
    const onFileLoaded = vi.fn();
    render(<LogUploader onFileLoaded={onFileLoaded} />);
    expect(screen.getByText(/Drop your log file here/i)).toBeInTheDocument();
  });

  it('triggers file upload when a file is selected', async () => {
    const onFileLoaded = vi.fn();
    render(<LogUploader onFileLoaded={onFileLoaded} />);
    
    let capturedReader: any;
    vi.stubGlobal('FileReader', vi.fn().mockImplementation(function(this: any) {
      this.readAsText = vi.fn();
      this.onload = null;
      capturedReader = this;
    }));

    const input = screen.getByTestId('log-input');
    const file = new File(['content'], 'test.log', { type: 'text/plain' });
    
    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(capturedReader).toBeDefined());
    
    // Manually trigger onload to avoid timing issues with mocks
    capturedReader.onload({ target: { result: 'sample content' } });

    await waitFor(() => {
      expect(onFileLoaded).toHaveBeenCalledWith('sample content', 'test.log');
    });
  });

  it('shows loading state when file is being processed', async () => {
    const onFileLoaded = vi.fn();
    render(<LogUploader onFileLoaded={onFileLoaded} />);
    
    vi.stubGlobal('FileReader', vi.fn().mockImplementation(function(this: any) {
      this.readAsText = vi.fn();
      this.onload = null;
    }));

    const input = screen.getByTestId('log-input');
    const file = new File(['log'], 'test.log', { type: 'text/plain' });
    
    fireEvent.change(input, { target: { files: [file] } });

    const loadingMessage = await screen.findByTestId('loading-state');
    expect(loadingMessage).toBeInTheDocument();
  });
});
