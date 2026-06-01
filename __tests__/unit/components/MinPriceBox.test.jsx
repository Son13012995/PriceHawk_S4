import React from "react";
import { render, screen, waitFor } from "@testing-library/react";
import MinPriceBox from "../../../components/MinPriceBox";
import { getProductDetail } from "../../../lib/apiClient";

jest.mock("../../../app/utils/format", () => ({
  formatPrice: jest.fn((price) => `${price} đ`),
}));

jest.mock("../../../lib/apiClient", () => ({
  getProductDetail: jest.fn(),
}));

describe("MinPriceBox Component", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test("hiển thị loading state ban đầu", () => {
    getProductDetail.mockReturnValue(new Promise(() => {}));
    const { container } = render(<MinPriceBox productId={1} />);
    expect(container.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  test("hiển thị 'Chưa có dữ liệu' khi API không trả về comparison", async () => {
    getProductDetail.mockResolvedValueOnce({ data: { comparison: [] } });
    render(<MinPriceBox productId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText("Chưa có dữ liệu")).toBeInTheDocument();
    });
  });

  test("hiển thị min price khi có comparison", async () => {
    getProductDetail.mockResolvedValueOnce({
      data: {
        comparison: [
          { price: 20000000, current_price_at: "2024-05-10T10:00:00Z" },
          { price: 15000000, current_price_at: "2024-05-11T10:00:00Z" }, // min
        ]
      }
    });
    
    render(<MinPriceBox productId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText("15000000 đ")).toBeInTheDocument();
    });
  });

  test("xử lý lỗi API và hiển thị 'Chưa có dữ liệu'", async () => {
    const consoleErrorSpy = jest.spyOn(console, "error").mockImplementation(() => {});
    getProductDetail.mockRejectedValueOnce(new Error("API error"));
    
    render(<MinPriceBox productId={1} />);
    
    await waitFor(() => {
      expect(screen.getByText("Chưa có dữ liệu")).toBeInTheDocument();
    });
    
    consoleErrorSpy.mockRestore();
  });
});

