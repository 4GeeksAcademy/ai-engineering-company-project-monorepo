import pandas as pd
from datetime import datetime

def get_events_per_day(df: pd.DataFrame) -> list[dict]:
    """
    Operational Question: What is the total volume of traffic hitting the platform daily?
    Formula: COUNT(id) grouped by Date
    """
    if df.empty:
        return []
        
    # 1. Convert timestamp strings to UTC datetime objects before any grouping
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    
    # 2. Extract the date component as a string for grouping
    df['date'] = df['timestamp'].dt.date.astype(str)
    
    # 3. Aggregate using pure Pandas operations (no loops allowed)
    summary = df.groupby('date').size().reset_index(name='event_count')
    
    return summary.to_dict(orient='records')


def get_error_rate_by_type(df: pd.DataFrame) -> list[dict]:
    """
    Operational Question: Which types of system failures or technical errors occur most frequently?
    Formula: COUNT(id) filtered by technical error categories, grouped by event_type
    """
    if df.empty:
        return []
        
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    
    # Refine/Filter in Pandas for target technical error event categories
    error_df = df[df['event_type'].isin(['api_error', 'user_login_failed'])].copy()
    
    if error_df.empty:
        return []
        
    # Aggregate counts by the specific error event type
    summary = error_df.groupby('event_type').size().reset_index(name='error_count')
    
    return summary.to_dict(orient='records')


def get_auth_failure_rate(df: pd.DataFrame) -> list[dict]:
    """
    Operational Question: What percentage of total user login attempts fail each day?
    Formula: COUNT(user_login_failed) / (COUNT(user_login_failed) + COUNT(user_login_succeeded)) per day
    """
    if df.empty:
        return []
        
    df['timestamp'] = pd.to_datetime(df['timestamp'], utc=True)
    df['date'] = df['timestamp'].dt.date.astype(str)
    
    # Filter exclusively down to authentication operational data
    auth_df = df[df['event_type'].isin(['user_login_succeeded', 'user_login_failed'])].copy()
    if auth_df.empty:
        return []
        
    # Pivot or group to count successes and failures cleanly
    grouped = auth_df.groupby(['date', 'event_type']).size().unstack(fill_value=0)
    
    # Ensure both structural columns exist to avoid unexpected KeyErrors
    if 'user_login_failed' not in grouped.columns:
        grouped['user_login_failed'] = 0
    if 'user_login_succeeded' not in grouped.columns:
        grouped['user_login_succeeded'] = 0
        
    # Calculate derived operational safety metric
    grouped['total_attempts'] = grouped['user_login_succeeded'] + grouped['user_login_failed']
    grouped['failure_rate'] = (grouped['user_login_failed'] / grouped['total_attempts']).round(4)
    
    return grouped.reset_index().to_dict(orient='records')
