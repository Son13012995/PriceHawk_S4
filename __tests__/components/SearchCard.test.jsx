import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import SearchCard from '../../../components/SearchCard';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/image
vi.mock('next/image', () => ({
  default: (props) => <img {...props} />,
}));

describe('SearchCard Component', () => {
  const mockProps = {
    id: 1,
    imageUrl: 'https://example.com/image.jpg',
    name: 'iPhone 14',
    brand: 'Apple',
  };

  it('should render product card with required props', () => {
    render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('iPhone 14')).toBeInTheDocument();
    expect(screen.getByText('APPLE')).toBeInTheDocument();
  });

  it('should have correct navigation link', () => {
    render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toHaveAttribute('href', '/product/1');
  });

  it('should display product image', () => {
    render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    const image = screen.getByAltText(/product image/i, { exact: false });
    expect(image).toBeDefined();
  });

  it('should render brand in uppercase', () => {
    render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('APPLE')).toBeInTheDocument();
  });

  it('should display compare price text', () => {
    render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    expect(screen.getByText(/so sánh|compare/i)).toBeInTheDocument();
  });

  it('should render with different product data', () => {
    const differentProps = {
      id: 2,
      imageUrl: 'https://example.com/product2.jpg',
      name: 'Samsung Galaxy S21',
      brand: 'Samsung',
    };

    render(
      <BrowserRouter>
        <SearchCard {...differentProps} />
      </BrowserRouter>
    );

    expect(screen.getByText('Samsung Galaxy S21')).toBeInTheDocument();
    expect(screen.getByText('SAMSUNG')).toBeInTheDocument();
  });

  it('should handle special characters in product name', () => {
    const specialProps = {
      ...mockProps,
      name: 'MacBook Pro 13" M1',
    };

    render(
      <BrowserRouter>
        <SearchCard {...specialProps} />
      </BrowserRouter>
    );

    expect(screen.getByText(/MacBook Pro/)).toBeInTheDocument();
  });

  it('should navigate to correct product page', () => {
    const { container } = render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    const link = container.querySelector('a');
    expect(link.href).toContain('/product/1');
  });

  it('should have accessible card structure', () => {
    render(
      <BrowserRouter>
        <SearchCard {...mockProps} />
      </BrowserRouter>
    );

    const link = screen.getByRole('link');
    expect(link).toBeInTheDocument();
  });
});
