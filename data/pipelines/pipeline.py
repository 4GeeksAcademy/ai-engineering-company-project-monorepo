import os
import sys
import json
from pathlib import Path
import pandas as pd
from datetime import timedelta
from dotenv import load_dotenv
from supabase import create_client, Client
from prefect import flow, task
from prefect.tasks import task_input_hash

env_path = Path(__file__).resolve().parent.parent.parent / ".env"
load_dotenv(dotenv_path=env_path)

url: str = os.environ.get("SUPABASE_URL")
key: str = os.environ.get("SUPABASE_KEY")
supabase: Client = create_client(url, key)

@task(retries=3, retry_delay_seconds=5)
def extract_telemetry_events(start_date: str, end_date: str) -> pd.DataFrame:
    response = supabase.table("telemetry_events").select("*").in_("event_type", [
        "inbound_order_created", 
        "stock_waste_registered", 
        "stock_threshold_triggered", 
        "ingredient_price_variance_detected"
    ]).gte("created_at", start_date).lt("created_at", end_date).execute()
    return pd.DataFrame(response.data)

@task(retries=3, retry_delay_seconds=5)
def extract_domain_data() -> pd.DataFrame:
    response = supabase.table("locations").select("id, country, currency").execute()
    return pd.DataFrame(response.data)

@task(cache_key_fn=task_input_hash, cache_expiration=timedelta(days=1))
def aggregate_location_kpis(telemetry_df: pd.DataFrame, locations_df: pd.DataFrame, week_start: str) -> pd.DataFrame:
    if telemetry_df.empty:
        return pd.DataFrame()
        
    telemetry_df['location_id'] = telemetry_df['event_payload'].apply(lambda x: x.get('location_id'))
    telemetry_df['cost'] = telemetry_df['event_payload'].apply(lambda x: float(x.get('cost', 0)))
    
    kpis = []
    grouped = telemetry_df.groupby('location_id')
    
    for location_id, group in grouped:
        purchases = group[group['event_type'] == 'inbound_order_created']
        wastes = group[group['event_type'] == 'stock_waste_registered']
        stockouts = group[group['event_type'] == 'stock_threshold_triggered']
        price_alerts = group[group['event_type'] == 'ingredient_price_variance_detected']
        
        purchase_cost = purchases['cost'].sum()
        waste_cost = wastes['cost'].sum()
        waste_ratio = (waste_cost / purchase_cost) if purchase_cost > 0 else 0
        
        kpis.append({
            "location_id": location_id,
            "week_start": week_start,
            "total_purchase_cost": purchase_cost,
            "total_waste_cost": waste_cost,
            "waste_ratio": round(waste_ratio, 4),
            "stockout_events_count": len(stockouts),
            "price_alert_events_count": len(price_alerts)
        })
        
    kpis_df = pd.DataFrame(kpis)
    if not locations_df.empty and not kpis_df.empty:
        kpis_df = kpis_df.merge(locations_df, left_on='location_id', right_on='id', how='left')
        kpis_df['country'] = kpis_df['country'].fillna('Unknown')
        kpis_df['currency'] = kpis_df['currency'].fillna('USD')
        if 'id' in kpis_df.columns:
            kpis_df = kpis_df.drop(columns=['id'])
            
    return kpis_df

@task(retries=3, retry_delay_seconds=5)
def upsert_to_reporting_table(kpis_df: pd.DataFrame):
    if kpis_df.empty:
        print("No data to upsert.")
        return
    records = kpis_df.to_dict(orient="records")
    supabase.table("weekly_location_performance").upsert(records, on_conflict="location_id,week_start").execute()
    print(f"Successfully upserted {len(records)} records!")

@flow(name="extract_brasaland_data_flow")
def extract_brasaland_data_flow(start_date: str, end_date: str):
    return extract_telemetry_events(start_date, end_date), extract_domain_data()

@flow(name="transform_brasaland_kpis_flow")
def transform_brasaland_kpis_flow(telemetry_data: pd.DataFrame, domain_data: pd.DataFrame, start_date: str):
    return aggregate_location_kpis(telemetry_data, domain_data, start_date)

@flow(name="load_brasaland_reporting_flow")
def load_brasaland_reporting_flow(kpis: pd.DataFrame):
    upsert_to_reporting_table(kpis)

@flow(name="brasaland_weekly_performance_pipeline", log_prints=True)
def run_pipeline(start_date: str, end_date: str):
    telemetry_data, domain_data = extract_brasaland_data_flow(start_date, end_date)
    kpis = transform_brasaland_kpis_flow(telemetry_data, domain_data, start_date)
    load_brasaland_reporting_flow(kpis)

    metadata = {
        "start_date": start_date,
        "end_date": end_date,
        "records_processed": len(telemetry_data),
        "status": "Success"
    }
    with open(Path(__file__).parent / "last_run.json", "w") as f:
        json.dump(metadata, f)

if __name__ == "__main__":
    print("Executing pipeline directly...")
    run_pipeline("2026-07-01", "2026-08-01")
    print("Pipeline execution completed successfully.")
