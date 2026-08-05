import logging
import secrets

logger = logging.getLogger(__name__)

# Hardcoded Ticketing Dataset
VALID_MOVIES = ["inception", "interstellar", "avatar", "dune", "oppenheimer"]
VALID_THEATERS = ["imax", "dolby cinema", "pvr", "amc", "regal"]
VALID_SHOWTIMES = ["3:00 pm", "6:00 pm", "9:00 pm", "7:00 pm", "8:00 pm"]

def execute_movie_booking(movie_name: str, theater: str, showtime: str) -> dict:
    """
    Simulates booking a movie ticket using a hardcoded dataset.
    Display Name in UI: Ticketing Service
    """
    logger.info(f"Processing movie ticket booking: {movie_name} at {theater} at {showtime}...")
    
    m_clean = str(movie_name).lower().strip()
    t_clean = str(theater).lower().strip()
    s_clean = str(showtime).lower().strip()

    # If parameters match valid lists
    if m_clean not in VALID_MOVIES or t_clean not in VALID_THEATERS:
        logger.warning(f"Movie or Theater not in dataset: movie={movie_name}, theater={theater}")
        return {
            "status": "needs_clarification",
            "service": "Ticketing Service",
            "error": f"The requested movie '{movie_name}' or theater '{theater}' is not available.",
            "options": {
                "movies": [m.title() for m in VALID_MOVIES],
                "theaters": [t.title() for t in VALID_THEATERS],
                "showtimes": VALID_SHOWTIMES
            },
            "message": "Please choose an available movie and theater from the options."
        }

    if s_clean not in VALID_SHOWTIMES:
        logger.warning(f"Showtime '{showtime}' not in dataset")
        return {
            "status": "needs_clarification",
            "service": "Ticketing Service",
            "error": f"The showtime '{showtime}' is not available.",
            "options": {
                "showtimes": VALID_SHOWTIMES
            },
            "message": f"Please select a valid showtime from: {', '.join(VALID_SHOWTIMES)}."
        }

    # Simulate success or rare failure (sold out)
    if "sold out" in m_clean or "sold out" in t_clean:
        return {
            "status": "not_available",
            "service": "Ticketing Service",
            "movie": movie_name.title(),
            "theater": theater.title(),
            "showtime": showtime,
            "error": "This show is fully booked / sold out."
        }

    ticket_id = f"TKT-{secrets.randbelow(900000) + 100000}"
    seat = f"Row {chr(secrets.randbelow(6) + 65)}-{secrets.randbelow(15) + 1}"
    
    return {
        "status": "confirmed",
        "service": "Ticketing Service",
        "movie": movie_name.title(),
        "theater": theater.title(),
        "showtime": showtime,
        "ticket_id": ticket_id,
        "seat": seat,
        "price": "₹350" if "pvr" in t_clean else "$16.50",
        "message": f"Ticket successfully booked. Seat: {seat}. Ticket ID: {ticket_id}."
    }
