from fastapi import FastAPI, APIRouter, HTTPException, Depends, File, UploadFile, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
from passlib.context import CryptContext
from jose import JWTError, jwt
import base64

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Security
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
security = HTTPBearer()
SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'your-secret-key-change-in-production')
ALGORITHM = "HS256"

# Create the main app
app = FastAPI()
api_router = APIRouter(prefix="/api")

# Models
class Service(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str
    description: str
    price: float
    image_url: Optional[str] = None
    active: bool = True
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class ServiceCreate(BaseModel):
    name: str
    description: str
    price: float
    image_url: Optional[str] = None

class ServiceUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    price: Optional[float] = None
    image_url: Optional[str] = None
    active: Optional[bool] = None

class Booking(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    customer_name: str
    phone: str
    service_id: str
    service_name: str
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    status: str = "pending"  # pending, confirmed, cancelled
    created_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class BookingCreate(BaseModel):
    customer_name: str
    phone: str
    service_id: str
    date: str
    time: str

class BusinessHours(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    day_of_week: int  # 0=Monday, 6=Sunday
    open_time: str  # HH:MM
    close_time: str  # HH:MM
    is_open: bool
    interval_minutes: int = 90

class BusinessHoursUpdate(BaseModel):
    is_open: bool
    open_time: Optional[str] = None
    close_time: Optional[str] = None

class AdminLogin(BaseModel):
    username: str
    password: str

class Token(BaseModel):
    access_token: str
    token_type: str

class Settings(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    whatsapp_number: str
    updated_at: str = Field(default_factory=lambda: datetime.now(timezone.utc).isoformat())

class SettingsUpdate(BaseModel):
    whatsapp_number: str

# Helper functions
def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + timedelta(hours=24)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

async def get_current_admin(credentials: HTTPAuthorizationCredentials = Depends(security)):
    try:
        token = credentials.credentials
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid authentication")
        return username
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid authentication")

# Initialize default admin and business hours
@app.on_event("startup")
async def startup_event():
    # Create default admin if not exists
    admin = await db.admins.find_one({"username": "admin"})
    if not admin:
        hashed_password = get_password_hash("admin123")
        await db.admins.insert_one({
            "id": str(uuid.uuid4()),
            "username": "admin",
            "password": hashed_password
        })
        logger.info("Default admin created: username=admin, password=admin123")
    
    # Initialize business hours if not exists
    count = await db.business_hours.count_documents({})
    if count == 0:
        default_hours = [
            {"id": str(uuid.uuid4()), "day_of_week": 0, "open_time": "08:00", "close_time": "18:00", "is_open": True, "interval_minutes": 90},  # Monday
            {"id": str(uuid.uuid4()), "day_of_week": 1, "open_time": "08:00", "close_time": "18:00", "is_open": True, "interval_minutes": 90},  # Tuesday
            {"id": str(uuid.uuid4()), "day_of_week": 2, "open_time": "08:00", "close_time": "18:00", "is_open": True, "interval_minutes": 90},  # Wednesday
            {"id": str(uuid.uuid4()), "day_of_week": 3, "open_time": "08:00", "close_time": "18:00", "is_open": True, "interval_minutes": 90},  # Thursday
            {"id": str(uuid.uuid4()), "day_of_week": 4, "open_time": "08:00", "close_time": "18:00", "is_open": True, "interval_minutes": 90},  # Friday
            {"id": str(uuid.uuid4()), "day_of_week": 5, "open_time": "08:00", "close_time": "12:00", "is_open": True, "interval_minutes": 90},  # Saturday
            {"id": str(uuid.uuid4()), "day_of_week": 6, "open_time": "08:00", "close_time": "18:00", "is_open": False, "interval_minutes": 90},  # Sunday
        ]
        await db.business_hours.insert_many(default_hours)
        logger.info("Default business hours created")
    
    # Create default services
    services_count = await db.services.count_documents({})
    if services_count == 0:
        default_services = [
            {"id": str(uuid.uuid4()), "name": "Volume Brasileiro", "description": "Técnica brasileira de alongamento de cílios", "price": 150.0, "active": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Volume 5D", "description": "Alongamento 5D para volume intenso", "price": 180.0, "active": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Cat Eye", "description": "Efeito olho de gato elegante", "price": 160.0, "active": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Fox Eye", "description": "Efeito olho de raposa moderno", "price": 170.0, "active": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
            {"id": str(uuid.uuid4()), "name": "Capping", "description": "Técnica de finalização perfeita", "price": 140.0, "active": True, "image_url": None, "created_at": datetime.now(timezone.utc).isoformat()},
        ]
        await db.services.insert_many(default_services)
        logger.info("Default services created")
    
    # Create default settings
    settings_count = await db.settings.count_documents({})
    if settings_count == 0:
        default_settings = {
            "id": str(uuid.uuid4()),
            "whatsapp_number": "+5588998376642",
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.settings.insert_one(default_settings)
        logger.info("Default settings created")

# Auth routes
@api_router.post("/auth/login", response_model=Token)
async def login(credentials: AdminLogin):
    admin = await db.admins.find_one({"username": credentials.username})
    if not admin or not verify_password(credentials.password, admin["password"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    
    access_token = create_access_token(data={"sub": credentials.username})
    return {"access_token": access_token, "token_type": "bearer"}

# Service routes
@api_router.get("/services", response_model=List[Service])
async def get_services(active_only: bool = True):
    query = {"active": True} if active_only else {}
    services = await db.services.find(query, {"_id": 0}).to_list(1000)
    return services

@api_router.post("/services", response_model=Service)
async def create_service(service: ServiceCreate, admin: str = Depends(get_current_admin)):
    service_obj = Service(**service.model_dump())
    doc = service_obj.model_dump()
    await db.services.insert_one(doc)
    return service_obj

@api_router.put("/services/{service_id}", response_model=Service)
async def update_service(service_id: str, service_update: ServiceUpdate, admin: str = Depends(get_current_admin)):
    existing = await db.services.find_one({"id": service_id}, {"_id": 0})
    if not existing:
        raise HTTPException(status_code=404, detail="Service not found")
    
    update_data = {k: v for k, v in service_update.model_dump().items() if v is not None}
    if update_data:
        await db.services.update_one({"id": service_id}, {"$set": update_data})
    
    updated = await db.services.find_one({"id": service_id}, {"_id": 0})
    return Service(**updated)

@api_router.delete("/services/{service_id}")
async def delete_service(service_id: str, admin: str = Depends(get_current_admin)):
    result = await db.services.delete_one({"id": service_id})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Service not found")
    return {"message": "Service deleted"}

# Booking routes
@api_router.get("/bookings", response_model=List[Booking])
async def get_bookings(admin: str = Depends(get_current_admin)):
    bookings = await db.bookings.find({}, {"_id": 0}).sort("date", -1).to_list(1000)
    return bookings

@api_router.post("/bookings", response_model=Booking)
async def create_booking(booking: BookingCreate):
    # Validate service exists
    service = await db.services.find_one({"id": booking.service_id, "active": True})
    if not service:
        raise HTTPException(status_code=404, detail="Service not found")
    
    # Check if slot is available
    existing = await db.bookings.find_one({
        "date": booking.date,
        "time": booking.time,
        "status": {"$ne": "cancelled"}
    })
    if existing:
        raise HTTPException(status_code=400, detail="This time slot is already booked")
    
    booking_obj = Booking(
        **booking.model_dump(),
        service_name=service["name"]
    )
    doc = booking_obj.model_dump()
    await db.bookings.insert_one(doc)
    
    # Get WhatsApp settings and return with booking
    settings = await db.settings.find_one({}, {"_id": 0})
    whatsapp_number = settings["whatsapp_number"] if settings else "+5588998376642"
    
    return {**booking_obj.model_dump(), "whatsapp_number": whatsapp_number}

@api_router.get("/bookings/available-slots")
async def get_available_slots(date: str):
    # Parse date to get day of week
    date_obj = datetime.strptime(date, "%Y-%m-%d")
    day_of_week = date_obj.weekday()
    
    # Get business hours for this day
    business_hours = await db.business_hours.find_one({"day_of_week": day_of_week}, {"_id": 0})
    if not business_hours or not business_hours["is_open"]:
        return {"available_slots": []}
    
    # Generate time slots
    open_time = datetime.strptime(business_hours["open_time"], "%H:%M")
    close_time = datetime.strptime(business_hours["close_time"], "%H:%M")
    interval = business_hours["interval_minutes"]
    
    slots = []
    current = open_time
    while current < close_time:
        slots.append(current.strftime("%H:%M"))
        current += timedelta(minutes=interval)
    
    # Get booked slots
    booked = await db.bookings.find({
        "date": date,
        "status": {"$ne": "cancelled"}
    }, {"_id": 0, "time": 1}).to_list(1000)
    booked_times = [b["time"] for b in booked]
    
    # Filter available slots
    available = [slot for slot in slots if slot not in booked_times]
    
    return {"available_slots": available}

@api_router.put("/bookings/{booking_id}/status")
async def update_booking_status(booking_id: str, status: str, admin: str = Depends(get_current_admin)):
    if status not in ["pending", "confirmed", "cancelled"]:
        raise HTTPException(status_code=400, detail="Invalid status")
    
    result = await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": status}}
    )
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Booking not found")
    
    return {"message": "Status updated"}

# Business hours routes
@api_router.get("/business-hours", response_model=List[BusinessHours])
async def get_business_hours():
    hours = await db.business_hours.find({}, {"_id": 0}).sort("day_of_week", 1).to_list(10)
    return hours

@api_router.put("/business-hours/{day_of_week}")
async def update_business_hours(day_of_week: int, hours_update: BusinessHoursUpdate, admin: str = Depends(get_current_admin)):
    if day_of_week < 0 or day_of_week > 6:
        raise HTTPException(status_code=400, detail="Invalid day of week")
    
    update_data = hours_update.model_dump(exclude_none=True)
    result = await db.business_hours.update_one(
        {"day_of_week": day_of_week},
        {"$set": update_data}
    )
    
    if result.modified_count == 0:
        raise HTTPException(status_code=404, detail="Business hours not found")
    
    return {"message": "Business hours updated"}

# Settings routes
@api_router.get("/settings")
async def get_settings():
    settings = await db.settings.find_one({}, {"_id": 0})
    if not settings:
        # Return default if not found
        return {"whatsapp_number": "+5588998376642"}
    return settings

@api_router.put("/settings")
async def update_settings(settings_update: SettingsUpdate, admin: str = Depends(get_current_admin)):
    settings = await db.settings.find_one({})
    if settings:
        await db.settings.update_one(
            {"id": settings["id"]},
            {"$set": {
                "whatsapp_number": settings_update.whatsapp_number,
                "updated_at": datetime.now(timezone.utc).isoformat()
            }}
        )
    else:
        new_settings = {
            "id": str(uuid.uuid4()),
            "whatsapp_number": settings_update.whatsapp_number,
            "updated_at": datetime.now(timezone.utc).isoformat()
        }
        await db.settings.insert_one(new_settings)
    
    return {"message": "Settings updated"}

# Image upload
@api_router.post("/upload-image")
async def upload_image(file: UploadFile = File(...), admin: str = Depends(get_current_admin)):
    # Read file content
    content = await file.read()
    # Convert to base64
    base64_image = base64.b64encode(content).decode('utf-8')
    # Create data URL
    image_url = f"data:{file.content_type};base64,{base64_image}"
    return {"image_url": image_url}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()