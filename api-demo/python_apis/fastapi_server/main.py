from fastapi import FastAPI, HTTPException
from pydantic import BaseModel

app = FastAPI()

class User(BaseModel):
    name: str
    email: str

@app.get("/fastapi/hello")
async def hello():
    return {"message": "Hello from FastAPI!"}

@app.post("/fastapi/user")
async def create_user(user: User):
    return {
        "message": "User created",
        "user": user.dict()
    }

@app.get("/fastapi/user/{user_id}")
async def get_user(user_id: str):
    return {
        "message": "Get user detail",
        "id": user_id
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8082)
