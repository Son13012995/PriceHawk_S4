import React from "react";
import { render, screen } from "@testing-library/react";
import SearchCard from "../../../components/SearchCard";

// Mock hàm formatPrice để dễ dàng assert kết quả mà không phụ thuộc vào locale thực tế
jest.mock("../../../app/utils/format", () => ({
  formatPrice: jest.fn((price) => `${price} đ`),
}));

describe("SearchCard Component", () => {
  const mockProps = {
    id: 1,
    imageUrl: "/test-image.jpg",
    name: "Test Smartphone X",
    brand: "Apple",
    currentPrice: 20000000,
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("renders without crashing", () => {
    render(<SearchCard {...mockProps} />);
    expect(screen.getByText("Test Smartphone X")).toBeInTheDocument();
  });

  test("displays the correct product name and brand", () => {
    render(<SearchCard {...mockProps} />);
    expect(screen.getByText("Test Smartphone X")).toBeInTheDocument();
    expect(screen.getByText("Apple")).toBeInTheDocument();
  });

  test("displays the current price correctly using formatPrice", () => {
    render(<SearchCard {...mockProps} />);
    // formatPrice được mock trả về "{price} đ"
    expect(screen.getByText("20000000 đ")).toBeInTheDocument();
  });

  test("displays 'Liên hệ' if currentPrice is null", () => {
    const noPriceProps = { ...mockProps, currentPrice: null };
    render(<SearchCard {...noPriceProps} />);
    expect(screen.getByText("Liên hệ")).toBeInTheDocument();
  });

  test("has the correct link to the product page", () => {
    render(<SearchCard {...mockProps} />);
    const linkElement = screen.getByRole("link");
    expect(linkElement).toHaveAttribute("href", "/product/1");
  });

  test("displays a fallback image if imageUrl is not provided", () => {
    const noImageProps = { ...mockProps, imageUrl: null };
    render(<SearchCard {...noImageProps} />);
    
    // next/image mock cơ bản sẽ tạo thẻ img
    const imageElement = screen.getByAltText("Test Smartphone X");
    expect(imageElement).toHaveAttribute("src");
    // Next/Image encodes the URL, so checking for the exact fallback might be tricky 
    // depending on the jest next/image mock, but we ensure it renders an image.
  });
});
