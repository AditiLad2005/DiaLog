import pandas as pd
import os

def check_food_dataset():
    """Test function to check if the Food_Master_Dataset_.csv can be loaded properly"""
    try:
        # Try to find the data directory
        data_path = 'data/Food_Master_Dataset_.csv'
        if not os.path.exists(data_path):
            if os.path.exists('backend/data/Food_Master_Dataset_.csv'):
                data_path = 'backend/data/Food_Master_Dataset_.csv'
            else:
                print("❌ Cannot find Food_Master_Dataset_.csv")
                return False
        
        # Load the dataset
        print(f"Loading food dataset from: {data_path}")
        food_df = pd.read_csv(data_path)
        
        # Basic information about the dataset
        print(f"✅ Dataset loaded successfully with {len(food_df)} entries")
        print(f"Dataset columns: {food_df.columns.tolist()}")
        
        # Check if 'dish_name' column exists
        if 'dish_name' not in food_df.columns:
            print("❌ 'dish_name' column is missing from the dataset")
            return False
        
        # Print first 5 dish names as a sample
        print("\nSample dish names:")
        for name in food_df['dish_name'][:5]:
            print(f"- {name}")
        
        # Try setting dish_name as index (as the API does)
        try:
            food_df.set_index('dish_name', inplace=True)
            food_names = food_df.index.tolist()
            print(f"\n✅ Successfully set 'dish_name' as index with {len(food_names)} unique dish names")
        except Exception as e:
            print(f"❌ Error setting 'dish_name' as index: {str(e)}")
            return False
        
        return True
    except Exception as e:
        print(f"❌ Error checking food dataset: {str(e)}")
        return False

if __name__ == "__main__":
    # Change to backend directory if not already there
    if not os.path.exists('data'):
        # Try to find the backend directory
        if os.path.exists('backend/data'):
            os.chdir('backend')
        else:
            print("❌ Can't find the data directory. Run this script from the project root or backend directory.")
            exit(1)
    
    if check_food_dataset():
        print("\n✅ Food dataset check passed!")
    else:
        print("\n❌ Food dataset check failed!")
