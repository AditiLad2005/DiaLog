# Script to train and save the diabetes prediction model
# Fill in with your model training code as needed

import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score
import joblib
import os

# Load dataset
df = pd.read_csv('data/pred_food.csv')

# TODO: Replace with actual feature/target columns
y = df['diabetes']  # Target column
X = df.drop(['diabetes'], axis=1)  # Feature columns

# Split data
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

# Train model
model = RandomForestClassifier()
model.fit(X_train, y_train)

# Evaluate
y_pred = model.predict(X_test)
print('Accuracy:', accuracy_score(y_test, y_pred))

# Save model
os.makedirs('models', exist_ok=True)
joblib.dump(model, 'models/diabetes_model.joblib')
print('Model saved to models/diabetes_model.joblib')
