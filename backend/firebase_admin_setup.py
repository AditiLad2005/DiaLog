import firebase_admin
from firebase_admin import credentials, firestore
import os
from dotenv import load_dotenv
import json

# Load environment variables
load_dotenv()

# Path to your service account key
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
SERVICE_ACCOUNT_PATH = os.path.join(BASE_DIR, 'serviceAccountKey.json')

# Initialize Firebase app if not already initialized
db = None
firebase_initialized = False

if not firebase_admin._apps:
    try:
        # Try to use service account file first
        if os.path.exists(SERVICE_ACCOUNT_PATH):
            cred = credentials.Certificate(SERVICE_ACCOUNT_PATH)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized with service account file")
            firebase_initialized = True
        else:
            # Fallback to environment variables
            private_key = os.getenv('FIREBASE_PRIVATE_KEY', '')
            
            # Clean up the private key - remove quotes and fix newlines
            if private_key.startswith('"') and private_key.endswith('"'):
                private_key = private_key[1:-1]  # Remove surrounding quotes
            private_key = private_key.replace('\\n', '\n')
            
            # Validate required fields
            required_fields = [
                'FIREBASE_PROJECT_ID', 'FIREBASE_PRIVATE_KEY_ID', 
                'FIREBASE_PRIVATE_KEY', 'FIREBASE_CLIENT_EMAIL'
            ]
            
            missing_fields = [field for field in required_fields if not os.getenv(field)]
            if missing_fields:
                raise ValueError(f"Missing environment variables: {', '.join(missing_fields)}")
            
            service_account_info = {
                "type": "service_account",
                "project_id": os.getenv('FIREBASE_PROJECT_ID'),
                "private_key_id": os.getenv('FIREBASE_PRIVATE_KEY_ID'),
                "private_key": private_key,
                "client_email": os.getenv('FIREBASE_CLIENT_EMAIL'),
                "client_id": os.getenv('FIREBASE_CLIENT_ID'),
                "auth_uri": os.getenv('FIREBASE_AUTH_URI', 'https://accounts.google.com/o/oauth2/auth'),
                "token_uri": os.getenv('FIREBASE_TOKEN_URI', 'https://oauth2.googleapis.com/token'),
                "auth_provider_x509_cert_url": os.getenv('FIREBASE_AUTH_PROVIDER_X509_CERT_URL', 'https://www.googleapis.com/oauth2/v1/certs'),
                "client_x509_cert_url": os.getenv('FIREBASE_CLIENT_X509_CERT_URL')
            }
            
            cred = credentials.Certificate(service_account_info)
            firebase_admin.initialize_app(cred)
            print("✅ Firebase initialized with environment variables")
            firebase_initialized = True
    except Exception as e:
        print(f"❌ Error initializing Firebase: {e}")
        print("⚠️  Firebase features will be disabled")
        firebase_initialized = False

# Only create Firestore client if Firebase was successfully initialized
if firebase_initialized:
    try:
        db = firestore.client()
        print("✅ Firestore client created successfully")
    except Exception as e:
        print(f"❌ Error creating Firestore client: {e}")
        db = None
        firebase_initialized = False
else:
    db = None
    print("⚠️  Firestore client not available - Firebase not initialized")
