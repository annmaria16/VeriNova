import ast
import operator
import logging
from pydantic import BaseModel, Field
from services.agent.tool_registry import register_tool

logger = logging.getLogger("verinova.tools.calculator")

class CalculatorInput(BaseModel):
    expression: str = Field(..., description="The mathematical expression to evaluate (e.g. '59999 - 4000').")

# Abstract Syntax Tree nodes that are safe to parse
SAFE_NODES = {
    ast.Expression,
    ast.BinOp,
    ast.UnaryOp,
    ast.Constant, # Python 3.8+
    ast.Add,
    ast.Sub,
    ast.Mult,
    ast.Div,
    ast.USub,
    ast.UAdd
}

if hasattr(ast, "Num"):
    SAFE_NODES.add(ast.Num)

def safe_eval_ast(node):
    if type(node) not in SAFE_NODES:
        raise ValueError(f"Unsafe operation detected: {type(node).__name__} is not allowed.")
    
    if isinstance(node, ast.Expression):
        return safe_eval_ast(node.body)
    elif isinstance(node, ast.Constant):
        if not isinstance(node.value, (int, float)):
            raise ValueError("Only integer and float constants are allowed.")
        return node.value
    elif hasattr(ast, "Num") and isinstance(node, getattr(ast, "Num")):
        return node.n
    elif isinstance(node, ast.BinOp):
        left = safe_eval_ast(node.left)
        right = safe_eval_ast(node.right)
        if isinstance(node.op, ast.Add):
            return left + right
        elif isinstance(node.op, ast.Sub):
            return left - right
        elif isinstance(node.op, ast.Mult):
            return left * right
        elif isinstance(node.op, ast.Div):
            if right == 0:
                raise ZeroDivisionError("Division by zero is not allowed.")
            return left / right
        else:
            raise ValueError(f"Unsupported operator: {type(node.op).__name__}")
    elif isinstance(node, ast.UnaryOp):
        operand = safe_eval_ast(node.operand)
        if isinstance(node.op, ast.USub):
            return -operand
        elif isinstance(node.op, ast.UAdd):
            return operand
        else:
            raise ValueError(f"Unsupported unary operator: {type(node.op).__name__}")

@register_tool(
    name="calculator",
    description="Safely evaluate basic mathematical expressions (addition, subtraction, multiplication, division). No variables or arbitrary code execution.",
    input_schema=CalculatorInput,
    risk_level="LOW",
    requires_auth=False
)
def execute_calculator(expression: str) -> dict:
    # Clean expression spacing
    cleaned_expr = expression.replace("₹", "").replace(",", "").strip()
    try:
        tree = ast.parse(cleaned_expr, mode="eval")
        result = safe_eval_ast(tree)
        return {
            "success": True,
            "expression": expression,
            "result": result
        }
    except Exception as e:
        logger.error(f"Failed to calculate expression '{expression}': {str(e)}")
        return {
            "success": False,
            "expression": expression,
            "error": f"Evaluation error: {str(e)}"
        }
