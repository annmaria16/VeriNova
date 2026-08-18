import re

BRANDS = ["apple", "samsung", "oneplus", "google", "lenovo", "hp", "dell", "asus", "acer", "xiaomi", "redmi", "realme", "oppo", "vivo", "motorola", "lg", "sony"]
COLORS = ["black", "white", "blue", "green", "red", "yellow", "pink", "gold", "silver", "grey", "gray", "purple", "orange", "bronze"]

def normalize_product(title: str) -> dict:
    t_clean = title.lower()
    
    # 1. Extract brand
    brand = None
    for b in BRANDS:
        if re.search(r'\b' + re.escape(b) + r'\b', t_clean):
            brand = b.capitalize()
            break
            
    if not brand and "iphone" in t_clean:
        brand = "Apple"
            
    # 2. Extract storage
    storage = None
    storage_match = re.search(r'\b(64\s*gb|128\s*gb|256\s*gb|512\s*gb|1\s*tb)\b', t_clean)
    if storage_match:
        storage = storage_match.group(1).upper().replace(" ", "")
        
    # 3. Extract RAM
    ram = None
    ram_match = re.search(r'\b(4\s*gb|6\s*gb|8\s*gb|12\s*gb|16\s*gb|32\s*gb)\s*(?:ram\b)?', t_clean)
    if ram_match:
        ram = ram_match.group(1).upper().replace(" ", "")
        
    # 4. Extract color
    color = None
    for c in COLORS:
        if re.search(r'\b' + re.escape(c) + r'\b', t_clean):
            color = c.capitalize()
            break
            
    # 5. Extract model
    model = title
    if brand:
        model_part = re.sub(re.escape(brand), '', title, flags=re.IGNORECASE).strip()
        model_part = re.sub(r'\(.*?\)', '', model_part)
        model_part = re.sub(r'\b(?:128\s*gb|256\s*gb|512\s*gb|1\s*tb|64\s*gb|4\s*gb|6\s*gb|8\s*gb|12\s*gb|16\s*gb|ram|rom)\b', '', model_part, flags=re.IGNORECASE)
        model_part = re.sub(r'[,.\-\[\]_+]', ' ', model_part)
        words = model_part.split()
        if words:
            words = [w for w in words if w.lower() not in COLORS]
            model = " ".join(words[:3]).strip()

    return {
        "brand": brand,
        "model": model,
        "variant": storage or ram or "Standard",
        "storage": storage,
        "ram": ram,
        "color": color
    }

def are_products_equivalent(prod_a: dict, prod_b: dict) -> bool:
    if (prod_a.get("brand") or "").lower() != (prod_b.get("brand") or "").lower():
        return False
        
    if prod_a.get("storage") != prod_b.get("storage"):
        return False
    if prod_a.get("ram") != prod_b.get("ram"):
        return False
        
    model_a = (prod_a.get("model") or "").lower()
    model_b = (prod_b.get("model") or "").lower()
    
    clean_a = re.sub(r'\s+', '', model_a)
    clean_b = re.sub(r'\s+', '', model_b)
    
    if clean_a == clean_b:
        return True
        
    for suffix in ["pro", "plus", "ultra", "max", "mini"]:
        if (suffix in clean_a) != (suffix in clean_b):
            return False
            
    words_a = set(model_a.split())
    words_b = set(model_b.split())
    if not words_a or not words_b:
        return False
    intersection = words_a.intersection(words_b)
    union = words_a.union(words_b)
    jaccard = len(intersection) / len(union)
    
    return jaccard >= 0.5


class ProductMatcher:
    @staticmethod
    def is_match(prod_a: dict, prod_b: dict) -> bool:
        title_a = prod_a.get("title", "") or prod_a.get("name", "")
        title_b = prod_b.get("title", "") or prod_b.get("name", "")
        norm_a = normalize_product(title_a)
        norm_b = normalize_product(title_b)
        return are_products_equivalent(norm_a, norm_b)
