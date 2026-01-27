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

        # Handle segment columns - set defaults if not present
        segment_columns = ['business_segment', 'device_type', 'page_type']
        for col in segment_columns:
            if col not in daily_data.columns:
                # Default values if columns don't exist
                if col == 'business_segment':
                    daily_data[col] = 'All'
                elif col == 'device_type':
                    daily_data[col] = 'All'
                elif col == 'page_type':
                    daily_data[col] = 'All'
            else:
                # Fill NaN values with 'All'
                daily_data[col] = daily_data[col].fillna('All').astype(str)

        feature_config = pd.read_excel(xl, sheet_name='FeatureConfig')
        feature_config['launch_date'] = pd.to_datetime(feature_config['launch_date'])

        return {
            'daily_data': daily_data,
            'feature_config': feature_config
        }
    except Exception as e:
        raise ValueError(f"Error parsing Excel file: {str(e)}")


def apply_segment_filters(data, business_segment=None, device_type=None, page_type=None):
    """
    Apply segment filters to the data.

    Args:
        data: DataFrame with daily KPI data
        business_segment: 'B2B', 'B2C', or None/All for no filter
        device_type: 'MW', 'DTW', 'App', or None/All for no filter
        page_type: Specific page type value or None/All for no filter

    Returns:
        Filtered DataFrame
    """
    filtered = data.copy()

    # Apply business segment filter
    if business_segment and business_segment.lower() not in ['all', '']:
        if 'business_segment' in filtered.columns:
            filtered = filtered[filtered['business_segment'].str.upper() == business_segment.upper()]

    # Apply device type filter
    if device_type and device_type.lower() not in ['all', '']:
        if 'device_type' in filtered.columns:
            filtered = filtered[filtered['device_type'].str.upper() == device_type.upper()]

    # Apply page type filter
    if page_type and page_type.lower() not in ['all', '']:
        if 'page_type' in filtered.columns:
            filtered = filtered[filtered['page_type'] == page_type]

    return filtered


def get_unique_page_types(daily_data):
    """Get unique page types from the data for dropdown."""
    if 'page_type' not in daily_data.columns:
        return ['All']

    unique_types = daily_data['page_type'].dropna().unique().tolist()
    # Filter out empty strings and 'All' if present, then add 'All' at the beginning
    unique_types = [pt for pt in unique_types if pt and pt.strip() and pt != 'All']
    unique_types = sorted(list(set(unique_types)))
    return ['All'] + unique_types


def calculate_pre_post_metrics(daily_data, feature_config, period_days=None,
                                business_segment=None, device_type=None, page_type=None):
    """
    Calculate pre/post analysis metrics for all KPIs.

    Args:
        daily_data: DataFrame with daily KPI data
        feature_config: DataFrame with launch dates
        period_days: Number of days for post period (None = all days till now)
        business_segment: 'B2B', 'B2C', or None for all
        device_type: 'MW', 'DTW', 'App', or None for all
        page_type: Specific page type or None for all

    Notes:
        - CVR is calculated as orders/visits from raw data
        - CVR lift is shown in BPS (basis points): 1 BPS = 0.01%
        - AOV is calculated as revenue/orders from raw data
        - RPV is calculated as revenue/visits from raw data
    """
    # Apply segment filters first
    filtered_data = apply_segment_filters(daily_data, business_segment, device_type, page_type)

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

        case_data = filtered_data[filtered_data['use_case'] == use_case].copy()
        
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


def get_daily_kpi_data(daily_data, use_case=None, kpi=None, launch_date=None, period_days=None,
                       business_segment=None, device_type=None, page_type=None):
    """Get daily KPI data for charts with optional period and segment filtering."""
    # Apply segment filters first
    data = apply_segment_filters(daily_data, business_segment, device_type, page_type)

    if use_case:
        data = data[data['use_case'] == use_case].copy()

    if launch_date:
        launch = pd.to_datetime(launch_date)
        data = data[data['date'] >= launch]

        if period_days and period_days != 'all':
            end_date = launch + timedelta(days=int(period_days))
            data = data[data['date'] <= end_date]

    # Aggregate by date (sum for primary KPIs after filtering)
    if not data.empty:
        agg_data = data.groupby('date').agg({
            'visits': 'sum',
            'orders': 'sum',
            'revenue': 'sum'
        }).reset_index()

        # Recalculate derived metrics from aggregated totals
        agg_data['cvr'] = agg_data.apply(
            lambda row: row['orders'] / row['visits'] if row['visits'] > 0 else 0.0, axis=1
        )
        agg_data['aov'] = agg_data.apply(
            lambda row: row['revenue'] / row['orders'] if row['orders'] > 0 else 0.0, axis=1
        )
        agg_data['rpv'] = agg_data.apply(
            lambda row: row['revenue'] / row['visits'] if row['visits'] > 0 else 0.0, axis=1
        )
        agg_data['use_case'] = use_case if use_case else 'All'
        data = agg_data

    data = data.sort_values('date')

    records = []
    for _, row in data.iterrows():
        record = {
            'date': row['date'].strftime('%Y-%m-%d') if hasattr(row['date'], 'strftime') else str(row['date']),
            'use_case': str(row['use_case']) if 'use_case' in row else use_case or 'All',
        }

        if kpi:
            record[kpi] = float(row[kpi]) if not pd.isna(row[kpi]) else 0.0
        else:
            for k in ['visits', 'orders', 'revenue', 'cvr', 'aov', 'rpv']:
                record[k] = float(row[k]) if not pd.isna(row[k]) else 0.0

        records.append(record)

    return records


