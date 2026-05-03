"""
Task Management Routes — for Server & Cleaner Portals

Endpoints:
  GET    /api/tasks                 — list tasks (filter by role, status, assignee)
  POST   /api/tasks                 — create a new task (manager/admin)
  GET    /api/tasks/{task_id}       — get task by ID
  PATCH  /api/tasks/{task_id}/status — update task status
  DELETE /api/tasks/{task_id}       — delete task

Example Request (create task):
  POST /api/tasks
  {"title": "Clean Table 5", "assigned_to": "cleaner1", "role": "cleaner", "priority": "high", "table_number": 5}

Example Response:
  {"task_id": "TSK-...", "title": "...", "status": "pending", ...}
"""
from fastapi import APIRouter, HTTPException
from app.database import get_database
from app.models.task import TaskCreate, TaskStatusUpdate
from bson import ObjectId
from datetime import datetime
import uuid

router = APIRouter(prefix="/api/tasks", tags=["Tasks"])


def _generate_task_id() -> str:
    return f"TSK-{uuid.uuid4().hex[:8].upper()}"


def _serialize(task: dict) -> dict:
    task["_id"] = str(task["_id"])
    # Convert datetime fields to string for JSON
    for field in ["created_at", "updated_at"]:
        if isinstance(task.get(field), datetime):
            task[field] = task[field].isoformat()
    return task


@router.get("")
async def list_tasks(
    role: str = None,
    status: str = None,
    assigned_to: str = None,
    table_number: int = None,
):
    """
    List all tasks with optional filters.

    Examples:
      GET /api/tasks?role=cleaner&status=pending
      GET /api/tasks?assigned_to=john_server
    """
    db = get_database()
    query = {}
    if role:
        query["role"] = role
    if status:
        query["status"] = status
    if assigned_to:
        query["assigned_to"] = assigned_to
    if table_number:
        query["table_number"] = table_number

    tasks = []
    cursor = db.tasks.find(query).sort("created_at", -1)
    async for task in cursor:
        tasks.append(_serialize(task))

    return {"tasks": tasks, "total": len(tasks)}


@router.post("", status_code=201)
async def create_task(task: TaskCreate):
    """
    Create a new task and assign it to a staff member.

    Priority: low | medium | high
    Role: server | cleaner | kitchen
    """
    db = get_database()

    task_dict = {
        "task_id": _generate_task_id(),
        "title": task.title,
        "description": task.description,
        "assigned_to": task.assigned_to,
        "role": task.role,
        "priority": task.priority.value,
        "status": "pending",
        "table_number": task.table_number,
        "due_time": task.due_time,
        "notes": None,
        "created_at": datetime.utcnow(),
        "updated_at": datetime.utcnow(),
    }

    result = await db.tasks.insert_one(task_dict)
    task_dict["_id"] = str(result.inserted_id)
    return _serialize(task_dict)


@router.get("/{task_id}")
async def get_task(task_id: str):
    """Get a single task by task_id (e.g. TSK-ABCD1234) or MongoDB _id."""
    db = get_database()
    task = await db.tasks.find_one({"task_id": task_id})
    if not task and ObjectId.is_valid(task_id):
        task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _serialize(task)


@router.patch("/{task_id}/status")
async def update_task_status(task_id: str, update: TaskStatusUpdate):
    """
    Update task status.
    Valid statuses: pending → in_progress → completed | cancelled

    Example:
        PATCH /api/tasks/TSK-ABC12345/status
        {"status": "completed", "notes": "Table cleaned and sanitised"}
    """
    db = get_database()

    task = await db.tasks.find_one({"task_id": task_id})
    if not task and ObjectId.is_valid(task_id):
        task = await db.tasks.find_one({"_id": ObjectId(task_id)})
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    update_data = {
        "status": update.status.value,
        "updated_at": datetime.utcnow(),
    }
    if update.notes:
        update_data["notes"] = update.notes

    await db.tasks.update_one({"_id": task["_id"]}, {"$set": update_data})

    updated = await db.tasks.find_one({"_id": task["_id"]})
    return _serialize(updated)


@router.delete("/{task_id}")
async def delete_task(task_id: str):
    """Delete a task by task_id."""
    db = get_database()
    result = await db.tasks.delete_one({"task_id": task_id})
    if result.deleted_count == 0:
        if ObjectId.is_valid(task_id):
            result = await db.tasks.delete_one({"_id": ObjectId(task_id)})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Task not found")
    return {"message": f"Task '{task_id}' deleted successfully"}
