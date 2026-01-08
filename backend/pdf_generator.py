import pdfkit
from jinja2 import Template
from datetime import datetime
import os
import platform

# Configure pdfkit for Windows
def get_pdfkit_config():
    """Get pdfkit configuration based on OS."""
    if platform.system() == 'Windows':
        # Common installation paths for wkhtmltopdf on Windows
        possible_paths = [
            r'C:\Program Files\wkhtmltopdf\bin\wkhtmltopdf.exe',
            r'C:\Program Files (x86)\wkhtmltopdf\bin\wkhtmltopdf.exe',
            r'C:\wkhtmltopdf\bin\wkhtmltopdf.exe',
        ]
        for path in possible_paths:
            if os.path.exists(path):
                return pdfkit.configuration(wkhtmltopdf=path)
        # If not found in common paths, assume it's in PATH
        return None
    return None

def generate_report_html(analysis_data, use_case, period_label, launch_date):
    """Generate HTML for the PDF report."""
    
    template_str = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            @page {
                size: A4 landscape;
                margin: 1cm;
            }
            
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif;
                color: #1d1d1f;
                background: #f5f5f7;
                padding: 20px;
                font-size: 12px;
            }
            
            .header {
                display: flex;
                justify-content: space-between;
                align-items: center;
                margin-bottom: 30px;
                padding-bottom: 20px;
                border-bottom: 2px solid #F96302;
            }
            
            .logo {
                display: flex;
                align-items: center;
                gap: 12px;
            }
            
            .logo-icon {
                width: 40px;
                height: 40px;
                background: #F96302;
                border-radius: 8px;
                display: inline-flex;
                align-items: center;
                justify-content: center;
                color: white;
                font-weight: bold;
                font-size: 18px;
                text-align: center;
                line-height: 40px;
            }
            
            .logo-text {
                font-size: 20px;
                font-weight: 700;
                color: #1d1d1f;
                display: inline-block;
                vertical-align: middle;
                margin-left: 10px;
            }
            
            .report-info {
                text-align: right;
            }
            
            .report-title {
                font-size: 14px;
                color: #6e6e73;
                margin-bottom: 4px;
            }
            
            .report-date {
                font-size: 12px;
                color: #86868b;
            }
            
            .use-case-header {
                text-align: center;
                margin-bottom: 30px;
            }
            
            .use-case-name {
                font-size: 28px;
                font-weight: 700;
                color: #1d1d1f;
                margin-bottom: 8px;
            }
            
            .period-info {
                display: inline-block;
                background: rgba(249, 99, 2, 0.1);
                color: #F96302;
                padding: 6px 16px;
                border-radius: 20px;
                font-size: 14px;
                font-weight: 600;
            }
            
            .launch-date {
                font-size: 13px;
                color: #6e6e73;
                margin-top: 8px;
            }
            
            .metrics-grid {
                display: table;
                width: 100%;
                margin-bottom: 30px;
            }
            
            .metrics-row {
                display: table-row;
            }
            
            .metric-card {
                display: table-cell;
                background: white;
                border-radius: 16px;
                padding: 20px;
                text-align: center;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
                margin: 0 8px;
                width: 16.66%;
            }
            
            .metric-label {
                font-size: 11px;
                font-weight: 600;
                color: #6e6e73;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                margin-bottom: 12px;
            }
            
            .metric-value {
                font-size: 28px;
                font-weight: 800;
                margin-bottom: 4px;
            }
            
            .metric-value.positive { color: #30D158; }
            .metric-value.negative { color: #FF453A; }
            .metric-value.neutral { color: #8E8E93; }
            
            .metric-change {
                font-size: 13px;
                font-weight: 600;
                color: #86868b;
            }
            
            .metric-change.positive { color: #30D158; }
            .metric-change.negative { color: #FF453A; }
            
            .table-section {
                background: white;
                border-radius: 16px;
                padding: 24px;
                box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            }
            
            .table-title {
                font-size: 18px;
                font-weight: 600;
                color: #1d1d1f;
                margin-bottom: 16px;
            }
            
            table {
                width: 100%;
                border-collapse: collapse;
                font-size: 12px;
            }
            
            th {
                text-align: left;
                padding: 12px 16px;
                background: #f5f5f7;
                font-weight: 600;
                color: #6e6e73;
                text-transform: uppercase;
                letter-spacing: 0.5px;
                font-size: 10px;
            }
            
            th.highlight {
                background: rgba(249, 99, 2, 0.1);
                color: #F96302;
            }
            
            td {
                padding: 12px 16px;
                border-bottom: 1px solid #f0f0f0;
                color: #1d1d1f;
            }
            
            td.kpi-name {
                font-weight: 700;
                color: #F96302;
            }
            
            td.positive {
                color: #30D158;
                font-weight: 600;
            }
            
            td.negative {
                color: #FF453A;
                font-weight: 600;
            }
            
            .comp-badge {
                display: inline-block;
                padding: 4px 10px;
                border-radius: 6px;
                font-weight: 600;
            }
            
            .comp-badge.positive {
                background: rgba(48, 209, 88, 0.15);
                color: #30D158;
            }
            
            .comp-badge.negative {
                background: rgba(255, 69, 58, 0.15);
                color: #FF453A;
            }
            
            .footer {
                margin-top: 30px;
                padding-top: 20px;
                border-top: 1px solid #e0e0e0;
                text-align: center;
                font-size: 11px;
                color: #86868b;
            }
        </style>
    </head>
    <body>
        <div class="header">

                <span class="logo-text">Advanced Analytics</span>

            <div class="report-info">
                <div class="report-title">KPI Performance Report</div>
                <div class="report-date">Generated: {{ generated_date }}</div>
            </div>
        </div>
        
        <div class="use-case-header">
            <div class="use-case-name">{{ use_case }}</div>
            <div class="period-info">{{ period_label }}</div>
            <div class="launch-date">Launch Date: {{ launch_date }}</div>
        </div>
        
        <table class="metrics-grid">
            <tr class="metrics-row">
                {% for metric in metrics %}
                <td class="metric-card">
                    <div class="metric-label">{{ metric.kpi }}</div>
                    <div class="metric-value {{ metric.direction }}">
                        {{ metric.arrow }} {{ metric.post_lift }}%
                    </div>
                    <div class="metric-change {{ metric.direction }}">
                        {{ metric.change }}
                    </div>
                </td>
                {% endfor %}
            </tr>
        </table>
        
        <div class="table-section">
            <div class="table-title">Detailed Analysis</div>
            <table>
                <thead>
                    <tr>
                        <th>KPI</th>
                        <th>Pre LY</th>
                        <th>Pre TY</th>
                        <th>Pre Lift</th>
                        <th>Post LY</th>
                        <th>Post TY</th>
                        <th>Post Lift</th>
                        <th class="highlight">Comp Lift</th>
                    </tr>
                </thead>
                <tbody>
                    {% for row in analysis_data %}
                    <tr>
                        <td class="kpi-name">{{ row.kpi }}</td>
                        <td>{{ row.pre_ly_formatted }}</td>
                        <td>{{ row.pre_ty_formatted }}</td>
                        <td class="{{ row.pre_lift_class }}">{{ row.pre_lift_formatted }}</td>
                        <td>{{ row.post_ly_formatted }}</td>
                        <td>{{ row.post_ty_formatted }}</td>
                        <td class="{{ row.post_lift_class }}">{{ row.post_lift_formatted }}</td>
                        <td>
                            <span class="comp-badge {{ row.comp_lift_class }}">
                                {{ row.comp_lift_formatted }}
                            </span>
                        </td>
                    </tr>
                    {% endfor %}
                </tbody>
            </table>
        </div>
        
        <div class="footer">
            This report was automatically generated by The Home Depot OKR Tracking Dashboard.
            For questions, contact Connor Fudge.
        </div>
    </body>
    </html>
    """
    
    # Process analysis data for template
    processed_data = []
    metrics_summary = []
    
    for row in analysis_data:
        kpi = row['kpi']
        
        # Determine direction
        post_lift = row.get('post_lift', 0) or 0
        direction = 'positive' if post_lift > 0 else 'negative' if post_lift < 0 else 'neutral'
        arrow = '↑' if post_lift > 0 else '↓' if post_lift < 0 else '–'
        
        # Format values based on KPI type
        def format_value(val, kpi_name):
            if val is None or (isinstance(val, float) and val != val):  # NaN check
                return '-'
            if kpi_name in ['REVENUE']:
                if abs(val) >= 1000000:
                    return f"${val/1000000:.2f}M"
                if abs(val) >= 1000:
                    return f"${val/1000:.1f}K"
                return f"${val:.0f}"
            if kpi_name in ['AOV', 'RPV']:
                return f"${val:.2f}"
            if kpi_name == 'CVR':
                return f"{val:.2f}%"
            if abs(val) >= 1000000:
                return f"{val/1000000:.2f}M"
            if abs(val) >= 1000:
                return f"{val/1000:.1f}K"
            return f"{val:,.0f}"
        
        def format_lift(val):
            if val is None or (isinstance(val, float) and val != val):
                return '-'
            arrow = '↑' if val > 0 else '↓' if val < 0 else '–'
            return f"{arrow} {abs(val):.2f}%"
        
        def format_change(ty, ly, kpi_name):
            if ty is None or ly is None:
                return '-'
            change = ty - ly
            prefix = '+' if change >= 0 else ''
            if kpi_name in ['REVENUE']:
                if abs(change) >= 1000000:
                    return f"{prefix}${change/1000000:.1f}M"
                if abs(change) >= 1000:
                    return f"{prefix}${change/1000:.0f}K"
                return f"{prefix}${change:.0f}"
            if kpi_name in ['AOV', 'RPV']:
                return f"{prefix}${change:.2f}"
            if kpi_name == 'CVR':
                return f"{prefix}{change:.2f}pp"
            if abs(change) >= 1000000:
                return f"{prefix}{change/1000000:.1f}M"
            if abs(change) >= 1000:
                return f"{prefix}{change/1000:.0f}K"
            return f"{prefix}{change:,.0f}"
        
        def get_class(val):
            if val is None or (isinstance(val, float) and val != val):
                return ''
            return 'positive' if val > 0 else 'negative' if val < 0 else ''
        
        processed_row = {
            'kpi': kpi,
            'pre_ly_formatted': format_value(row.get('pre_ly'), kpi),
            'pre_ty_formatted': format_value(row.get('pre_ty'), kpi),
            'pre_lift_formatted': format_lift(row.get('pre_lift')),
            'pre_lift_class': get_class(row.get('pre_lift')),
            'post_ly_formatted': format_value(row.get('post_ly'), kpi),
            'post_ty_formatted': format_value(row.get('post_ty'), kpi),
            'post_lift_formatted': format_lift(row.get('post_lift')),
            'post_lift_class': get_class(row.get('post_lift')),
            'comp_lift_formatted': format_lift(row.get('pre_post_comp_lift')),
            'comp_lift_class': get_class(row.get('pre_post_comp_lift'))
        }
        processed_data.append(processed_row)
        
        # Summary for metric cards
        metrics_summary.append({
            'kpi': kpi,
            'post_lift': f"{abs(post_lift):.1f}",
            'arrow': arrow,
            'direction': direction,
            'change': format_change(row.get('post_ty'), row.get('post_ly'), kpi)
        })
    
    template = Template(template_str)
    html = template.render(
        use_case=use_case,
        period_label=period_label,
        launch_date=launch_date,
        generated_date=datetime.now().strftime('%B %d, %Y at %I:%M %p'),
        metrics=metrics_summary,
        analysis_data=processed_data
    )
    
    return html


def generate_pdf(analysis_data, use_case, period_label, launch_date):
    """Generate PDF from analysis data."""
    html_content = generate_report_html(analysis_data, use_case, period_label, launch_date)
    
    # PDF options for landscape A4
    options = {
        'page-size': 'A4',
        'orientation': 'Landscape',
        'margin-top': '10mm',
        'margin-right': '10mm',
        'margin-bottom': '10mm',
        'margin-left': '10mm',
        'encoding': 'UTF-8',
        'no-outline': None,
        'enable-local-file-access': None
    }
    
    # Get configuration
    config = get_pdfkit_config()
    
    try:
        if config:
            pdf = pdfkit.from_string(html_content, False, options=options, configuration=config)
        else:
            pdf = pdfkit.from_string(html_content, False, options=options)
        return pdf
    except OSError as e:
        raise Exception(
            f"PDF generation failed. Please install wkhtmltopdf: "
            f"https://wkhtmltopdf.org/downloads.html\n"
            f"Error: {str(e)}"
        )