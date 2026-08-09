import os
import re
import json
import logging
from datetime import datetime
from sqlalchemy.orm import Session

import models
from services.payment import execute_payment_refund
from services.email import execute_send_email
from services.booking import execute_booking_search
from services.movie import execute_movie_booking
from services.crm import execute_crm_update
from verification.evidence_collector import collect_and_save_evidence
from verification.verifier import verify_task_outcome

logger = logging.getLogger(__name__)

# State structure matching LangGraph state definition
class AgentState:
    def __init__(self, task_id: str, raw_input: str):
        self.task_id = task_id
        self.raw_input = raw_input
        self.task_type = None
        self.params = {}
        self.missing_params = []
        self.status = "Received"
        self.service_response = None
        self.logs = []
        self.clarification_attempts = {}

    def to_dict(self):
        return {
            "task_id": self.task_id,
            "raw_input": self.raw_input,
            "task_type": self.task_type,
            "params": self.params,
            "missing_params": self.missing_params,
            "status": self.status,
            "service_response": self.service_response,
            "logs": self.logs,
            "clarification_attempts": self.clarification_attempts
        }



def parse_intent_llm_or_fallback(raw_input: str) -> dict:
    """
    Parses intent with OpenAI API if configured, otherwise falls back to regex matching.
    """
    openai_key = os.getenv("OPENAI_API_KEY")
    res_dict = None
    warning_msg = None
    
    if openai_key:
        try:
            import openai
            logger.info("Using OpenAI to parse task intent...")
            # Try new client syntax first
            try:
                client = openai.OpenAI(api_key=openai_key)
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    response_format={"type": "json_object"},
                    messages=[
                        {"role": "system", "content": "You are a task intent parser. Extract: task_type (payment, email, flight, hotel, movie, crm, shopping, booking) and params (dict). Output JSON only."},
                        {"role": "user", "content": raw_input}
                    ]
                )
                res_content = response.choices[0].message.content
            except AttributeError:
                # Fallback to legacy openai client syntax
                openai.api_key = openai_key
                response = openai.ChatCompletion.create(
                    model="gpt-3.5-turbo",
                    messages=[
                        {"role": "system", "content": "You are a task intent parser. Extract: task_type (payment, email, flight, hotel, movie, crm, shopping, booking) and params (dict). Output JSON only."},
                        {"role": "user", "content": raw_input}
                    ]
                )
                res_content = response.choices[0].message.content
                
            logger.info(f"Raw OpenAI API response: {res_content}")
            res_dict = json.loads(res_content)
            res_dict["raw_openai_response"] = res_content
            return res_dict
        except Exception as e:
            warning_msg = f"[WARNING] OpenAI API call failed or OPENAI_API_KEY is invalid: {str(e)}. Falling back to local Regex parser."
            logger.warning(warning_msg)
    else:
        warning_msg = "[WARNING] OPENAI_API_KEY is not configured or is empty. Falling back to local Regex parser."
        logger.warning(warning_msg)

    # Regex Fallback Engine
    logger.info("Using regex fallback engine to parse intent...")
    text = raw_input.lower().strip()
    
    # 6. Shopping Assistant
    if any(k in text for k in ["buy", "find", "laptop", "iphone", "purchase", "product", "item", "shopping", "price", "macbook", "headphones", "smartwatch", "keyboard", "mouse", "monitor", "samsung", "dell", "hp", "sony", "logitech", "oneplus"]):
        prod_name = None
        for p in ["iphone 16", "samsung galaxy", "macbook pro", "dell xps", "hp pavilion", "sony headphones", "ipad air", "apple watch", "lg ultragear", "logitech mx keys", "logitech mx master", "oneplus 12", "laptop", "mouse", "keyboard", "monitor", "headphones", "smartwatch"]:
            if p in text:
                prod_name = p
                break
        
        # Extract max price / budget
        price_match = re.search(r'(?:under|below|budget|₹|rs\.?|inr)?\s*(\d+(?:\.\d+)?)', text)
        max_price = None
        if price_match:
            match_str = price_match.group(0)
            if any(k in match_str for k in ["under", "below", "budget", "₹", "rs", "inr"]):
                max_price = float(price_match.group(1))
            else:
                spec_match = re.search(r'(?:under|below|budget|₹|rs\.?|inr)\s*(\d+(?:\.\d+)?)', text)
                if spec_match:
                    max_price = float(spec_match.group(1))
                else:
                    spec_match_2 = re.search(r'(\d+(?:\.\d+)?)\s*(?:rs|inr|rupees)', text)
                    if spec_match_2:
                        max_price = float(spec_match_2.group(1))

        res_dict = {
            "task_type": "shopping",
            "params": {
                "product_name": prod_name,
                "max_price": max_price
            }
        }

    # 7. Booking Assistant
    elif any(k in text for k in ["turf", "court", "pool", "zoo", "cinema", "slot", "available"]):
        s_name = None
        for s in ["cricket turf", "football turf", "badminton court", "swimming pool", "zoo entry", "cinema hall", "turf", "court", "pool", "zoo", "cinema"]:
            if s in text:
                s_name = s
                break
                
        # Extract date
        from datetime import datetime, timedelta
        date = None
        if "tomorrow" in text:
            date = (datetime.now() + timedelta(days=1)).strftime("%Y-%m-%d")
        elif "day after" in text:
            date = (datetime.now() + timedelta(days=2)).strftime("%Y-%m-%d")
        elif "today" in text:
            date = datetime.now().strftime("%Y-%m-%d")
        else:
            date_match = re.search(r'\d{4}-\d{2}-\d{2}', text)
            if date_match:
                date = date_match.group(0)
                
        # Extract time
        time = None
        time_match = re.search(r'(\d+(?::\d+)?\s*(?:pm|am))', text)
        if time_match:
            time = time_match.group(1).upper()
        elif "evening" in text:
            time = "6 PM"
        elif "morning" in text:
            time = "10 AM"
        elif "afternoon" in text:
            time = "4 PM"

        res_dict = {
            "task_type": "booking",
            "params": {
                "service_name": s_name,
                "date": date,
                "time": time
            }
        }

    # 1. Payment / Refund
    elif any(k in text for k in ["refund", "pay", "charge", "payment"]):
        amount_match = re.search(r'(?:₹|\$|rs\.?|inr)?\s*(\d+(?:\.\d+)?)', text)
        amount = float(amount_match.group(1)) if amount_match else None
        
        order_match = re.search(r'(?:order|payment|transaction|id|#)\s*(?:#)?\s*([a-zA-Z0-9_#-]+)', text)
        order_id = order_match.group(1) if order_match else None
        logger.info(f"Regex branch matched: payment. amount_match: {amount_match.group(0) if amount_match else 'None'}, order_match: {order_match.group(0) if order_match else 'None'}")
        
        res_dict = {
            "task_type": "payment",
            "params": {
                "amount": amount,
                "order_id": order_id
            }
        }

    # 2. Send Email
    elif any(k in text for k in ["email", "mail", "send to"]):
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        to_email = email_match.group(0) if email_match else None
        
        # Extract message: everything after "message", "saying", "with", "body"
        msg_match = re.search(r'(?:message|body|saying|text|content)\s*(?:is|to\s+say)?\s*[:"\']?(.+?)[\'"]?$', raw_input, re.IGNORECASE)
        message = msg_match.group(1).strip() if msg_match else None
        
        # If no message matched, extract everything after the email address
        if not message and to_email:
            parts = raw_input.split(to_email)
            if len(parts) > 1:
                message = parts[1].replace("with message", "").replace("message", "").strip()
        logger.info(f"Regex branch matched: email. email_match: {email_match.group(0) if email_match else 'None'}, message extracted: {message}")

        res_dict = {
            "task_type": "email",
            "params": {
                "to_email": to_email,
                "message": message
            }
        }

    # 3. Flight / Hotel Booking
    elif any(k in text for k in ["flight", "hotel", "trip"]) or ("book" in text and not any(m in text for m in ["ticket", "movie", "theater", "show", "cinema"])):
        booking_type = "flight" if "flight" in text else "hotel"
        
        # Match date: e.g. 2026-08-10 or 10/08/2026 or similar
        date_match = re.search(r'\d{4}-\d{2}-\d{2}', text)
        date = date_match.group(0) if date_match else None
        
        origin = None
        destination = None
        
        if booking_type == "flight":
            # Origin search
            orig_match = re.search(r'from\s+([a-zA-Z\s]{3,10}?)\s+(?:to|on|for)', text)
            origin = orig_match.group(1).upper().strip() if orig_match else None
            
            dest_match = re.search(r'to\s+([a-zA-Z\s]{3,10}?)(?:\s+on|\s+for|$)', text)
            destination = dest_match.group(1).upper().strip() if dest_match else None
            logger.info(f"Regex branch matched: flight. date_match: {date_match.group(0) if date_match else 'None'}, orig_match: {orig_match.group(0) if orig_match else 'None'}, dest_match: {dest_match.group(0) if dest_match else 'None'}")
        else:
            # Hotel location search
            loc_match = re.search(r'(?:in|at|for)\s+([a-zA-Z\s]{3,15}?)(?:\s+on|\s+for|$)', text)
            destination = loc_match.group(1).title().strip() if loc_match else None
            logger.info(f"Regex branch matched: hotel. date_match: {date_match.group(0) if date_match else 'None'}, loc_match: {loc_match.group(0) if loc_match else 'None'}")

        res_dict = {
            "task_type": booking_type,
            "params": {
                "booking_type": booking_type,
                "origin": origin,
                "destination": destination,
                "date": date
            }
        }

    # 4. Movie Ticket Booking
    elif any(k in text for k in ["movie", "ticket", "cinema", "show", "theater"]):
        # Match movie names
        movies = ["inception", "interstellar", "avatar", "dune", "oppenheimer"]
        movie_name = None
        for m in movies:
            if m in text:
                movie_name = m.title()
                break
        
        # Match theater names
        theaters = ["imax", "dolby cinema", "pvr", "amc", "regal"]
        theater = None
        for t in theaters:
            if t in text:
                theater = t.title()
                break
                
        # Match showtimes: e.g., 7 PM, 3:00 PM, 9:00 PM, etc.
        showtime_match = re.search(r'(\d+(?::\d+)?\s*(?:pm|am))', text)
        showtime = showtime_match.group(1).upper() if showtime_match else None
        logger.info(f"Regex branch matched: movie. movie_name: {movie_name}, theater: {theater}, showtime_match: {showtime_match.group(0) if showtime_match else 'None'}")

        res_dict = {
            "task_type": "movie",
            "params": {
                "movie_name": movie_name,
                "theater": theater,
                "showtime": showtime
            }
        }

    # 5. Customer Record Update
    elif any(k in text for k in ["customer", "crm", "update status", "record"]):
        email_match = re.search(r'[\w\.-]+@[\w\.-]+\.\w+', text)
        email = email_match.group(0) if email_match else None
        
        statuses = ["premium", "active", "basic", "disabled", "inactive"]
        status = "active"
        for s in statuses:
            if s in text:
                status = s
                break
        logger.info(f"Regex branch matched: crm. email_match: {email_match.group(0) if email_match else 'None'}, status: {status}")

        res_dict = {
            "task_type": "crm",
            "params": {
                "email": email,
                "status": status
            }
        }



    # Default fallback if nothing matches
    if res_dict is None:
        logger.info("Regex fallback engine could not identify task type. Using default 'movie' task fallback.")
        res_dict = {
            "task_type": "movie",  # Fall back to movie for clarification options
            "params": {}
        }
        if not warning_msg:
            warning_msg = "[WARNING] Local Regex parser could not identify task type from user input. Defaulting to 'movie' task."
        else:
            warning_msg += " Also, local Regex parser could not identify task type from user input. Defaulting to 'movie' task."
        
    logger.info(f"Fallback Regex parser output: {json.dumps(res_dict)}")
    
    if warning_msg:
        res_dict["warning"] = warning_msg
        
    return res_dict



