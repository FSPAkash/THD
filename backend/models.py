from dataclasses import dataclass
from typing import Optional
from datetime import date

@dataclass
class KPIData:
    date: date
    visits: float
    orders: float
    revenue: float
    cvr: float
    aov: float
    rpv: float
    use_case: str
    year: int

@dataclass
class FeatureConfig:
    use_case: str
    launch_date: date
    description: Optional[str] = None