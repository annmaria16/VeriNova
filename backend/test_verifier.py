import unittest
from services.shopping.shopping_verifier import verify_product

class TestShoppingVerifier(unittest.TestCase):
    def test_category_mismatch(self):
        product = {
            "title": "Laptop Bag",
            "category": "accessory",
            "price": 999,
            "url": "http://example.com/bag"
        }
        criteria = {
            "category": "laptop",
            "budget_max": 60000
        }
        self.assertFalse(verify_product(product, criteria)["verified"])

    def test_ram_mismatch(self):
        product = {
            "category": "laptop",
            "ram_gb": 8,
            "price": 55000,
            "url": "http://example.com/laptop"
        }
        criteria = {
            "category": "laptop",
            "ram_gb": 16,
            "budget_max": 60000
        }
        self.assertFalse(verify_product(product, criteria)["verified"])

    def test_correct_product(self):
        product = {
            "category": "laptop",
            "brand": "HP",
            "ram_gb": 16,
            "storage_gb": 512,
            "storage_type": "SSD",
            "price": 57999,
            "url": "http://example.com/hp"
        }
        criteria = {
            "category": "laptop",
            "brand": "HP",
            "ram_gb": 16,
            "storage_gb": 512,
            "budget_max": 60000
        }
        self.assertTrue(verify_product(product, criteria)["verified"])

    def test_missing_specification(self):
        # If the user explicitly requires 16GB RAM:
        product = {
            "category": "laptop",
            "price": 55000,
            "url": "http://example.com/laptop"
        }
        criteria = {
            "category": "laptop",
            "ram_gb": 16,
            "budget_max": 60000
        }
        self.assertFalse(verify_product(product, criteria)["verified"])

    def test_fake_accessory(self):
        product = {
            "title": "Laptop Stand",
            "category": "accessory",
            "price": 1200,
            "url": "http://example.com/stand"
        }
        self.assertFalse(verify_product(product, {"category": "laptop", "budget_max": 60000})["verified"])

if __name__ == "__main__":
    unittest.main()
