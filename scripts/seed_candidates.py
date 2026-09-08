import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

import random
from faker import Faker
from services.api.database import create_candidate_in_db

fake = Faker('es_ES')

positions = [
    "Ingeniero de Software", "Data Scientist", "Product Manager", 
    "Diseñador UX/UI", "DevOps Engineer", "Especialista en Marketing",
    "Machine Learning Engineer", "Frontend Developer", "Backend Developer"
]

stages = ["SCREENING", "INTERVIEW", "TECHNICAL_TEST", "OFFER", "HIRED"]
statuses = ["PENDING", "IN_REVIEW", "ACCEPTED", "REJECTED"]

def seed_candidates(num_candidates=50):
    for i in range(num_candidates):
        first_name = fake.first_name()
        last_name = fake.last_name()
        name = f"{first_name} {last_name}"
        email = f"{first_name.lower()}.{last_name.lower()}{random.randint(1,99)}@example.com"
        
        candidate_data = {
            "name": name,
            "email": email,
            "phone": fake.phone_number(),
            "position": random.choice(positions),
            "linkedin": f"https://linkedin.com/in/{first_name.lower()}-{last_name.lower()}",
            "resume_url": f"https://nexova-storage.com/cvs/{first_name.lower()}-{last_name.lower()}-cv.pdf",
            "years_of_experience": random.randint(1, 15),
            "status": random.choice(statuses),
            "stage": random.choice(stages)
        }
        
        create_candidate_in_db(candidate_data)
    print(f"{num_candidates} candidatos creados exitosamente en TinyDB.")

if __name__ == "__main__":
    seed_candidates(50)
