import logging
from fpdf import FPDF
from datetime import datetime

logger = logging.getLogger(__name__)

class VeriNovaReportPDF(FPDF):
    def header(self):
        # Premium cyber header
        self.set_fill_color(11, 11, 15)  # Near-black
        self.rect(0, 0, 210, 40, "F")
        
        self.set_text_color(139, 92, 246)  # Purple accent #8B5CF6
        self.set_font("Helvetica", "B", 24)
        self.set_y(10)
        self.cell(0, 10, "VERINOVA", border=0, ln=1, align="C")
        
        self.set_text_color(34, 211, 238)  # Cyan secondary #22D3EE
        self.set_font("Helvetica", "B", 10)
        self.cell(0, 5, "AUTONOMOUS OUTCOME VERIFICATION REPORT", border=0, ln=1, align="C")
        
        self.set_y(40)
        self.ln(5)

    def footer(self):
        self.set_y(-15)
        self.set_font("Helvetica", "I", 8)
        self.set_text_color(156, 163, 175)  # Muted gray
        self.cell(0, 10, f"Page {self.page_no()} | Generated automatically by VeriNova AI Engine", 0, 0, "C")


def generate_pdf_report(task, ver_result, evidence_list, logs_list) -> bytes:
    """
    Generates a high-fidelity PDF report of the task outcome verification.
    """
    logger.info(f"Generating PDF report bytes for task {task.id}...")
    pdf = VeriNovaReportPDF()
    pdf.add_page()
    pdf.set_auto_page_break(auto=True, margin=20)
    
    # Title Section
    pdf.set_font("Helvetica", "B", 14)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(31, 41, 55)  # Dark Gray
    pdf.cell(0, 10, f" Task Details: {task.name}", fill=True, ln=1)
    pdf.ln(3)

    # Info Grid
    pdf.set_font("Helvetica", "", 10)
    pdf.set_text_color(55, 65, 81)  # Charcoal
    
    col_width = 95
    pdf.cell(col_width, 7, f"Task ID: {task.id}", border="B")
    pdf.cell(col_width, 7, f"Date Executed: {task.date}", border="B", ln=1)
    
    pdf.cell(col_width, 7, f"Service Category: {task.task_type.upper() if task.task_type else 'N/A'}", border="B")
    pdf.cell(col_width, 7, f"Verification Method: {task.method or 'N/A'}", border="B", ln=1)
    
    pdf.cell(col_width, 7, f"Priority: {task.priority.upper() if task.priority else 'MEDIUM'}", border="B")
    
    # Verification Status Color
    status = ver_result.verification_status if ver_result else task.status
    score = ver_result.confidence_score if ver_result else (task.confidence or 0.0)
    
    if status == "Verified":
        pdf.set_text_color(22, 163, 74)  # Green
    elif status == "Needs Review":
        pdf.set_text_color(217, 119, 6)  # Amber
    else:
        pdf.set_text_color(220, 38, 38)  # Red
        
    pdf.cell(col_width, 7, f"Verification Status: {status.upper()}", border="B", ln=1)
    pdf.ln(5)

    # Description
    pdf.set_font("Helvetica", "B", 10)
    pdf.set_text_color(55, 65, 81)
    pdf.cell(0, 6, "Task Prompt Description:", ln=1)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5, task.description or "No description provided.")
    pdf.ln(3)
    
    # Expected Outcome
    pdf.set_font("Helvetica", "B", 10)
    pdf.cell(0, 6, "Expected Outcome:", ln=1)
    pdf.set_font("Helvetica", "", 10)
    pdf.multi_cell(0, 5, task.expected_outcome or "No expected outcome provided.")
    pdf.ln(5)

    # Confidence Gauge Block
    pdf.set_fill_color(243, 244, 246)  # Light gray block
    pdf.rect(10, pdf.get_y(), 190, 20, "F")
    
    pdf.set_y(pdf.get_y() + 4)
    pdf.set_x(15)
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(31, 41, 55)
    pdf.cell(60, 10, "Verification Confidence Score:")
    
    if score >= 80:
        pdf.set_text_color(22, 163, 74)
    elif score >= 40:
        pdf.set_text_color(217, 119, 6)
    else:
        pdf.set_text_color(220, 38, 38)
        
    pdf.set_font("Helvetica", "B", 16)
    pdf.cell(30, 10, f"{score}%")
    
    # Draw simple progress bar in PDF
    pdf.set_y(pdf.get_y() + 3)
    pdf.set_x(110)
    pdf.set_fill_color(229, 231, 235)  # gray background bar
    pdf.rect(110, pdf.get_y(), 80, 4, "F")
    
    if score >= 80:
        pdf.set_fill_color(34, 197, 94)  # green
    elif score >= 40:
        pdf.set_fill_color(245, 158, 11)  # amber
    else:
        pdf.set_fill_color(239, 68, 68)  # red
        
    pdf.rect(110, pdf.get_y(), int(80 * (score / 100.0)), 4, "F")
    
    pdf.set_y(pdf.get_y() + 10)
    pdf.ln(5)

    # Evidence Section
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(31, 41, 55)
    pdf.cell(0, 10, " Collected Evidence Checklist (Zero User File Upload)", fill=True, ln=1)
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 9)
    pdf.set_text_color(55, 65, 81)
    
    # Headers
    pdf.set_font("Helvetica", "B", 9)
    pdf.cell(40, 6, "Evidence Type", border="B")
    pdf.cell(110, 6, "Details / Verification Check", border="B")
    pdf.cell(40, 6, "Status", border="B", ln=1)
    pdf.set_font("Helvetica", "", 9)
    
    for ev in evidence_list:
        ev_type = ev.evidence_type.replace("_", " ").title()
        data = ev.evidence_data or {}
        
        # Format details
        if ev.evidence_type == "api_response":
            details = f"Service: {data.get('service', 'Unknown')}. Response Code/Status: {data.get('status') or 'N/A'}"
            status_text = "PASSED" if data.get("status") in ["refunded", "sent", "confirmed", "updated"] else "FAILED"
        elif ev.evidence_type == "database_check":
            details = data.get("details", "Checked database consistency row matches.")
            status_text = "PASSED" if data.get("success") or data.get("match") else "FAILED"
        else:
            details = f"Compiled {len(data.get('logs', []))} internal execution stack trace logs."
            status_text = "PASSED"
            
        pdf.cell(40, 6, ev_type, border="B")
        pdf.cell(110, 6, details[:65], border="B")
        
        if status_text == "PASSED":
            pdf.set_text_color(22, 163, 74)
        else:
            pdf.set_text_color(220, 38, 38)
            
        pdf.cell(40, 6, status_text, border="B", ln=1)
        pdf.set_text_color(55, 65, 81)
        
    pdf.ln(5)

    # Logs Timeline Section
    pdf.set_font("Helvetica", "B", 12)
    pdf.set_text_color(255, 255, 255)
    pdf.set_fill_color(31, 41, 55)
    pdf.cell(0, 10, " Agent Execution Logs / Step Timeline", fill=True, ln=1)
    pdf.ln(3)

    pdf.set_font("Helvetica", "", 8.5)
    pdf.set_text_color(75, 85, 99)
    
    if logs_list:
        for log in logs_list:
            log_time_str = log.log_time.strftime("%Y-%m-%d %H:%M:%S") if hasattr(log, "log_time") else "N/A"
            msg = f"[{log_time_str}] {log.action.upper()}: {log.details}"
            pdf.multi_cell(0, 5, msg)
    else:
        pdf.cell(0, 5, "No execution logs saved in timeline.", ln=1)

    return pdf.output()