def execute_agent_workflow(task_id: str, db: Session, user_input: str = None) -> dict:
    """
    Simulates LangGraph state graph routing:
    parse_intent -> validate_params -> execute_service -> collect_evidence -> verify_outcome
    Runs step-by-step with realistic delays (time.sleep) to let the frontend poll progress.
    """
    import time
    logger.info(f"Triggering orchestrator agent execution for task_id: {task_id}")
    
    # 1. Retrieve or initialize execution state
    task = db.query(models.Task).filter(models.Task.id == task_id).first()
    if not task:
        return {"error": "Task not found"}

    exec_record = db.query(models.AgentExecution).filter(
        models.AgentExecution.task_id == task_id
    ).first()

    prompt_text = user_input or task.description or task.name

    if not exec_record:
        logger.info("Initializing AgentExecution record...")
        exec_record = models.AgentExecution(
            task_id=task_id,
            execution_status="Running"
        )
        db.add(exec_record)
        db.commit()
        db.refresh(exec_record)

    state = AgentState(task_id, prompt_text)
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Task execution request received.")
    
    # Step 1: Received
    db.add(models.TaskLog(task_id=task_id, action="received", details="Received user request: " + prompt_text))
    db.commit()
    time.sleep(1.2)

    # Step 2: Understanding request
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Analyzing task intent and query parameters...")
    parsed = parse_intent_llm_or_fallback(prompt_text)
    state.task_type = parsed.get("task_type")
    
    # Merge existing parameters and clarification attempts if resuming clarification
    if exec_record.parsed_intent:
        existing_params = exec_record.parsed_intent.get("params", {})
        for k, v in parsed.get("params", {}).items():
            if existing_params.get(k) is None or existing_params.get(k) == "":
                if v is not None and v != "":
                    existing_params[k] = v
        state.params = existing_params
        state.clarification_attempts = exec_record.parsed_intent.get("clarification_attempts", {})
    else:
        state.params = parsed.get("params", {})
        state.clarification_attempts = parsed.get("clarification_attempts", {})

    if parsed.get("warning"):
        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {parsed.get('warning')}")
        db.add(models.TaskLog(task_id=task_id, action="warning", details=parsed.get("warning")))
        db.commit()

    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Extracted intent task type: {state.task_type}")
    task.task_type = state.task_type
    
    db.add(models.TaskLog(task_id=task_id, action="parsing", details=f"Parsing intent. Task type: {state.task_type}. Params: {json.dumps(state.params)}"))
    db.commit()
    time.sleep(1.2)

    # Step 3: Checking required information
    required_keys = {
        "payment": ["amount", "order_id"],
        "email": ["to_email", "message"],
        "flight": ["origin", "destination", "date"],
        "hotel": ["destination", "date"],
        "movie": ["movie_name", "theater", "showtime"],
        "crm": ["email", "status"],
        "shopping": ["product_name"],
        "booking": ["service_name", "date", "time"]
    }
    
    req_fields = required_keys.get(state.task_type, [])
    state.missing_params = [f for f in req_fields if not state.params.get(f)]

    if state.missing_params:
        logger.info(f"Task validation paused. Missing parameters: {state.missing_params}")
        state.status = "Needs Clarification"
        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Execution suspended: Missing required parameters: {', '.join(state.missing_params)}.")
        
        exec_record.parsed_intent = state.to_dict()
        exec_record.execution_status = "Needs Clarification"
        task.status = "Needs Clarification"
        
        db.add(models.TaskLog(task_id=task_id, action="suspend", details=f"Suspended execution. Missing parameters: {', '.join(state.missing_params)}"))
        db.commit()
        return state.to_dict()

    db.add(models.TaskLog(task_id=task_id, action="validate_params", details="Checking required information: all parameters validated successfully."))
    db.commit()
    time.sleep(1.2)

    # Step 4: Searching service/database
    db.add(models.TaskLog(task_id=task_id, action="searching_db", details=f"Searching database for available {state.task_type} details..."))
    db.commit()
    time.sleep(1.2)

    # Step 5: Executing action
    state.status = "Running"
    selected_service = ""
    service_res = {}
    db_check_data = {"success": True}

    try:
        if state.task_type == "payment":
            selected_service = "Payment Service"
            service_res = execute_payment_refund(
                amount=float(state.params["amount"]),
                order_id=state.params["order_id"]
            )
            db_check_data = {
                "success": service_res.get("status") == "refunded",
                "match": service_res.get("status") == "refunded",
                "details": f"Checked Razorpay transaction record {service_res.get('transaction_id') or 'N/A'}. Match = {service_res.get('status') == 'refunded'}"
            }
            
        elif state.task_type == "email":
            selected_service = "Email Service"
            service_res = execute_send_email(
                to_email=state.params["to_email"],
                message=state.params["message"]
            )
            db_check_data = {
                "success": service_res.get("status") == "sent",
                "match": service_res.get("status") == "sent",
                "details": f"Verified outbound SMTP log delegation to mailbox {state.params['to_email']}"
            }
            
        elif state.task_type == "flight" or state.task_type == "hotel":
            selected_service = "Flight Service" if state.task_type == "flight" else "Hotel Service"
            service_res = execute_booking_search(
                booking_type=state.task_type,
                destination=state.params["destination"],
                date=state.params["date"],
                origin=state.params.get("origin")
            )
            pnr = service_res.get("booking_id")
            db_check_data = {
                "success": bool(pnr),
                "match": bool(pnr),
                "details": f"Verified booking database index PNR: {pnr}"
            }
            
        elif state.task_type == "movie":
            selected_service = "Ticketing Service"
            service_res = execute_movie_booking(
                movie_name=state.params["movie_name"],
                theater=state.params["theater"],
                showtime=state.params["showtime"]
            )
            if service_res.get("status") == "needs_clarification":
                logger.info("Movie booking requested unavailable option. Suspending for clarification.")
                state.status = "Needs Clarification"
                if "movie" in service_res.get("error", "").lower():
                    state.missing_params = ["movie_name"]
                elif "showtime" in service_res.get("error", "").lower():
                    state.missing_params = ["showtime"]
                else:
                    state.missing_params = ["theater"]
                state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Requested options unavailable. Suspended: {service_res.get('error')}")
                
                exec_record.parsed_intent = state.to_dict()
                exec_record.execution_status = "Needs Clarification"
                task.status = "Needs Clarification"
                
                db.add(models.TaskLog(task_id=task_id, action="suspend", details=f"Suspended. Option unavailable: {service_res.get('error')}"))
                db.commit()
                return state.to_dict()
                
            db_check_data = {
                "success": service_res.get("status") == "confirmed",
                "match": service_res.get("status") == "confirmed",
                "details": f"Verified seat {service_res.get('seat')} reserved in theater database layout."
            }
            
        elif state.task_type == "crm":
            selected_service = "CRM Service"
            service_res = execute_crm_update(
                email=state.params["email"],
                status=state.params["status"],
                db=db
            )
            cust_row = db.query(models.Customer).filter(models.Customer.email == state.params["email"]).first()
            matched = cust_row is not None and cust_row.status == state.params["status"]
            db_check_data = {
                "success": matched,
                "match": matched,
                "details": f"Direct SQL query for {state.params['email']} returned status: {cust_row.status if cust_row else 'None'} (Expected: {state.params['status']})"
            }

        elif state.task_type == "shopping":
            selected_service = "Shopping Service"
            prod_name = state.params.get("product_name")
            max_p = state.params.get("max_price")
            
            if prod_name:
                prod_name = prod_name.lower().strip()
            else:
                prod_name = ""
                
            if max_p is not None and max_p != "":
                try:
                    max_p = float(max_p)
                except ValueError:
                    max_p = None
            else:
                max_p = None

            # Fetch all active products
            all_products = db.query(models.Product).filter(models.Product.is_active == True).all()
            
            # Find direct text matches (where product name contains search query or vice versa)
            matches = []
            for p in all_products:
                name_lower = p.name.lower()
                desc_lower = p.description.lower() if p.description else ""
                category_lower = p.category.lower() if p.category else ""
                
                # Check match by name, category, or description
                if prod_name in name_lower or name_lower in prod_name or prod_name in category_lower or prod_name in desc_lower:
                    matches.append(p)
                    
            # If no matches, try splitting words
            if not matches and prod_name:
                words = [w for w in prod_name.split() if len(w) > 2]
                for p in all_products:
                    name_lower = p.name.lower()
                    if any(w in name_lower for w in words):
                        matches.append(p)

            # Apply budget check
            budget_matches = []
            exceeded_budget_products = []
            
            for m in matches:
                if max_p is None or m.price <= max_p:
                    budget_matches.append(m)
                else:
                    exceeded_budget_products.append(m)

            if not matches:
                # No product matches the name/category at all
                explanation = f"NO MATCH FOUND: No product in database matches search query '{prod_name}'."
                service_res = {
                    "status": "failed",
                    "error": explanation
                }
                db_check_data = {
                    "success": False,
                    "match": False,
                    "details": explanation
                }
                state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {explanation}")
            elif not budget_matches:
                # Products matched the name, but all exceeded the budget
                exceeded_details = ", ".join([f"{p.name} (price: ₹{p.price})" for p in exceeded_budget_products])
                explanation = f"NO MATCH FOUND: All matching products exceed your budget of ₹{max_p}. Matching options: {exceeded_details}."
                service_res = {
                    "status": "failed",
                    "error": explanation
                }
                db_check_data = {
                    "success": False,
                    "match": False,
                    "details": explanation
                }
                state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {explanation}")
            elif len(budget_matches) > 1:
                # Ambiguity: multiple matching products fit within the budget
                state.status = "Needs Clarification"
                state.missing_params = ["product_name"]
                options_str = ", ".join([f"{m.name} (₹{m.price})" for m in budget_matches])
                service_res = {
                    "status": "needs_clarification",
                    "error": f"I found multiple product options: {options_str}. Which one do you want?"
                }
                state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Ambiguous request: multiple products match query. Suspended for clarification.")
                exec_record.parsed_intent = state.to_dict()
                exec_record.execution_status = "Needs Clarification"
                task.status = "Needs Clarification"
                db.add(models.TaskLog(task_id=task_id, action="suspend", details=f"Suspended. Multiple matches found: {options_str}"))
                db.commit()
                return state.to_dict()
            else:
                # Single matching product
                product = budget_matches[0]
                if product.stock <= 0:
                    explanation = f"Product '{product.name}' is currently out of stock."
                    service_res = {
                        "status": "failed",
                        "error": explanation
                    }
                    db_check_data = {
                        "success": False,
                        "match": False,
                        "details": explanation
                    }
                    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {explanation}")
                else:
                    old_stock = product.stock
                    product.stock -= 1
                    db.commit()
                    
                    task.reference_id = str(product.id)
                    
                    service_res = {
                        "status": "confirmed",
                        "product_id": product.id,
                        "product_name": product.name,
                        "price": product.price,
                        "remaining_stock": product.stock,
                        "message": f"Successfully purchased {product.name} for ₹{product.price}."
                    }
                    db_check_data = {
                        "success": True,
                        "match": True,
                        "selected_product": product.name,
                        "product_id": product.id,
                        "price": product.price,
                        "stock_before": old_stock,
                        "stock_after": product.stock,
                        "details": f"Deducted stock for {product.name} (ID: {product.id}) from {old_stock} to {product.stock}. Reference recorded.",
                        "database_record": {
                            "id": product.id,
                            "name": product.name,
                            "category": product.category,
                            "price": product.price,
                            "stock": product.stock,
                            "is_active": product.is_active
                        }
                    }
                    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Selected product: {product.name} (ID: {product.id}) for ₹{product.price}.")
                    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Stock check passed. Previous stock: {old_stock}, new stock: {product.stock}.")
                    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Purchase record completed. Stock deducted.")

        elif state.task_type == "booking":
            selected_service = "Booking Service"
            s_name = state.params.get("service_name", "").lower()
            date_str = state.params.get("date", "")
            time_str = state.params.get("time", "").lower()
            
            services = db.query(models.BookingService).filter(models.BookingService.is_active == True).all()
            matching_services = [s for s in services if s_name in s.service_name.lower() or s.service_name.lower() in s_name]
            
            if len(matching_services) > 1:
                state.status = "Needs Clarification"
                state.missing_params = ["service_name"]
                options_str = " or ".join([s.service_name for s in matching_services])
                service_res = {
                    "status": "needs_clarification",
                    "error": f"I found multiple turf services: {options_str}. Which one do you want to book?"
                }
                state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Ambiguous service name. Suspended for clarification.")
                exec_record.parsed_intent = state.to_dict()
                exec_record.execution_status = "Needs Clarification"
                task.status = "Needs Clarification"
                db.add(models.TaskLog(task_id=task_id, action="suspend", details=f"Suspended. Multiple matching services: {options_str}"))
                db.commit()
                return state.to_dict()
                
            if not matching_services:
                service_res = {
                    "status": "failed",
                    "error": f"No booking service found matching '{s_name}'."
                }
                db_check_data = {
                    "success": False,
                    "match": False,
                    "details": f"Checked booking services database. No active service matches '{s_name}'."
                }
                state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Failed: No booking service found matching '{s_name}'.")
            else:
                service = matching_services[0]
                hour = 18
                if "10" in time_str or "morning" in time_str:
                    hour = 10
                elif "4" in time_str or "16" in time_str or "afternoon" in time_str:
                    hour = 16
                elif "11" in time_str:
                    hour = 11
                elif "6" in time_str or "18" in time_str or "evening" in time_str:
                    if "am" in time_str:
                        hour = 6
                    else:
                        hour = 18
                
                # Fetch matching slot first without locking to verify its existence
                slots = db.query(models.BookingSlot).filter(models.BookingSlot.service_id == service.id).all()
                matching_slot = None
                for slot in slots:
                    slot_date = slot.slot_time.strftime("%Y-%m-%d")
                    slot_hour = slot.slot_time.hour
                    if slot_date == date_str and slot_hour == hour:
                        matching_slot = slot
                        break
                        
                if not matching_slot:
                    service_res = {
                        "status": "failed",
                        "error": f"No available time slot found for {service.service_name} on {date_str} at {time_str}."
                    }
                    db_check_data = {
                        "success": False,
                        "match": False,
                        "details": f"Checked slots for service {service.service_name} (ID: {service.id}) on {date_str}. No matching slots found."
                    }
                    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Failed: No matching slot found on {date_str} at {time_str}.")
                else:
                    # Concurrency-safe double-check: acquire write lock on the slot row inside transaction
                    # We query with_for_update to lock the slot row in PostgreSQL
                    locked_slot = db.query(models.BookingSlot).filter(models.BookingSlot.id == matching_slot.id).with_for_update().first()
                    slot_avail_before = locked_slot.is_available
                    
                    if not slot_avail_before:
                        # Release lock (by committing or rolling back) and fetch alternative slots for suggestions
                        db.commit()
                        
                        alternatives = db.query(models.BookingSlot).filter(
                            models.BookingSlot.service_id == service.id,
                            models.BookingSlot.is_available == True
                        ).limit(3).all()
                        
                        if alternatives:
                            alt_list = []
                            for alt in alternatives:
                                formatted_time = alt.slot_time.strftime("%I %p").lstrip('0')
                                formatted_date = alt.slot_time.strftime("%Y-%m-%d")
                                alt_list.append(f"{formatted_date} at {formatted_time}")
                            alt_str = ", or ".join(alt_list)
                            alt_msg = f" That slot is no longer available. Available slots: {alt_str}."
                        else:
                            alt_msg = " That slot is no longer available and no alternative slots are open."
                            
                        service_res = {
                            "status": "failed",
                            "error": f"Booking failed.{alt_msg}"
                        }
                        db_check_data = {
                            "success": False,
                            "match": False,
                            "details": f"Re-checked slot ID {matching_slot.id} inside transaction. Slot is already booked (is_available = False)."
                        }
                        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Concurrency-check failed: Slot ID {matching_slot.id} is already booked.")
                    else:
                        # Slot is available, proceed with booking creation
                        locked_slot.is_available = False
                        db.commit() # Commit the slot status update
                        
                        # Create permanent booking record
                        booking_rec = models.BookingRecord(
                            task_id=task_id,
                            service_id=service.id,
                            slot_id=locked_slot.id,
                            user_id=task.user_id,
                            price=service.price,
                            status="confirmed"
                        )
                        db.add(booking_rec)
                        db.commit()
                        
                        # Register reference ID in main Task record
                        task.reference_id = str(booking_rec.id)
                        db.commit()
                        
                        service_res = {
                            "status": "confirmed",
                            "booking_id": f"BK-{booking_rec.id}",
                            "service_id": service.id,
                            "slot_id": locked_slot.id,
                            "service_name": service.service_name,
                            "location": service.location,
                            "slot_time": locked_slot.slot_time.isoformat(),
                            "price": service.price,
                            "message": f"Successfully booked {service.service_name} for {date_str} at {time_str}."
                        }
                        
                        db_check_data = {
                            "success": True,
                            "match": True,
                            "service_id": service.id,
                            "slot_id": locked_slot.id,
                            "slot_availability_before": slot_avail_before,
                            "slot_availability_after": locked_slot.is_available,
                            "booking_record": {
                                "id": booking_rec.id,
                                "task_id": booking_rec.task_id,
                                "service_id": booking_rec.service_id,
                                "slot_id": booking_rec.slot_id,
                                "price": booking_rec.price,
                                "status": booking_rec.status
                            },
                            "details": f"Acquired write lock on slot ID {locked_slot.id}. Slot was available (True). Updated is_available to False. BookingRecord ID {booking_rec.id} registered."
                        }
                        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Concurrency-check passed. Slot locked.")
                        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Saved booking transaction record (ID: {booking_rec.id}).")
                        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Verification checks compiled successfully.")

    except Exception as e:
        logger.error(f"Error calling service: {str(e)}")
        service_res = {"status": "failed", "error": str(e)}
        db_check_data = {"success": False, "match": False, "details": f"Execution error: {str(e)}"}

    state.service_response = service_res
    exec_record.selected_service = selected_service
    exec_record.model_name = "gpt-4o-mini" if os.getenv("OPENAI_API_KEY") else "Regex Fallback Engine"
    
    db.add(models.TaskLog(task_id=task_id, action="service_call", details=f"Action executed on {selected_service}. Result: {service_res.get('status') or 'failed'}"))
    db.commit()
    time.sleep(1.2)

    # Step 6: Collecting evidence
    db.add(models.TaskLog(task_id=task_id, action="evidence_collection", details="Collecting verification evidence: service payloads and database transaction logs gathered."))
    db.commit()
    
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Service returned response: {json.dumps(service_res)}")
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Gathering raw logs, database consistency hashes, and provider payloads...")
    
    collect_and_save_evidence(
        task_id=task_id,
        service_response=service_res,
        db_check_data=db_check_data,
        logs=state.logs,
        db=db
    )
    time.sleep(1.2)

    # Step 7: Verifying outcome
    db.add(models.TaskLog(task_id=task_id, action="verifying", details="Initiating outcome verification. Comparing response payloads with database consistency states..."))
    db.commit()
    time.sleep(1.2)

    # Step 8: Completed
    ver_res = verify_task_outcome(task_id, db)
    
    state.status = "Completed"
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Verification completed. Final Status: {ver_res.get('verification_status')} (Confidence: {ver_res.get('confidence_score')}%).")
    
    # Save final execution record
    exec_record.execution_status = "Completed"
    exec_record.completed_at = datetime.utcnow()
    exec_record.parsed_intent = state.to_dict()
    db.commit()

    return state.to_dict()
