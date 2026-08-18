import logging
from typing import Optional, List
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

import models
import core_models
from services.agent.tool_registry import register_tool
from services.shopping.search_service import execute_product_search
from services.shopping.comparison_service import compare_offers
from services.shopping.recommendation_service import generate_recommendation

logger = logging.getLogger("verinova.tools.shopping_tools")

# ============================================================
# TOOL 1: SEARCH PRODUCTS
# ============================================================

class SearchProductsInput(BaseModel):
    query: str = Field(..., description="The query string to search for (e.g. 'iPhone 15').")
    max_price: Optional[float] = Field(None, description="The maximum budget limit in INR.")
    providers: Optional[List[str]] = Field(None, description="List of providers to search (amazon, flipkart, meesho).")

@register_tool(
    name="search_products",
    description="Search products across configured providers (Amazon, Flipkart, Meesho) and cache results.",
    input_schema=SearchProductsInput
)
def search_products(
    query: str,
    max_price: Optional[float] = None,
    providers: Optional[List[str]] = None,
    db: Session = None,
    current_user: models.User = None
) -> dict:
    if not db or not current_user:
        raise RuntimeError("Missing database session or authenticated user identity.")

    res = execute_product_search(
        query=query,
        user_id=current_user.id,
        db=db,
        max_price=max_price,
        providers_list=providers
    )
    return res

# ============================================================
# TOOL 2: COMPARE PRODUCTS
# ============================================================

class CompareProductsInput(BaseModel):
    product_group_id: str = Field(..., description="The product search ID (database search_id) to run comparisons for.")

@register_tool(
    name="compare_products",
    description="Compare equivalent product variants belonging to a product search ID and generate a recommendation.",
    input_schema=CompareProductsInput
)
def compare_products(product_group_id: str, db: Session = None, current_user: models.User = None) -> dict:
    if not db:
        raise RuntimeError("Missing database session.")

    try:
        search_id = int(product_group_id)
    except ValueError:
        return {"success": False, "error": f"Invalid product search ID '{product_group_id}'."}

    offers = db.query(core_models.ProductOffer).filter(core_models.ProductOffer.search_id == search_id).all()
    if not offers:
        return {
            "success": False,
            "error": f"No product offers found to compare for search ID {search_id}."
        }

    offers_list = [
        {
            "provider": o.provider,
            "provider_product_id": o.provider_product_id,
            "title": o.title,
            "price": o.price,
            "currency": o.currency,
            "url": o.url,
            "availability": o.availability,
            "rating": o.rating,
            "review_count": o.review_count,
            "last_checked": o.last_checked.isoformat()
        }
        for o in offers
    ]

    comparisons = compare_offers(offers_list)
    comparison = comparisons[0] if comparisons else {}
    recommendation = generate_recommendation(comparison) if comparison else {}

    if comparison:
        # Check if record exists
        existing = db.query(core_models.ProductComparison).filter(core_models.ProductComparison.search_id == search_id).first()
        if not existing:
            comp_record = core_models.ProductComparison(
                search_id=search_id,
                product_group=comparison["product_group"],
                recommendation=recommendation
            )
            db.add(comp_record)
            db.commit()

    return {
        "success": True,
        "offers": comparison.get("offers", []),
        "comparison": comparison,
        "recommendation": recommendation
    }

# ============================================================
# TOOL 3: GET PRODUCT DETAILS
# ============================================================

class GetProductDetailsInput(BaseModel):
    provider: str = Field(..., description="The provider name (amazon, flipkart, meesho).")
    product_id: str = Field(..., description="The unique provider product identifier.")

@register_tool(
    name="get_product_details",
    description="Retrieve normalized details for a specific product offer.",
    input_schema=GetProductDetailsInput
)
def get_product_details(provider: str, product_id: str, db: Session = None) -> dict:
    if not db:
        raise RuntimeError("Missing database session.")

    offer = (
        db.query(core_models.ProductOffer)
        .filter(
            core_models.ProductOffer.provider == provider.lower(),
            core_models.ProductOffer.provider_product_id == product_id
        )
        .order_by(core_models.ProductOffer.last_checked.desc())
        .first()
    )
    if not offer:
        return {"success": False, "error": f"Product {product_id} from {provider} not found."}

    return {
        "success": True,
        "provider": offer.provider,
        "product_id": offer.provider_product_id,
        "title": offer.title,
        "price": offer.price,
        "currency": offer.currency,
        "url": offer.url,
        "rating": offer.rating,
        "availability": offer.availability
    }

# ============================================================
# TOOL 4: PRICE CHECK TOOL
# ============================================================

class CheckProductPriceInput(BaseModel):
    provider: str = Field(..., description="The provider name (amazon, flipkart, meesho).")
    product_id: str = Field(..., description="The unique provider product identifier.")

@register_tool(
    name="check_product_price",
    description="Retrieve current price, availability, and freshness check time for a product.",
    input_schema=CheckProductPriceInput
)
def check_product_price(provider: str, product_id: str, db: Session = None) -> dict:
    if not db:
        raise RuntimeError("Missing database session.")

    offer = (
        db.query(core_models.ProductOffer)
        .filter(
            core_models.ProductOffer.provider == provider.lower(),
            core_models.ProductOffer.provider_product_id == product_id
        )
        .order_by(core_models.ProductOffer.last_checked.desc())
        .first()
    )
    if not offer:
        return {"success": False, "error": f"Product {product_id} from {provider} not found."}

    return {
        "success": True,
        "price": offer.price,
        "availability": offer.availability,
        "last_checked": offer.last_checked.isoformat()
    }
