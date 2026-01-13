import os
from datetime import timedelta

class Config:
    SECRET_KEY = os.environ.get('SECRET_KEY', 'homedepot-dashboard-secret-key-2024')
    JWT_SECRET_KEY = os.environ.get('JWT_SECRET_KEY', 'jwt-secret-key-homedepot-2024')
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=8)
    UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'data')
    MAX_CONTENT_LENGTH = 16 * 1024 * 1024
    
    # Email - Using local Outlook application (no server config needed)
    # Each user sends from their own signed-in Outlook account
    
    USERS = {
        'admin': {
            'password': 'homedepot123',
            'role': 'admin',
            'name': 'Administrator'
        },
        'dev': {
            'password': 'devmode',
            'role': 'dev',
            'name': 'Developer'
        },
        'Akash': {
            'password': 'a123',
            'role': 'viewer',
            'name': 'Akash'
        },
        'Connor': {
            'password': 'c123',
            'role': 'viewer',
            'name': 'Connor'
        }
    }