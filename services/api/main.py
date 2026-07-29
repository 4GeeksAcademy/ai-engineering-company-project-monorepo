from fastapi import FastAPI
from api.routers.knowledge import router as knowledge_router  # Adjust import path if needed

app = FastAPI()
app.include_router(knowledge_router)
