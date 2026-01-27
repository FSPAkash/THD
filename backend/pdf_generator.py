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


def format_kpi_value(val, kpi_name):
    """Format KPI values based on type."""
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
    """Format lift values with arrows."""
    if val is None or (isinstance(val, float) and val != val):
        return '-'
    arrow = '↑' if val > 0 else '↓' if val < 0 else '–'
    return f"{arrow} {abs(val):.2f}%"


def format_change(ty, ly, kpi_name):
    """Format change values."""
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
    """Get CSS class based on value."""
    if val is None or (isinstance(val, float) and val != val):
        return ''
    return 'positive' if val > 0 else 'negative' if val < 0 else ''


def get_kpi_label(kpi):
    """Get display label for KPI."""
    kpi_labels = {
        'visits': 'Visits',
        'orders': 'Orders',
        'revenue': 'Revenue',
        'cvr': 'Conversion Rate',
        'aov': 'Avg Order Value',
        'rpv': 'Revenue Per Visit'
    }
    return kpi_labels.get(kpi.lower(), kpi.upper())


def generate_report_html(analysis_data, use_case, period_label, launch_date, segment_label=None,
                         chart_data=None, chart_tags=None, chart_display='both', selected_kpi='visits'):
    """Generate HTML for the PDF report with optional chart page."""

    # Base styles shared between pages
    base_styles = """
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

        .page {
            page-break-after: always;
            min-height: 100vh;
        }

        .page:last-child {
            page-break-after: avoid;
        }

        .header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 30px;
            padding-bottom: 20px;
            border-bottom: 2px solid #F96302;
        }

        .logo-text {
            font-size: 20px;
            font-weight: 700;
            color: #1d1d1f;
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

        .segment-info {
            display: inline-block;
            background: rgba(249, 99, 2, 0.1);
            color: #F96302;
            padding: 5px 14px;
            border-radius: 16px;
            font-size: 12px;
            font-weight: 600;
            margin-top: 8px;
            margin-left: 10px;
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

        /* Page 2 - Chart styles */
        .chart-section {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
            margin-bottom: 20px;
        }

        .chart-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 20px;
        }

        .chart-title {
            font-size: 20px;
            font-weight: 700;
            color: #1d1d1f;
        }

        .chart-legend {
            display: flex;
            gap: 20px;
        }

        .legend-item {
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 600;
        }

        .legend-dot {
            width: 10px;
            height: 10px;
            border-radius: 50%;
        }

        .legend-dot.ty { background: #F96302; }
        .legend-dot.ly { background: #86868b; }

        .chart-container {
            width: 100%;
            height: 280px;
            position: relative;
            border: 1px solid #e0e0e0;
            border-radius: 8px;
            padding: 20px;
            background: white;
        }

        .chart-svg {
            width: 100%;
            height: 100%;
        }

        /* Tags Section */
        .tags-section {
            background: white;
            border-radius: 16px;
            padding: 24px;
            box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }

        .tags-title {
            font-size: 18px;
            font-weight: 600;
            color: #1d1d1f;
            margin-bottom: 16px;
        }

        .tags-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
            gap: 16px;
        }

        .tag-card {
            border-radius: 12px;
            padding: 16px;
            border-left: 4px solid;
            background: #f8f8f8;
        }

        .tag-card-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 8px;
        }

        .tag-name {
            font-size: 14px;
            font-weight: 700;
            color: #1d1d1f;
        }

        .tag-date {
            font-size: 11px;
            font-weight: 600;
            color: #86868b;
            background: #e8e8e8;
            padding: 2px 8px;
            border-radius: 10px;
        }

        .tag-description {
            font-size: 12px;
            color: #6e6e73;
            line-height: 1.5;
            margin-bottom: 8px;
        }

        .tag-owner {
            font-size: 11px;
            color: #86868b;
        }

        .tag-owner-label {
            font-weight: 600;
        }

        .no-tags {
            text-align: center;
            padding: 30px;
            color: #86868b;
            font-style: italic;
        }
    """

    # Process analysis data for template
    processed_data = []
    metrics_summary = []

    for row in analysis_data:
        kpi = row['kpi']
        post_lift = row.get('post_lift', 0) or 0
        direction = 'positive' if post_lift > 0 else 'negative' if post_lift < 0 else 'neutral'
        arrow = '↑' if post_lift > 0 else '↓' if post_lift < 0 else '–'

        processed_row = {
            'kpi': kpi,
            'pre_ly_formatted': format_kpi_value(row.get('pre_ly'), kpi),
            'pre_ty_formatted': format_kpi_value(row.get('pre_ty'), kpi),
            'pre_lift_formatted': format_lift(row.get('pre_lift')),
            'pre_lift_class': get_class(row.get('pre_lift')),
            'post_ly_formatted': format_kpi_value(row.get('post_ly'), kpi),
            'post_ty_formatted': format_kpi_value(row.get('post_ty'), kpi),
            'post_lift_formatted': format_lift(row.get('post_lift')),
            'post_lift_class': get_class(row.get('post_lift')),
            'comp_lift_formatted': format_lift(row.get('pre_post_comp_lift')),
            'comp_lift_class': get_class(row.get('pre_post_comp_lift'))
        }
        processed_data.append(processed_row)

        metrics_summary.append({
            'kpi': kpi,
            'post_lift': f"{abs(post_lift):.1f}",
            'arrow': arrow,
            'direction': direction,
            'change': format_change(row.get('post_ty'), row.get('post_ly'), kpi)
        })

    # Generate SVG chart if data is available
    chart_svg = ''
    if chart_data and len(chart_data) > 0:
        chart_svg = generate_line_chart_svg(chart_data, selected_kpi, chart_display, chart_tags)

    # Process tags for display
    processed_tags = []
    if chart_tags:
        for tag in chart_tags:
            processed_tags.append({
                'name': tag.get('name', 'Unnamed'),
                'description': tag.get('description', ''),
                'owner': tag.get('owner', ''),
                'date': tag.get('date', ''),
                'color': tag.get('color', '#6e6e73')
            })

    # Determine if we need a second page
    has_second_page = bool(chart_data) or bool(chart_tags)

    template_str = """
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="UTF-8">
        <style>
            {{ base_styles }}
        </style>
    </head>
    <body>
        <!-- Page 1: KPI Summary -->
        <div class="page">
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
                {% if segment_label %}
                <span class="segment-info">{{ segment_label }}</span>
                {% endif %}
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
        </div>

        {% if has_second_page %}
        <!-- Page 2: Chart and Tags -->
        <div class="page">
            <div class="header">
                <span class="logo-text">Advanced Analytics</span>
                <div class="report-info">
                    <div class="report-title">Trend Analysis & Events</div>
                    <div class="report-date">{{ use_case }}</div>
                </div>
            </div>

            {% if chart_svg %}
            <div class="chart-section">
                <div class="chart-header">
                    <div class="chart-title">{{ kpi_label }} Trend</div>
                    <div class="chart-legend">
                        {% if chart_display in ['both', 'ty'] %}
                        <div class="legend-item">
                            <span class="legend-dot ty"></span>
                            <span>This Year (TY)</span>
                        </div>
                        {% endif %}
                        {% if chart_display in ['both', 'ly'] %}
                        <div class="legend-item">
                            <span class="legend-dot ly"></span>
                            <span>Last Year (LY)</span>
                        </div>
                        {% endif %}
                    </div>
                </div>
                <div class="chart-container">
                    {{ chart_svg | safe }}
                </div>
            </div>
            {% endif %}

            <div class="tags-section">
                <div class="tags-title">Events & Annotations</div>
                {% if tags and tags|length > 0 %}
                <div class="tags-grid">
                    {% for tag in tags %}
                    <div class="tag-card" style="border-color: {{ tag.color }};">
                        <div class="tag-card-header">
                            <span class="tag-name">{{ tag.name }}</span>
                            {% if tag.date %}
                            <span class="tag-date">{{ tag.date }}</span>
                            {% endif %}
                        </div>
                        {% if tag.description %}
                        <div class="tag-description">{{ tag.description }}</div>
                        {% endif %}
                        {% if tag.owner %}
                        <div class="tag-owner">
                            <span class="tag-owner-label">Owner:</span> {{ tag.owner }}
                        </div>
                        {% endif %}
                    </div>
                    {% endfor %}
                </div>
                {% else %}
                <div class="no-tags">No events or annotations added to this report.</div>
                {% endif %}
            </div>

            <div class="footer">
                This report was automatically generated by The Home Depot OKR Tracking Dashboard.
                For questions, contact Connor Fudge.
            </div>
        </div>
        {% endif %}
    </body>
    </html>
    """

    template = Template(template_str)
    html = template.render(
        base_styles=base_styles,
        use_case=use_case,
        period_label=period_label,
        launch_date=launch_date,
        segment_label=segment_label,
        generated_date=datetime.now().strftime('%B %d, %Y at %I:%M %p'),
        metrics=metrics_summary,
        analysis_data=processed_data,
        has_second_page=has_second_page,
        chart_svg=chart_svg,
        chart_display=chart_display,
        kpi_label=get_kpi_label(selected_kpi),
        tags=processed_tags
    )

    return html


