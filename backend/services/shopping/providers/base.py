from abc import ABC, abstractmethod

class ShoppingProvider(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Return provider name (e.g. 'amazon', 'flipkart', 'meesho')."""
        pass

    @abstractmethod
    def is_configured(self) -> bool:
        """Return True if credential keys are set, otherwise False."""
        pass

    @abstractmethod
    def search_products(self, query: str, filters: dict = None) -> dict:
        """Search products on the provider site.
        Returns:
            {"success": bool, "provider": str, "results": list[dict], "error_code": str}
        """
        pass

    @abstractmethod
    def get_product_details(self, product_id: str) -> dict:
        """Retrieve details for a specific product ID."""
        pass

    @abstractmethod
    def get_price(self, product_id: str) -> dict:
        """Retrieve current pricing data."""
        pass

    @abstractmethod
    def check_availability(self, product_id: str) -> dict:
        """Retrieve stock availability status."""
        pass
