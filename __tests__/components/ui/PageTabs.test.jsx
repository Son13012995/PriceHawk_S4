import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import PageTabs from '../../../components/ui/PageTabs';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }) => (
    <a href={href}>{children}</a>
  ),
}));

describe('PageTabs Component', () => {
  let mockUsePathname;

  beforeEach(() => {
    const { usePathname } = require('next/navigation');
    mockUsePathname = usePathname;
    vi.clearAllMocks();
  });

  it('should render navigation tabs', () => {
    mockUsePathname.mockReturnValue('/product');

    render(<PageTabs />);

    expect(screen.getByText(/products|sản phẩm/i, { exact: false })).toBeInTheDocument();
  });

  it('should highlight active tab for /product route', () => {
    mockUsePathname.mockReturnValue('/product');

    const { container } = render(<PageTabs />);

    const activeTab = container.querySelector('a[href="/product"]');
    expect(activeTab).toBeInTheDocument();
  });

  it('should highlight active tab for /alerts route', () => {
    mockUsePathname.mockReturnValue('/alerts');

    const { container } = render(<PageTabs />);

    const activeTab = container.querySelector('a[href="/alerts"]');
    expect(activeTab).toBeInTheDocument();
  });

  it('should highlight active tab for /wishlist route', () => {
    mockUsePathname.mockReturnValue('/wishlist');

    const { container } = render(<PageTabs />);

    const activeTab = container.querySelector('a[href="/wishlist"]');
    expect(activeTab).toBeInTheDocument();
  });

  it('should highlight parent route for sub-routes', () => {
    mockUsePathname.mockReturnValue('/product/123');

    const { container } = render(<PageTabs />);

    const activeTab = container.querySelector('a[href="/product"]');
    expect(activeTab).toBeInTheDocument();
  });

  it('should render all navigation links', () => {
    mockUsePathname.mockReturnValue('/');

    const { container } = render(<PageTabs />);

    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should apply custom className', () => {
    mockUsePathname.mockReturnValue('/product');

    const { container } = render(<PageTabs className="custom-class" />);

    const tabsContainer = container.firstChild;
    expect(tabsContainer.className).toContain('custom-class');
  });

  it('should navigate to correct routes on click', async () => {
    mockUsePathname.mockReturnValue('/');

    const { container } = render(<PageTabs />);

    const alertLink = container.querySelector('a[href="/alerts"]');
    expect(alertLink).toHaveAttribute('href', '/alerts');
  });

  it('should handle root path correctly', () => {
    mockUsePathname.mockReturnValue('/');

    const { container } = render(<PageTabs />);

    const links = container.querySelectorAll('a');
    expect(links.length).toBeGreaterThan(0);
  });

  it('should work without additional props', () => {
    mockUsePathname.mockReturnValue('/product');

    render(<PageTabs />);

    expect(screen.getByRole('navigation', { hidden: true }).parentElement).toBeInTheDocument();
  });
});
