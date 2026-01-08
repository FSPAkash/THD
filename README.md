# Home Depot KPI Dashboard

A React + Flask dashboard for tracking KPIs (OKRs) with Apple-esque design inspired by Jony Ive.

## Features

- Glass morphism UI with Home Depot orange (#F96302) and white (#FFFFFF) theme
- Login system with role-based access (admin, dev, viewer)
- Dev mode for data upload functionality
- KPI tracking: Visits, Orders, Revenue, CVR, AOV, RPV
- Interactive donut charts for quick KPI overview
- Selectable chart types (Line, Area, Bar) per KPI
- Advanced Analysis with Pre/Post launch comparison
- Excel data import with feature launch date configuration

## User Accounts

| Username | Password | Role | Permissions |
|----------|----------|------|-------------|
| admin | homedepot2024 | admin | View all data |
| dev | devmode2024 | dev | View all data + Upload data |
| viewer | viewer2024 | viewer | View all data |

## Excel File Format

### Sheet 1: DailyData
| Column | Type | Description |
|--------|------|-------------|
| date | Date | YYYY-MM-DD format |
| use_case | Text | Feature/use case name |
| visits | Number | Total visits |
| orders | Number | Total orders |
| revenue | Number | Revenue in USD |
| cvr | Number | Conversion rate % |
| aov | Number | Average order value |
| rpv | Number | Revenue per visit |

### Sheet 2: FeatureConfig
| Column | Type | Description |
|--------|------|-------------|
| use_case | Text | Must match DailyData |
| launch_date | Date | Feature launch date |
| description | Text | Optional description |

## Local Development

### Backend
```bash
cd backend
pip install -r requirements.txt
python app.py