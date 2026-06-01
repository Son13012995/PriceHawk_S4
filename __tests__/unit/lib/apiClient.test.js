import axios from "axios";
import apiClient, {
  getProducts,
  searchProducts,
  getProductDetail,
  getPriceHistory,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  getAlerts,
  checkTriggeredAlerts,
  createAlert,
  updateAlertStatus,
  deleteAlert,
  registerUser,
} from "../../../lib/apiClient";

jest.mock("axios", () => {
  const mockAxiosInstance = {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  };
  return {
    create: jest.fn(() => mockAxiosInstance),
  };
});

describe("apiClient.js - Unit Tests", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("Products", () => {
    test("getProducts gọi đúng endpoint và tham số", async () => {
      apiClient.get.mockResolvedValueOnce({ data: [] });
      await getProducts(1, 10, "signal");
      expect(apiClient.get).toHaveBeenCalledWith("/product", {
        params: { page: 1, pageSize: 10 },
        signal: "signal",
      });
    });

    test("searchProducts gọi đúng endpoint", async () => {
      apiClient.get.mockResolvedValueOnce({ data: [] });
      await searchProducts("iphone", 2, 20, "signal");
      expect(apiClient.get).toHaveBeenCalledWith("/pagination", {
        params: { q: "iphone", page: 2, pageSize: 20 },
        signal: "signal",
      });
    });

    test("getProductDetail gọi đúng endpoint", async () => {
      apiClient.get.mockResolvedValueOnce({ data: {} });
      await getProductDetail(5, "signal");
      expect(apiClient.get).toHaveBeenCalledWith("/compare", {
        params: { id: 5 },
        signal: "signal",
      });
    });

    test("getPriceHistory gọi đúng endpoint", async () => {
      apiClient.get.mockResolvedValueOnce({ data: {} });
      await getPriceHistory(10, "signal");
      expect(apiClient.get).toHaveBeenCalledWith("/price-history", {
        params: { id: 10 },
        signal: "signal",
      });
    });
  });

  describe("Wishlist", () => {
    test("getWishlist gọi đúng endpoint", async () => {
      apiClient.get.mockResolvedValueOnce({ data: [] });
      await getWishlist("signal");
      expect(apiClient.get).toHaveBeenCalledWith("/wishlist", { signal: "signal" });
    });

    test("addToWishlist gọi đúng endpoint và body", async () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      await addToWishlist(10);
      expect(apiClient.post).toHaveBeenCalledWith("/wishlist", { productId: 10 });
    });

    test("removeFromWishlist gọi đúng endpoint và data body", async () => {
      apiClient.delete.mockResolvedValueOnce({ data: {} });
      await removeFromWishlist(10);
      expect(apiClient.delete).toHaveBeenCalledWith("/wishlist", { data: { productId: 10 } });
    });
  });

  describe("Price Alerts", () => {
    test("getAlerts gọi đúng endpoint", async () => {
      apiClient.get.mockResolvedValueOnce({ data: [] });
      await getAlerts("signal");
      expect(apiClient.get).toHaveBeenCalledWith("/price-alert", {
        params: { status: "all" },
        signal: "signal",
      });
    });

    test("checkTriggeredAlerts gọi đúng endpoint", async () => {
      apiClient.get.mockResolvedValueOnce({ data: {} });
      await checkTriggeredAlerts("signal");
      expect(apiClient.get).toHaveBeenCalledWith("/price-alert", {
        params: { action: "check-triggers" },
        signal: "signal",
      });
    });

    test("createAlert gọi đúng endpoint", async () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      await createAlert(1, 5000000, "note");
      expect(apiClient.post).toHaveBeenCalledWith("/price-alert", {
        productId: 1,
        targetPrice: 5000000,
        note: "note",
      });
    });

    test("updateAlertStatus gọi đúng endpoint", async () => {
      apiClient.put.mockResolvedValueOnce({ data: {} });
      await updateAlertStatus(5, "active");
      expect(apiClient.put).toHaveBeenCalledWith("/price-alert", {
        alertId: 5,
        status: "active",
      });
    });

    test("deleteAlert gọi đúng endpoint", async () => {
      apiClient.delete.mockResolvedValueOnce({ data: {} });
      await deleteAlert(5);
      expect(apiClient.delete).toHaveBeenCalledWith("/price-alert", {
        data: { alertId: 5 },
      });
    });
  });

  describe("Auth", () => {
    test("registerUser gọi đúng endpoint", async () => {
      apiClient.post.mockResolvedValueOnce({ data: {} });
      await registerUser("test@test.com", "password");
      expect(apiClient.post).toHaveBeenCalledWith("/auth/register", {
        email: "test@test.com",
        password: "password",
      });
    });
  });
});