def get_kpi_summary(daily_data, launch_date=None, period_days=None,
                    business_segment=None, device_type=None, page_type=None):
    """Get summary of all KPIs for the specified period with segment filtering."""
    # Apply segment filters first
    data = apply_segment_filters(daily_data, business_segment, device_type, page_type)

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


def get_daily_comparison_data(daily_data, use_case=None, kpi=None, launch_date=None, period_days=None,
                               business_segment=None, device_type=None, page_type=None):
    """
    Get daily KPI data with TY (This Year) and LY (Last Year) comparison for charts.
    Returns data aligned by day offset from launch date for proper comparison.
    """
    # Apply segment filters first
    data = apply_segment_filters(daily_data, business_segment, device_type, page_type)

    if use_case:
        data = data[data['use_case'] == use_case].copy()

    if not launch_date:
        return []

    launch = pd.to_datetime(launch_date)
    today = pd.to_datetime(datetime.now().date())

    # Calculate period
    total_post_days = (today - launch).days
    if total_post_days <= 0:
        return []

    if period_days is None or period_days == 'all':
        actual_post_days = total_post_days
    else:
        actual_post_days = min(int(period_days), total_post_days)

    # Define date ranges
    post_start_ty = launch
    post_end_ty = launch + timedelta(days=actual_post_days)

    # LY dates (365 days before)
    post_start_ly = post_start_ty - timedelta(days=365)
    post_end_ly = post_end_ty - timedelta(days=365)

    # Get TY data
    ty_data = data[
        (data['date'] >= post_start_ty) &
        (data['date'] <= post_end_ty)
    ].copy()

    # Get LY data
    ly_data = data[
        (data['date'] >= post_start_ly) &
        (data['date'] <= post_end_ly)
    ].copy()

    # Aggregate TY by date
    if not ty_data.empty:
        ty_agg = ty_data.groupby('date').agg({
            'visits': 'sum',
            'orders': 'sum',
            'revenue': 'sum'
        }).reset_index()
        ty_agg['cvr'] = ty_agg.apply(
            lambda row: row['orders'] / row['visits'] if row['visits'] > 0 else 0.0, axis=1
        )
        ty_agg['aov'] = ty_agg.apply(
            lambda row: row['revenue'] / row['orders'] if row['orders'] > 0 else 0.0, axis=1
        )
        ty_agg['rpv'] = ty_agg.apply(
            lambda row: row['revenue'] / row['visits'] if row['visits'] > 0 else 0.0, axis=1
        )
        ty_agg['day_offset'] = (ty_agg['date'] - launch).dt.days
    else:
        ty_agg = pd.DataFrame()

    # Aggregate LY by date
    if not ly_data.empty:
        ly_agg = ly_data.groupby('date').agg({
            'visits': 'sum',
            'orders': 'sum',
            'revenue': 'sum'
        }).reset_index()
        ly_agg['cvr'] = ly_agg.apply(
            lambda row: row['orders'] / row['visits'] if row['visits'] > 0 else 0.0, axis=1
        )
        ly_agg['aov'] = ly_agg.apply(
            lambda row: row['revenue'] / row['orders'] if row['orders'] > 0 else 0.0, axis=1
        )
        ly_agg['rpv'] = ly_agg.apply(
            lambda row: row['revenue'] / row['visits'] if row['visits'] > 0 else 0.0, axis=1
        )
        # Calculate day offset from LY launch equivalent
        ly_launch_equiv = launch - timedelta(days=365)
        ly_agg['day_offset'] = (ly_agg['date'] - ly_launch_equiv).dt.days
    else:
        ly_agg = pd.DataFrame()

    # Build records aligned by day_offset
    records = []
    all_kpis = ['visits', 'orders', 'revenue', 'cvr', 'aov', 'rpv']

    # Get all unique day offsets
    day_offsets = set()
    if not ty_agg.empty:
        day_offsets.update(ty_agg['day_offset'].tolist())
    if not ly_agg.empty:
        day_offsets.update(ly_agg['day_offset'].tolist())

    for day_offset in sorted(day_offsets):
        ty_row = ty_agg[ty_agg['day_offset'] == day_offset] if not ty_agg.empty else pd.DataFrame()
        ly_row = ly_agg[ly_agg['day_offset'] == day_offset] if not ly_agg.empty else pd.DataFrame()

        ty_date = (launch + timedelta(days=day_offset)).strftime('%Y-%m-%d')

        record = {
            'date': ty_date,
            'day_offset': int(day_offset),
            'use_case': use_case or 'All'
        }

        if kpi:
            kpis_to_include = [kpi]
        else:
            kpis_to_include = all_kpis

        for k in kpis_to_include:
            # TY value
            if not ty_row.empty and k in ty_row.columns:
                record[f'{k}_ty'] = float(ty_row.iloc[0][k]) if not pd.isna(ty_row.iloc[0][k]) else 0.0
            else:
                record[f'{k}_ty'] = None

            # LY value
            if not ly_row.empty and k in ly_row.columns:
                record[f'{k}_ly'] = float(ly_row.iloc[0][k]) if not pd.isna(ly_row.iloc[0][k]) else 0.0
            else:
                record[f'{k}_ly'] = None

        records.append(record)

    return records


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