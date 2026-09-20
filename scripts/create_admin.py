import sys
import os
sys.path.append(os.path.join(os.path.dirname(__file__), '../services/api'))
from database import create_user_in_db
from security import get_password_hash

user_data = {
    "email": "admin@nexova.com",
    "hashed_password": get_password_hash("admin123"),
    "role": "admin"
}
profile_data = {
    "first_name": "Admin",
    "last_name": "Nexova"
}

create_user_in_db(user_data, profile_data)
print("Usuario admin@nexova.com creado con la contraseña admin123")
