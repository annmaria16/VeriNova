def generate_recommendation(comparison_group: dict) -> dict:
    offers = comparison_group.get("offers", [])
    if not offers:
        return {}

    sorted_offers = sorted(offers, key=lambda off: off["price"])
    best_offer = sorted_offers[0]
    
    reasons = [
        "Lowest verified price found across searched providers",
        f"Item is currently {best_offer.get('availability', 'in_stock').replace('_', ' ')}"
    ]
    
    if best_offer.get("rating") and best_offer["rating"] >= 4.0:
        reasons.append(f"Highly rated by users ({best_offer['rating']}/5.0)")

    return {
        "recommendation_type": "best_value",
        "recommended_offer": {
            "provider": best_offer["provider"],
            "title": best_offer["title"],
            "price": best_offer["price"],
            "url": best_offer["url"]
        },
        "reasons": reasons
    }
