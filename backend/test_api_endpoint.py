"""
Test API Endpoint
"""
import requests
import json

# Test the API endpoint directly
url = 'http://localhost:8000/predict_meal_safety'
data = {
    'age': 45,
    'gender': 'Male',
    'bmi': 26,
    'fasting_sugar': 110,
    'post_meal_sugar': 140,
    'meal_name': 'Black channa curry/Bengal gram curry (Kale chane ki curry)',
    'portion_size': 180,  # 1 bowl
    'time_of_day': 'Lunch'
}

try:
    response = requests.post(url, json=data)
    if response.status_code == 200:
        result = response.json()
        print('🌐 API RESPONSE:')
        print(f'Risk Level: {result.get("risk_level", "N/A")}')
        print(f'Confidence: {result.get("confidence", 0)*100:.1f}%')
        print(f'Explanation: {result.get("explanation", "N/A")}')
        
        # Test multiple portions
        print('\n🥣 TESTING MULTIPLE PORTIONS VIA API:')
        portions = [(110, '1 katori'), (180, '1 bowl'), (250, '1 plate')]
        
        for portion, desc in portions:
            data['portion_size'] = portion
            resp = requests.post(url, json=data)
            if resp.status_code == 200:
                res = resp.json()
                status = '✅' if res.get('risk_level') == 'safe' else '⚠️' if res.get('risk_level') == 'caution' else '❌'
                print(f'{status} {portion}g ({desc}): {res.get("risk_level", "N/A").upper()}')
            
    else:
        print(f'❌ API Error: {response.status_code}')
        print(response.text)
except Exception as e:
    print(f'❌ Connection Error: {e}')
    print('🔧 Make sure backend server is running on port 8000')
