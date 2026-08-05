import os
import secrets
import logging
import urllib.request
import urllib.parse
import json

logger = logging.getLogger(__name__)

def execute_booking_search(booking_type: str, destination: str, date: str, origin: str = None) -> dict:
    """
    Executes flight/hotel searches using Amadeus APIs or simulated mocks.
    Display Name in UI: Flight Service / Hotel Service
    """
    client_id = os.getenv("AMADEUS_CLIENT_ID")
    client_secret = os.getenv("AMADEUS_CLIENT_SECRET")
    
    if client_id and client_secret:
        try:
            logger.info("Attempting to authenticate with Amadeus API...")
            # Authenticate to get OAuth2 token
            auth_url = "https://test.api.amadeus.com/v1/security/oauth2/token"
            auth_data = urllib.parse.urlencode({
                "grant_type": "client_credentials",
                "client_id": client_id,
                "client_secret": client_secret
            }).encode("utf-8")
            
            req = urllib.request.Request(auth_url, data=auth_data, headers={"Content-Type": "application/x-www-form-urlencoded"}, method="POST")
            with urllib.request.urlopen(req, timeout=10) as response:
                auth_res = json.loads(response.read().decode("utf-8"))
                access_token = auth_res.get("access_token")
            
            if access_token:
                logger.info("Amadeus token acquired. Executing search query...")
                headers = {"Authorization": f"Bearer {access_token}"}
                
                if booking_type == "flight" and origin:
                    # Amadeus Flight Offers Search
                    url = f"https://test.api.amadeus.com/v2/shopping/flight-offers?originLocationCode={origin}&destinationLocationCode={destination}&departureDate={date}&adults=1&max=2"
                else:
                    # Amadeus Hotel Search by City (using city code)
                    url = f"https://test.api.amadeus.com/v1/reference-data/locations/hotels/by-city?cityCode={destination}&ratings=4,5"
                
                search_req = urllib.request.Request(url, headers=headers, method="GET")
                with urllib.request.urlopen(search_req, timeout=10) as search_res:
                    api_data = json.loads(search_res.read().decode("utf-8"))
                    
                # Simulate booking confirmation based on the retrieved real API data
                pnr = f"PNR_{secrets.token_hex(3).upper()}"
                return {
                    "status": "confirmed",
                    "service": "Amadeus Sandbox API",
                    "booking_id": pnr,
                    "booking_type": booking_type,
                    "search_results": api_data.get("data", [])[:3],
                    "origin": origin,
                    "destination": destination,
                    "date": date,
                    "message": f"Real search completed, simulated booking confirmed under PNR: {pnr}"
                }
        except Exception as e:
            logger.error(f"Amadeus API integration failed: {str(e)}. Falling back to simulation.")

    # Simulation fallback
    logger.info("Running simulated flight/hotel booking...")
    pnr = f"PNR_{secrets.token_hex(3).upper()}"
    
    if booking_type == "flight":
        results = [
            {
                "airline": "Indigo Airlines" if "IN" in (origin or "") else "Delta Air Lines",
                "flight_number": f"DL-{secrets.randbelow(900) + 100}",
                "departure": f"{origin or 'NYC'} 08:30 AM",
                "arrival": f"{destination} 11:45 AM",
                "price": "₹12,450" if "IN" in (origin or "") else "$350"
            }
        ]
        service_name = "Flight Service"
    else:
        results = [
            {
                "hotel_name": f"Grand Plaza Resort {destination}",
                "rating": "4.5 Stars",
                "room_type": "Deluxe King Bed",
                "price": "$180/night"
            }
        ]
        service_name = "Hotel Service"

    return {
        "status": "confirmed",
        "service": f"{service_name} (Simulated)",
        "booking_id": pnr,
        "booking_type": booking_type,
        "search_results": results,
        "origin": origin,
        "destination": destination,
        "date": date,
        "message": f"Booking successfully confirmed with PNR {pnr}."
    }
