import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import ThemeProvider from '../../../components/ThemeProvider';

// Mock next-themes
vi.mock('next-themes', () => ({
  ThemeProvider: ({ children, ...props }) => (
    <div data-testid="theme-provider" {...props}>
      {children}
    </div>
  ),
}));

describe('ThemeProvider Component', () => {
  it('should render children components', () => {
    render(
      <ThemeProvider>
        <div>Test Child</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Test Child')).toBeInTheDocument();
  });

  it('should render multiple children', () => {
    render(
      <ThemeProvider>
        <div>Child 1</div>
        <div>Child 2</div>
      </ThemeProvider>
    );

    expect(screen.getByText('Child 1')).toBeInTheDocument();
    expect(screen.getByText('Child 2')).toBeInTheDocument();
  });

  it('should provide theme context', () => {
    const { container } = render(
      <ThemeProvider>
        <div>Context Provider Test</div>
      </ThemeProvider>
    );

    const themeProvider = container.querySelector('[data-testid="theme-provider"]');
    expect(themeProvider).toBeInTheDocument();
  });

  it('should accept additional props and spread them', () => {
    const { container } = render(
      <ThemeProvider attribute="class">
        <div>Test</div>
      </ThemeProvider>
    );

    const themeProvider = container.querySelector('[data-testid="theme-provider"]');
    expect(themeProvider).toHaveAttribute('attribute', 'class');
  });

  it('should work with nested components', () => {
    render(
      <ThemeProvider>
        <div>
          <span>Nested child 1</span>
          <span>Nested child 2</span>
        </div>
      </ThemeProvider>
    );

    expect(screen.getByText('Nested child 1')).toBeInTheDocument();
    expect(screen.getByText('Nested child 2')).toBeInTheDocument();
  });
});
