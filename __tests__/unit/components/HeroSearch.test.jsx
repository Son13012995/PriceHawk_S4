import React from "react";
import { render, screen, fireEvent } from "@testing-library/react";
import HeroSearch from "../../../components/HeroSearch";
import { useRouter } from "next/navigation";

// Mock next/navigation
jest.mock("next/navigation", () => ({
  useRouter: jest.fn(),
}));

describe("HeroSearch Component", () => {
  const mockPush = jest.fn();

  beforeEach(() => {
    useRouter.mockReturnValue({ push: mockPush });
    jest.clearAllMocks();
  });

  test("renders properly", () => {
    render(<HeroSearch />);
    expect(screen.getByPlaceholderText("Tìm tên mặt hàng...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Tìm kiếm/i })).toBeInTheDocument();
  });

  test("updates query on input change", () => {
    render(<HeroSearch />);
    const input = screen.getByPlaceholderText("Tìm tên mặt hàng...");
    fireEvent.change(input, { target: { value: "iphone 15" } });
    expect(input.value).toBe("iphone 15");
  });

  test("calls router.push on submit with query", () => {
    render(<HeroSearch />);
    const input = screen.getByPlaceholderText("Tìm tên mặt hàng...");
    fireEvent.change(input, { target: { value: "iphone 15" } });
    
    const form = screen.getByRole("button", { name: /Tìm kiếm/i }).closest("form");
    fireEvent.submit(form);

    expect(mockPush).toHaveBeenCalledWith("/search/iphone%2015");
  });

  test("does not call router.push if query is empty", () => {
    render(<HeroSearch />);
    const form = screen.getByRole("button", { name: /Tìm kiếm/i }).closest("form");
    fireEvent.submit(form);

    expect(mockPush).not.toHaveBeenCalled();
  });
});
