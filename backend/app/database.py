from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

client: AsyncIOMotorClient = None


async def connect_to_mongo():
    """Create MongoDB connection on application startup."""
    global client
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    # Verify connection
    await client.admin.command("ping")
    print(f"✅ Connected to MongoDB at {settings.MONGODB_URL}")


async def close_mongo_connection():
    """Close MongoDB connection on application shutdown."""
    global client
    if client:
        client.close()
        print("🔌 MongoDB connection closed")


def get_database():
    """Get the database instance."""
    return client[settings.DATABASE_NAME]