def generate_line_chart_svg(data, kpi, display_mode='both', chart_tags=None):
    """Generate an SVG line chart from the data with optional tag markers."""
    if not data:
        return ''

    # Chart dimensions
    width = 900
    height = 240
    padding_left = 60
    padding_right = 40
    padding_top = 20
    padding_bottom = 40

    chart_width = width - padding_left - padding_right
    chart_height = height - padding_top - padding_bottom

    # Get the KPI keys
    ty_key = f"{kpi}_ty"
    ly_key = f"{kpi}_ly"

    # Extract values
    ty_values = []
    ly_values = []
    dates = []

    for d in data:
        dates.append(d.get('date', ''))
        ty_val = d.get(ty_key)
        ly_val = d.get(ly_key)
        ty_values.append(ty_val if ty_val is not None else 0)
        ly_values.append(ly_val if ly_val is not None else 0)

    if not dates:
        return ''

    # Calculate min/max for scale
    all_values = []
    if display_mode in ['both', 'ty']:
        all_values.extend([v for v in ty_values if v is not None])
    if display_mode in ['both', 'ly']:
        all_values.extend([v for v in ly_values if v is not None])

    if not all_values:
        return ''

    min_val = min(all_values) * 0.95
    max_val = max(all_values) * 1.05

    if min_val == max_val:
        min_val = min_val * 0.9
        max_val = max_val * 1.1

    val_range = max_val - min_val

    # Generate points
    def get_points(values):
        points = []
        for i, val in enumerate(values):
            if val is not None:
                x = padding_left + (i / (len(values) - 1)) * chart_width if len(values) > 1 else padding_left + chart_width / 2
                y = padding_top + chart_height - ((val - min_val) / val_range) * chart_height
                points.append((x, y))
        return points

    ty_points = get_points(ty_values)
    ly_points = get_points(ly_values)

    # Build SVG
    svg_parts = [f'<svg class="chart-svg" viewBox="0 0 {width} {height}" xmlns="http://www.w3.org/2000/svg">']

    # Grid lines
    num_grid_lines = 5
    svg_parts.append('<g class="grid-lines">')
    for i in range(num_grid_lines + 1):
        y = padding_top + (i / num_grid_lines) * chart_height
        svg_parts.append(f'<line x1="{padding_left}" y1="{y}" x2="{width - padding_right}" y2="{y}" stroke="#e0e0e0" stroke-width="1"/>')
        # Y-axis labels
        val = max_val - (i / num_grid_lines) * val_range
        label = format_chart_value(val, kpi)
        svg_parts.append(f'<text x="{padding_left - 10}" y="{y + 4}" text-anchor="end" font-size="10" fill="#86868b">{label}</text>')
    svg_parts.append('</g>')

    # X-axis labels (show every Nth date)
    svg_parts.append('<g class="x-labels">')
    num_labels = min(8, len(dates))
    step = max(1, len(dates) // num_labels)
    for i in range(0, len(dates), step):
        x = padding_left + (i / (len(dates) - 1)) * chart_width if len(dates) > 1 else padding_left + chart_width / 2
        date_label = dates[i][5:10] if len(dates[i]) >= 10 else dates[i]  # Show MM-DD
        svg_parts.append(f'<text x="{x}" y="{height - 10}" text-anchor="middle" font-size="9" fill="#86868b">{date_label}</text>')
    svg_parts.append('</g>')

    # LY line (draw first so TY is on top)
    if display_mode in ['both', 'ly'] and ly_points:
        points_str = ' '.join([f"{p[0]},{p[1]}" for p in ly_points])
        svg_parts.append(f'<polyline points="{points_str}" fill="none" stroke="#86868b" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>')

    # TY line
    if display_mode in ['both', 'ty'] and ty_points:
        points_str = ' '.join([f"{p[0]},{p[1]}" for p in ty_points])
        svg_parts.append(f'<polyline points="{points_str}" fill="none" stroke="#F96302" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>')

    # Draw tag markers (vertical lines) if tags are provided
    if chart_tags and len(chart_tags) > 0:
        svg_parts.append('<g class="tag-markers">')
        for tag in chart_tags:
            tag_date = tag.get('date', '')
            tag_color = tag.get('color', '#6e6e73')
            tag_name = tag.get('name', '')

            # Find the index of this date in the data
            tag_index = -1
            for i, d in enumerate(data):
                if d.get('date') == tag_date:
                    tag_index = i
                    break

            if tag_index >= 0 and len(dates) > 1:
                # Calculate x position for this tag
                x = padding_left + (tag_index / (len(dates) - 1)) * chart_width

                # Draw vertical line from top to bottom of chart area
                svg_parts.append(f'<line x1="{x}" y1="{padding_top}" x2="{x}" y2="{height - padding_bottom}" stroke="{tag_color}" stroke-width="2" stroke-dasharray="4 2" opacity="0.7"/>')

                # Draw a small circle at top
                svg_parts.append(f'<circle cx="{x}" cy="{padding_top + 8}" r="4" fill="{tag_color}"/>')

                # Draw tag name label at top (rotated if needed)
                if tag_name:
                    # Truncate long names
                    display_name = tag_name[:12] + '...' if len(tag_name) > 12 else tag_name
                    svg_parts.append(f'<text x="{x + 6}" y="{padding_top + 12}" font-size="8" fill="{tag_color}" font-weight="600">{display_name}</text>')
        svg_parts.append('</g>')

    svg_parts.append('</svg>')

    return '\n'.join(svg_parts)


def format_chart_value(val, kpi):
    """Format values for chart axis labels."""
    kpi_lower = kpi.lower()
    if kpi_lower in ['revenue']:
        if abs(val) >= 1000000:
            return f"${val/1000000:.1f}M"
        if abs(val) >= 1000:
            return f"${val/1000:.0f}K"
        return f"${val:.0f}"
    if kpi_lower in ['aov', 'rpv']:
        return f"${val:.0f}"
    if kpi_lower == 'cvr':
        return f"{val:.1f}%"
    if abs(val) >= 1000000:
        return f"{val/1000000:.1f}M"
    if abs(val) >= 1000:
        return f"{val/1000:.0f}K"
    return f"{val:,.0f}"


def generate_pdf(analysis_data, use_case, period_label, launch_date, segment_label=None,
                 chart_data=None, chart_tags=None, chart_display='both', selected_kpi='visits'):
    """Generate PDF from analysis data."""
    html_content = generate_report_html(
        analysis_data, use_case, period_label, launch_date, segment_label,
        chart_data=chart_data, chart_tags=chart_tags,
        chart_display=chart_display, selected_kpi=selected_kpi
    )

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
