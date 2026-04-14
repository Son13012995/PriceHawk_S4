import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ThemeToggle from '../../../components/ThemeToggle';

// Mock next-themes
vi.mock('next-themes', () => ({
  useTheme: vi.fn(),
}));

// Mock lucide-react icons
vi.mock('lucide-react', () => ({
  Moon: () => <div data-testid="moon-icon">Moon</div>,
  Sun: () => <div data-testid="sun-icon">Sun</div>,
}));

describe('ThemeToggle Component', () => {
  let mockUseTheme;

  beforeEach(() => {
    const { useTheme } = require('next-themes');
    mockUseTheme = useTheme;
    vi.clearAllMocks();
  });

  it('should render mount placeholder initially', () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      systemTheme: 'light',
    });

    const { container } = render(<ThemeToggle />);
    expect(container.querySelector('div')).toBeInTheDocument();
  });

  it('should render toggle button after mount', async () => {
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: vi.fn(),
      systemTheme: 'light',
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should display sun icon in light mode', async () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByTestId('sun-icon')).toBeInTheDocument();
    });
  });

  it('should display moon icon in dark mode', async () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      theme: 'dark',
      setTheme: mockSetTheme,
      systemTheme: 'dark',
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByTestId('moon-icon')).toBeInTheDocument();
    });
  });

  it('should toggle theme on button click', async () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
    });

    expect(mockSetTheme).toHaveBeenCalled();
  });

  it('should switch from light to dark mode', async () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      const button = screen.getByRole('button');
      fireEvent.click(button);
      expect(mockSetTheme).toHaveBeenCalledWith('dark');
    });
  });

  it('should handle system theme preference', async () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      theme: 'system',
      setTheme: mockSetTheme,
      systemTheme: 'dark',
    });

    render(<ThemeToggle />);

    await waitFor(() => {
      expect(screen.getByRole('button')).toBeInTheDocument();
    });
  });

  it('should be accessible with keyboard', async () => {
    const mockSetTheme = vi.fn();
    mockUseTheme.mockReturnValue({
      theme: 'light',
      setTheme: mockSetTheme,
      systemTheme: 'light',
    });

    render(<ThemeToggle />);

    const user = userEvent.setup();
    await waitFor(() => {
      const button = screen.getByRole('button');
      user.tab();
      expect(button).toHaveFocus();
    });
  });
});
