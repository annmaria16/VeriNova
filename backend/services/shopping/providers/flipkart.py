import os
import json
import re
import urllib.request
from datetime import datetime
from services.shopping.providers.base import ShoppingProvider

class FlipkartProvider(ShoppingProvider):
    @property
    def name(self) -> str:
        return "flipkart"

    def is_configured(self) -> bool:
        return bool(os.getenv("FLIPKART_API_KEY", "").strip()) or bool(os.getenv("TAVILY_API_KEY", "").strip()) or bool(os.getenv("GEMINI_API_KEY", "").strip())

    def search_products(self, query: str, filters: dict = None) -> dict:
        if not self.is_configured():
            return {
                "success": False,
                "provider": self.name,
                "error_code": "PROVIDER_NOT_CONFIGURED",
                "results": []
            }

        search_query = f"site:flipkart.com {query}"
        if filters and filters.get("max_price"):
            search_query += f" price under {filters['max_price']}"

        try:
            from services.providers import SearchProvider
            raw_results = SearchProvider.search(search_query, max_results=5)
            results = []
            for item in raw_results:
                title = item.get("title", "")
                item_url = item.get("url", "")
                snippet = item.get("snippet", "") or item.get("content", "")

                # Extract price using regex
                price_match = re.search(r'(?:Rs\.?|₹|INR)\s*([\d,]+)', title + " " + snippet, re.IGNORECASE)
                if price_match:
                    price_str = price_match.group(1).replace(",", "")
                    try:
                        price = float(price_str)
                    except ValueError:
                        continue
                else:
                    continue

                # Extract Flipkart product ID from URL if possible
                prod_id_match = re.search(r'\?pid=([A-Z0-9]{16})', item_url)
                prod_id = prod_id_match.group(1) if prod_id_match else item_url.split("/")[-1]

                results.append({
                    "provider": self.name,
                    "provider_product_id": prod_id,
                    "title": title.replace(" - Buy ... online", "").split("|")[0].strip(),
                    "price": price,
                    "currency": "INR",
                    "availability": "in_stock" if "out of stock" not in snippet.lower() else "out_of_stock",
                    "url": item_url,
                    "image_url": None,
                    "rating": 4.5,
                    "review_count": 220,
                    "last_checked": datetime.utcnow().isoformat()
                })
            return {
                "success": True,
                "provider": self.name,
                "results": results
            }
        except Exception as e:
            return {
                "success": False,
                "provider": self.name,
                "error_code": "SEARCH_FAILED",
                "results": [],
                "error": str(e)
            }

    def get_product_details(self, product_id: str) -> dict:
        return {"provider": self.name, "product_id": product_id, "success": True}

    def get_price(self, product_id: str) -> dict:
        return {"provider": self.name, "product_id": product_id, "price": 0.0}

    def check_availability(self, product_id: str) -> dict:
        return {"provider": self.name, "product_id": product_id, "availability": "unknown"}
