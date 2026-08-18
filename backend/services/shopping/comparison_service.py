from services.shopping.normalization_service import normalize_product, are_products_equivalent

def compare_offers(offers: list[dict]) -> list[dict]:
    groups = []
    
    for offer in offers:
        normalized = normalize_product(offer["title"])
        offer_normalized = {**offer, "normalized": normalized}
        
        matched = False
        for g in groups:
            ref_offer = g["offers"][0]
            if are_products_equivalent(normalized, ref_offer["normalized"]):
                g["offers"].append(offer_normalized)
                matched = True
                break
                
        if not matched:
            groups.append({
                "product_group": f"{normalized.get('brand', '') or ''} {normalized.get('model', '') or ''} {normalized.get('variant', '') or ''}".strip(),
                "offers": [offer_normalized]
            })
            
    comparison_results = []
    for g in groups:
        group_offers = g["offers"]
        prices = [off["price"] for off in group_offers]
        if not prices:
            continue
            
        lowest_price = min(prices)
        highest_price = max(prices)
        price_diff = highest_price - lowest_price
        
        best_offer = min(group_offers, key=lambda off: off["price"])
        
        comparison_results.append({
            "product_group": g["product_group"],
            "offers": [
                {
                    "provider": off["provider"],
                    "title": off["title"],
                    "price": off["price"],
                    "currency": off["currency"],
                    "url": off["url"],
                    "availability": off["availability"],
                    "rating": off.get("rating"),
                    "last_checked": off.get("last_checked")
                }
                for off in group_offers
            ],
            "lowest_price": lowest_price,
            "highest_price": highest_price,
            "price_difference": price_diff,
            "best_price_provider": best_offer["provider"]
        })
        
    return comparison_results
