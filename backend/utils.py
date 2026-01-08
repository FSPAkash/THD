import pandas as pd
from datetime import datetime, timedelta
import os
import numpy as np


def parse_excel_data(file_path):
    """Parse uploaded Excel file with KPI data and feature configuration."""
    try:
        xl = pd.ExcelFile(file_path)
        
        daily_data = pd.read_excel(xl, sheet_name='DailyData')
        daily_data['date'] = pd.to_datetime(daily_data['date'])
        
        numeric_columns = ['visits', 'orders', 'revenue', 'cvr', 'aov', 'rpv']
        for col in numeric_columns:
            if col in daily_data.columns:
                daily_data[col] = pd.to_numeric(daily_data[col], errors='coerce').astype(float)
        
        daily_data[numeric_columns] = daily_data[numeric_columns].fillna(0.0)
        
        feature_config = pd.read_excel(xl, sheet_name='FeatureConfig')
        feature_config['launch_date'] = pd.to_datetime(feature_config['launch_date'])
        
        return {
            'daily_data': daily_data,
            'feature_config': feature_config
        }
    except Exception as e:
        raise ValueError(f"Error parsing Excel file: {str(e)}")


def calculate_pre_post_metrics(daily_data, feature_config, period_days=None):
    """
    Calculate pre/post analysis metrics for all KPIs.
    
    Args:
        daily_data: DataFrame with daily KPI data
        feature_config: DataFrame with launch dates
        period_days: Number of days for post period (None = all days till now)
    
    Notes:
        - CVR is calculated as orders/visits from raw data
        - CVR lift is shown in BPS (basis points): 1 BPS = 0.01%
        - AOV is calculated as revenue/orders from raw data
        - RPV is calculated as revenue/visits from raw data
    """
    results = []
    primary_kpis = ['visits', 'orders', 'revenue']
    derived_kpis = ['cvr', 'aov', 'rpv']
    all_kpis = primary_kpis + derived_kpis
    
    for _, config in feature_config.iterrows():
        use_case = str(config['use_case'])
        launch_date = pd.to_datetime(config['launch_date'])
        today = pd.to_datetime(datetime.now().date())
        
        total_post_days = (today - launch_date).days
        
        if total_post_days <= 0:
            continue
        
        if period_days is None or period_days == 'all':
            actual_post_days = total_post_days
        else:
            actual_post_days = min(int(period_days), total_post_days)
        
        # Define date ranges
        post_start_ty = launch_date
        post_end_ty = launch_date + timedelta(days=actual_post_days)
        
        pre_start_ty = launch_date - timedelta(days=actual_post_days)
        pre_end_ty = launch_date - timedelta(days=1)
        
        post_start_ly = post_start_ty - timedelta(days=365)
        post_end_ly = post_end_ty - timedelta(days=365)
        pre_start_ly = pre_start_ty - timedelta(days=365)
        pre_end_ly = pre_end_ty - timedelta(days=365)
        
        case_data = daily_data[daily_data['use_case'] == use_case].copy()
        
        if case_data.empty:
            continue
        
        # Get data for each period
        pre_ty_data = case_data[
            (case_data['date'] >= pre_start_ty) & 
            (case_data['date'] <= pre_end_ty)
        ]
        
        pre_ly_data = case_data[
            (case_data['date'] >= pre_start_ly) & 
            (case_data['date'] <= pre_end_ly)
        ]
        
        post_ty_data = case_data[
            (case_data['date'] >= post_start_ty) & 
            (case_data['date'] <= post_end_ty)
        ]
        
        post_ly_data = case_data[
            (case_data['date'] >= post_start_ly) & 
            (case_data['date'] <= post_end_ly)
        ]
        
        # Calculate primary KPI totals for derived metric calculations
        primary_totals = {
            'pre_ty': {
                'visits': pre_ty_data['visits'].sum() if len(pre_ty_data) > 0 else 0.0,
                'orders': pre_ty_data['orders'].sum() if len(pre_ty_data) > 0 else 0.0,
                'revenue': pre_ty_data['revenue'].sum() if len(pre_ty_data) > 0 else 0.0
            },
            'pre_ly': {
                'visits': pre_ly_data['visits'].sum() if len(pre_ly_data) > 0 else 0.0,
                'orders': pre_ly_data['orders'].sum() if len(pre_ly_data) > 0 else 0.0,
                'revenue': pre_ly_data['revenue'].sum() if len(pre_ly_data) > 0 else 0.0
            },
            'post_ty': {
                'visits': post_ty_data['visits'].sum() if len(post_ty_data) > 0 else 0.0,
                'orders': post_ty_data['orders'].sum() if len(post_ty_data) > 0 else 0.0,
                'revenue': post_ty_data['revenue'].sum() if len(post_ty_data) > 0 else 0.0
            },
            'post_ly': {
                'visits': post_ly_data['visits'].sum() if len(post_ly_data) > 0 else 0.0,
                'orders': post_ly_data['orders'].sum() if len(post_ly_data) > 0 else 0.0,
                'revenue': post_ly_data['revenue'].sum() if len(post_ly_data) > 0 else 0.0
            }
        }
        
        for kpi in all_kpis:
            try:
                if kpi in primary_kpis:
                    # Primary KPIs: Sum the values
                    pre_ty = primary_totals['pre_ty'][kpi]
                    pre_ly = primary_totals['pre_ly'][kpi]
                    post_ty = primary_totals['post_ty'][kpi]
                    post_ly = primary_totals['post_ly'][kpi]
                    
                    # Standard percentage lift
                    pre_lift = ((pre_ty - pre_ly) / pre_ly * 100) if pre_ly != 0 else 0.0
                    post_lift = ((post_ty - post_ly) / post_ly * 100) if post_ly != 0 else 0.0
                    pre_post_comp_lift = post_lift - pre_lift
                    
                elif kpi == 'cvr':
                    # CVR = orders / visits (as decimal, e.g., 0.0225 for 2.25%)
                    pre_ty = (primary_totals['pre_ty']['orders'] / primary_totals['pre_ty']['visits']) if primary_totals['pre_ty']['visits'] > 0 else 0.0
                    pre_ly = (primary_totals['pre_ly']['orders'] / primary_totals['pre_ly']['visits']) if primary_totals['pre_ly']['visits'] > 0 else 0.0
                    post_ty = (primary_totals['post_ty']['orders'] / primary_totals['post_ty']['visits']) if primary_totals['post_ty']['visits'] > 0 else 0.0
                    post_ly = (primary_totals['post_ly']['orders'] / primary_totals['post_ly']['visits']) if primary_totals['post_ly']['visits'] > 0 else 0.0
                    
                    # CVR lift in BPS (basis points)
                    # 1 BPS = 0.0001 = 0.01%
                    # Difference * 10000 = BPS
                    pre_lift = (pre_ty - pre_ly) * 10000  # BPS
                    post_lift = (post_ty - post_ly) * 10000  # BPS
                    pre_post_comp_lift = post_lift - pre_lift  # BPS
                    
                elif kpi == 'aov':
                    # AOV = revenue / orders
                    pre_ty = (primary_totals['pre_ty']['revenue'] / primary_totals['pre_ty']['orders']) if primary_totals['pre_ty']['orders'] > 0 else 0.0
                    pre_ly = (primary_totals['pre_ly']['revenue'] / primary_totals['pre_ly']['orders']) if primary_totals['pre_ly']['orders'] > 0 else 0.0
                    post_ty = (primary_totals['post_ty']['revenue'] / primary_totals['post_ty']['orders']) if primary_totals['post_ty']['orders'] > 0 else 0.0
                    post_ly = (primary_totals['post_ly']['revenue'] / primary_totals['post_ly']['orders']) if primary_totals['post_ly']['orders'] > 0 else 0.0
                    
                    # Standard percentage lift for AOV
                    pre_lift = ((pre_ty - pre_ly) / pre_ly * 100) if pre_ly != 0 else 0.0
                    post_lift = ((post_ty - post_ly) / post_ly * 100) if post_ly != 0 else 0.0
                    pre_post_comp_lift = post_lift - pre_lift
                    
                elif kpi == 'rpv':
                    # RPV = revenue / visits
                    pre_ty = (primary_totals['pre_ty']['revenue'] / primary_totals['pre_ty']['visits']) if primary_totals['pre_ty']['visits'] > 0 else 0.0
                    pre_ly = (primary_totals['pre_ly']['revenue'] / primary_totals['pre_ly']['visits']) if primary_totals['pre_ly']['visits'] > 0 else 0.0
                    post_ty = (primary_totals['post_ty']['revenue'] / primary_totals['post_ty']['visits']) if primary_totals['post_ty']['visits'] > 0 else 0.0
                    post_ly = (primary_totals['post_ly']['revenue'] / primary_totals['post_ly']['visits']) if primary_totals['post_ly']['visits'] > 0 else 0.0
                    
                    # Standard percentage lift for RPV
                    pre_lift = ((pre_ty - pre_ly) / pre_ly * 100) if pre_ly != 0 else 0.0
                    post_lift = ((post_ty - post_ly) / post_ly * 100) if post_ly != 0 else 0.0
                    pre_post_comp_lift = post_lift - pre_lift
                
                # Ensure all values are proper floats
                pre_ty = float(pre_ty) if not pd.isna(pre_ty) else 0.0
                pre_ly = float(pre_ly) if not pd.isna(pre_ly) else 0.0
                post_ty = float(post_ty) if not pd.isna(post_ty) else 0.0
                post_ly = float(post_ly) if not pd.isna(post_ly) else 0.0
                pre_lift = float(pre_lift) if not pd.isna(pre_lift) else 0.0
                post_lift = float(post_lift) if not pd.isna(post_lift) else 0.0
                pre_post_comp_lift = float(pre_post_comp_lift) if not pd.isna(pre_post_comp_lift) else 0.0
                
                results.append({
                    'use_case': str(use_case),
                    'kpi': str(kpi.upper()),
                    'pre_ly': round(float(pre_ly), 6),
                    'pre_ty': round(float(pre_ty), 6),
                    'pre_lift': round(float(pre_lift), 4),
                    'post_ly': round(float(post_ly), 6),
                    'post_ty': round(float(post_ty), 6),
                    'post_lift': round(float(post_lift), 4),
                    'pre_post_comp_lift': round(float(pre_post_comp_lift), 4),
                    'launch_date': launch_date.strftime('%Y-%m-%d'),
                    'period_days': int(actual_post_days),
                    'total_post_days': int(total_post_days),
                    'is_bps': kpi == 'cvr'  # Flag to indicate BPS format
                })
            except Exception as e:
                print(f"Error calculating {kpi} for {use_case}: {str(e)}")
                continue
    
    return results


