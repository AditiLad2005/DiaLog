import firebase_admin
from firebase_admin import credentials, firestore
import os

# Path to your service account key
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')

# Initialize Firebase app if not already initialized
if not firebase_admin._apps:
	cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
	firebase_admin.initialize_app(cred)

db = firestore.client()
