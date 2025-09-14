#!/usr/bin/env python3
"""Check Firestore meal logs"""

from firebase_admin_setup import db, firebase_initialized

if firebase_initialized:
    from firebase_admin import firestore
    
    # Check users collection structure
    print("🔍 Checking users collection structure...")
    users_docs = db.collection('users').limit(5).stream()
    
    for user_doc in users_docs:
        user_id = user_doc.id
        print(f"\n👤 User: {user_id}")
        
        # Check user's meal logs
        meal_logs = db.collection('users').document(user_id).collection('meal_logs').limit(3).stream()
        meal_count = 0
        
        for log_doc in meal_logs:
            meal_count += 1
            data = log_doc.to_dict()
            print(f"  📋 Meal Log {meal_count}: {log_doc.id}")
            print(f"    - Meals: {len(data.get('meals', []))}")
            print(f"    - Fasting Sugar: {data.get('sugar_level_fasting')}")
            print(f"    - Created: {data.get('createdAt')}")
        
        if meal_count == 0:
            print(f"  ⚠️  No meal logs found for user {user_id}")
        else:
            print(f"  ✅ Found {meal_count} meal logs for user {user_id}")
            
    # Also check if there are any remaining logs in the old global collection
    print(f"\n🗂️  Checking old global meal_logs collection...")
    old_logs = db.collection('meal_logs').limit(3).stream()
    old_count = 0
    for doc in old_logs:
        old_count += 1
        data = doc.to_dict()
        print(f"  📋 Old Log {old_count}: User {data.get('userId', 'N/A')}")
    
    if old_count > 0:
        print(f"  ⚠️  Found {old_count} logs in old global collection - consider migrating")
    else:
        print(f"  ✅ Old global collection is empty - migration complete")
        
else:
    print('Firebase not initialized')