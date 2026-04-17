import pandas as pd
import os
from sqlalchemy import create_engine
from dotenv import load_dotenv

load_dotenv()

# 1. Database Connection Fix
raw_url = os.getenv("DATABASE_URL")
if not raw_url:
    raise ValueError("❌ DATABASE_URL not found in .env file!")

# Python SQLAlchemy requires 'postgresql://' instead of 'postgres://'
url = raw_url.replace("postgres://", "postgresql://")
engine = create_engine(url)

def clean_df(df):
    # This searches for the actual header row (Census files often have titles on top)
    for i in range(len(df)):
        row_values = [str(val).strip().upper() for val in df.iloc[i].values]
        if 'STATE NAME' in row_values or 'AREA NAME' in row_values:
            df.columns = df.iloc[i]
            df = df.iloc[i+1:].reset_index(drop=True)
            break
    
    # Map the Excel headers to your Neon staging table columns
    mapping = {
        'STATE NAME': 'STATE NAME',
        'MDDS STC': 'MDDS STC',
        'DISTRICT NAME': 'DISTRICT NAME',
        'MDDS DTC': 'MDDS DTC',
        'SUB-DISTRICT NAME': 'SUB-DISTRICT NAME',
        'MDDS Sub_DT': 'MDDS Sub_DT',
        'Area Name': 'Area Name',
        'MDDS PLCN': 'MDDS PLCN'
    }
    
    # Filter only available columns and rename to match mapping
    available_cols = [col for col in mapping.keys() if col in df.columns]
    df = df[available_cols].rename(columns=mapping)
    
    # Drop rows that are completely empty
    df = df.dropna(how='all')
    return df

def run():
    data_folder = './data'
    # Finds both .xls (Census) and .ods (UP file)
    files = [f for f in os.listdir(data_folder) if f.endswith(('.xls', '.ods'))]
    
    if not files:
        print("❌ No files found in the ./data folder!")
        return

    print(f"🚀 Found {len(files)} files. Starting Transfer to Neon Staging...")

    for file in files:
        print(f"📦 Processing: {file}...")
        file_path = os.path.join(data_folder, file)
        
        try:
            # Use appropriate engine for .xls or .ods
            if file.endswith('.ods'):
                df_raw = pd.read_excel(file_path, engine='odf')
            else:
                df_raw = pd.read_excel(file_path)
            
            df_final = clean_df(df_raw)
            
            if not df_final.empty:
                # Upload to the table you just created in the SQL Editor
                df_final.to_sql('staging_all_data', engine, if_exists='append', index=False)
                print(f"✅ Successfully uploaded {len(df_final)} rows from {file}")
            else:
                print(f"⚠️ Warning: {file} was empty after cleaning.")
                
        except Exception as e:
            print(f"❌ Error in {file}: {e}")
    
    print("\n🏁 ALL DATA TRANSFERRED TO NEON STAGING TABLE!")

if __name__ == "__main__":
    run()