def get_daily_kpi_data(daily_data, use_case=None, kpi=None, launch_date=None, period_days=None):
    """Get daily KPI data for charts with optional period filtering."""
    if use_case:
        data = daily_data[daily_data['use_case'] == use_case].copy()
    else:
        data = daily_data.copy()
    
    if launch_date:
        launch = pd.to_datetime(launch_date)
        data = data[data['date'] >= launch]
        
        if period_days and period_days != 'all':
            end_date = launch + timedelta(days=int(period_days))
            data = data[data['date'] <= end_date]
    
    data = data.sort_values('date')
    
    records = []
    for _, row in data.iterrows():
        record = {
            'date': row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date']),
            'use_case': str(row['use_case']),
        }
        
        if kpi:
            record[kpi] = float(row[kpi]) if not pd.isna(row[kpi]) else 0.0
        else:
            for k in ['visits', 'orders', 'revenue', 'cvr', 'aov', 'rpv']:
                record[k] = float(row[k]) if not pd.isna(row[k]) else 0.0
        
        records.append(record)
    
    return records


def get_kpi_summary(daily_data, launch_date=None, period_days=None):
    """Get summary of all KPIs for the specified period."""
    data = daily_data.copy()
    
    if launch_date:
        launch = pd.to_datetime(launch_date)
        data = data[data['date'] >= launch]
        
        if period_days and period_days != 'all':
            end_date = launch + timedelta(days=int(period_days))
            data = data[data['date'] <= end_date]
    
    if data.empty:
        return {
            'visits': 0.0,
            'orders': 0.0,
            'revenue': 0.0,
            'cvr': 0.0,
            'aov': 0.0,
            'rpv': 0.0
        }
    
    total_visits = float(data['visits'].sum()) if not pd.isna(data['visits'].sum()) else 0.0
    total_orders = float(data['orders'].sum()) if not pd.isna(data['orders'].sum()) else 0.0
    total_revenue = float(data['revenue'].sum()) if not pd.isna(data['revenue'].sum()) else 0.0
    
    # Calculate derived metrics from totals
    cvr = (total_orders / total_visits) if total_visits > 0 else 0.0
    aov = (total_revenue / total_orders) if total_orders > 0 else 0.0
    rpv = (total_revenue / total_visits) if total_visits > 0 else 0.0
    
    summary = {
        'visits': round(total_visits, 4),
        'orders': round(total_orders, 4),
        'revenue': round(total_revenue, 4),
        'cvr': round(cvr, 6),  # Keep more precision for CVR
        'aov': round(aov, 4),
        'rpv': round(rpv, 4)
    }
    
    return summary


def get_use_cases(feature_config):
    """Get list of all use cases."""
    return [str(uc) for uc in feature_config['use_case'].tolist()]


def get_launch_date(feature_config, use_case):
    """Get launch date for a specific use case."""
    config = feature_config[feature_config['use_case'] == use_case]
    if config.empty:
        return None
    return config.iloc[0]['launch_date'].strftime('%Y-%m-%d')


def get_stakeholders(feature_config, use_case):
    """Get stakeholder emails for a specific use case."""
    config = feature_config[feature_config['use_case'] == use_case]
    if config.empty:
        return []
    
    row = config.iloc[0]
    
    if 'stakeholders' not in row or pd.isna(row['stakeholders']) or not row['stakeholders']:
        return []
    
    stakeholders_str = str(row['stakeholders'])
    
    stakeholders = []
    for email in stakeholders_str.replace(';', ',').split(','):
        email = email.strip()
        if email and '@' in email:
            stakeholders.append(email)
    
    return stakeholders