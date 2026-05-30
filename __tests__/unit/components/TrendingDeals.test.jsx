import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import TrendingDeals from "../../../components/TrendingDeals";
import { getProducts } from "../../../lib/apiClient";

jest.mock("../../../lib/apiClient", () => ({
  getProducts: jest.fn(),
}));

jest.mock("../../../components/SearchCard", () => {
  return function MockSearchCard({ name }) {
    return <div data-testid="search-card">{name}</div>;
  };
});

describe("TrendingDeals Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("hiển thị loading state ban đầu", () => {
    // delay promise to keep it in loading state
    getProducts.mockReturnValue(new Promise(() => {}));
    
    const { container } = render(<TrendingDeals />);
    const skeletons = container.querySelectorAll(".animate-pulse");
    expect(skeletons.length).toBe(4);
  });

  test("không render gì nếu không có products", async () => {
    getProducts.mockResolvedValueOnce({ data: { data: [] } });
    
    const { container } = render(<TrendingDeals />);
    
    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledTimes(1);
    });
    
    expect(container.firstChild).toBeNull();
  });

  test("hiển thị products khi gọi API thành công", async () => {
    getProducts.mockResolvedValueOnce({
      data: {
        data: [
          { id: 1, name: "Product 1", image_url: "img1", brand: "b1", current_price: 100 },
          { id: 2, name: "Product 2", image_url: "img2", brand: "b2", price: 200 },
        ],
      },
    });

    render(<TrendingDeals />);

    await waitFor(() => {
      expect(screen.getAllByTestId("search-card")).toHaveLength(2);
    });

    expect(screen.getByText("Product 1")).toBeInTheDocument();
    expect(screen.getByText("Product 2")).toBeInTheDocument();
  });

  test("xử lý lỗi khi gọi API", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    getProducts.mockRejectedValueOnce(new Error("API Error"));

    const { container } = render(<TrendingDeals />);

    await waitFor(() => {
      expect(getProducts).toHaveBeenCalledTimes(1);
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith("Failed to fetch trending deals", expect.any(Error));
    expect(container.firstChild).toBeNull(); // Because products length is 0

    consoleErrorSpy.mockRestore();
  });
});
