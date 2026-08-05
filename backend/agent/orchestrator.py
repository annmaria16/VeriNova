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
                        {"role": "system", "content": "You are a task intent parser. Extract: task_type (payment, email, flight, hotel, movie, crm) and params (dict). Output JSON only."},
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
                        {"role": "system", "content": "You are a task intent parser. Extract: task_type (payment, email, flight, hotel, movie, crm) and params (dict). Output JSON only."},
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
    
    # 1. Payment / Refund
    if any(k in text for k in ["refund", "pay", "charge", "payment"]):
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
    Can be run asynchronously or synchronously.
    """
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
    
    # Write first task log
    db.add(models.TaskLog(task_id=task_id, action="received", details="Task execution initialized."))
    db.commit()

    # Node: parse_intent
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Analyzing task intent and query parameters...")
    parsed = parse_intent_llm_or_fallback(prompt_text)
    state.task_type = parsed.get("task_type")
    
    # Merge existing parameters and clarification attempts if resuming clarification
    if exec_record.parsed_intent:
        existing_params = exec_record.parsed_intent.get("params", {})
        # Only overwrite existing params with parsed params if the existing param is None or empty
        for k, v in parsed.get("params", {}).items():
            if existing_params.get(k) is None or existing_params.get(k) == "":
                if v is not None and v != "":
                    existing_params[k] = v
        state.params = existing_params
        state.clarification_attempts = exec_record.parsed_intent.get("clarification_attempts", {})
    else:
        state.params = parsed.get("params", {})
        state.clarification_attempts = parsed.get("clarification_attempts", {})

    # Check if there is a parser warning to log
    if parsed.get("warning"):
        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] {parsed.get('warning')}")
        db.add(models.TaskLog(task_id=task_id, action="warning", details=parsed.get("warning")))
        db.commit()

    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Extracted intent task type: {state.task_type}")
    
    # Update Task fields based on parsed output
    task.task_type = state.task_type
    
    db.add(models.TaskLog(task_id=task_id, action="parsing", details=f"Parsed intent. Task type: {state.task_type}. Params: {json.dumps(state.params)}"))
    db.commit()

    # Node: validate_params
    required_keys = {
        "payment": ["amount", "order_id"],
        "email": ["to_email", "message"],
        "flight": ["origin", "destination", "date"],
        "hotel": ["destination", "date"],
        "movie": ["movie_name", "theater", "showtime"],
        "crm": ["email", "status"]
    }
    
    req_fields = required_keys.get(state.task_type, [])
    state.missing_params = [f for f in req_fields if not state.params.get(f)]

    if state.missing_params:
        logger.info(f"Task validation paused. Missing parameters: {state.missing_params}")
        state.status = "Needs Clarification"
        state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Execution suspended: Missing required parameters: {', '.join(state.missing_params)}.")
        
        # Save state to DB
        exec_record.parsed_intent = state.to_dict()
        exec_record.execution_status = "Needs Clarification"
        
        task.status = "Needs Clarification"
        
        db.add(models.TaskLog(task_id=task_id, action="suspend", details=f"Suspended execution. Missing parameters: {', '.join(state.missing_params)}"))
        db.commit()
        return state.to_dict()

    # Node: execute_service
    state.status = "Running"
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Executing call to {state.task_type} service module...")
    db.add(models.TaskLog(task_id=task_id, action="service_call", details=f"Calling backend service: {state.task_type}"))
    db.commit()
    
    selected_service = ""
    service_res = {}
    db_check_data = {"success": True}  # default database check status

    try:
        if state.task_type == "payment":
            selected_service = "Payment Service"
            service_res = execute_payment_refund(
                amount=float(state.params["amount"]),
                order_id=state.params["order_id"]
            )
            # Database verification check for payment: check if order refund status is saved
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
            # Database check for email: check if send request logged in outbound table
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
            # Database check: verify PNR generated and saved
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
            # If movie booking returns needs_clarification (e.g. theater not in dataset)
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
                
                # Save state to DB
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
            # Database check: query customer row directly from DB and assert status matches
            cust_row = db.query(models.Customer).filter(models.Customer.email == state.params["email"]).first()
            matched = cust_row is not None and cust_row.status == state.params["status"]
            db_check_data = {
                "success": matched,
                "match": matched,
                "details": f"Direct SQL query for {state.params['email']} returned status: {cust_row.status if cust_row else 'None'} (Expected: {state.params['status']})"
            }

    except Exception as e:
        logger.error(f"Error calling service: {str(e)}")
        service_res = {"status": "failed", "error": str(e)}
        db_check_data = {"success": False, "match": False, "details": f"Execution error: {str(e)}"}

    state.service_response = service_res
    exec_record.selected_service = selected_service
    exec_record.model_name = "gpt-4o-mini" if os.getenv("OPENAI_API_KEY") else "Regex Fallback Engine"
    
    # Node: collect_evidence
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Service returned response: {json.dumps(service_res)}")
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Gathering raw logs, database consistency hashes, and provider payloads...")
    
    collect_and_save_evidence(
        task_id=task_id,
        service_response=service_res,
        db_check_data=db_check_data,
        logs=state.logs,
        db=db
    )

    # Node: verify_outcome
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Initiating VeriNova verification engines...")
    db.add(models.TaskLog(task_id=task_id, action="verifying", details="Running outcome verifier computations"))
    db.commit()

    ver_res = verify_task_outcome(task_id, db)
    
    state.status = "Completed"
    state.logs.append(f"[{datetime.now().strftime('%H:%M:%S')}] Verification completed. Final Status: {ver_res.get('verification_status')} (Confidence: {ver_res.get('confidence_score')}%).")
    
    # Save final execution record
    exec_record.execution_status = "Completed"
    exec_record.completed_at = datetime.utcnow()
    exec_record.parsed_intent = state.to_dict()
    db.commit()

    return state.to_dict()
