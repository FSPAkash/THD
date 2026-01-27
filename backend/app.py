from flask import Flask, request, jsonify, send_from_directory, Response
from flask_jwt_extended import JWTManager, create_access_token, jwt_required, get_jwt_identity, get_jwt
from werkzeug.utils import secure_filename
import os
import pandas as pd
from datetime import datetime
import json
import numpy as np
import traceback

from config import Config
from utils import (
    parse_excel_data,
    calculate_pre_post_metrics,
    get_daily_kpi_data,
    get_kpi_summary,
    get_use_cases,
    get_launch_date,
    get_stakeholders,
    get_daily_comparison_data
)

try:
    from pdf_generator import generate_pdf
    PDF_AVAILABLE = True
except ImportError as e:
    print(f"PDF generation not available: {e}")
    PDF_AVAILABLE = False

try:
    from email_service import init_mail, send_report_email, get_current_outlook_user, create_draft_email
    EMAIL_AVAILABLE = True
except ImportError as e:
    print(f"Email service not available: {e}")
    EMAIL_AVAILABLE = False

try:
    from keep_alive import init_keep_alive
    KEEP_ALIVE_AVAILABLE = True
except ImportError as e:
    print(f"Keep-alive service not available: {e}")
    KEEP_ALIVE_AVAILABLE = False


class NumpyEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, (np.integer, np.int64, np.int32)):
            return int(obj)
        elif isinstance(obj, (np.floating, np.float64, np.float32)):
            return float(obj)
        elif isinstance(obj, np.ndarray):
            return obj.tolist()
        elif isinstance(obj, (np.bool_,)):
            return bool(obj)
        elif pd.isna(obj):
            return None
        return super(NumpyEncoder, self).default(obj)


app = Flask(__name__, static_folder='../frontend/build', static_url_path='')
app.config.from_object(Config)
app.json_encoder = NumpyEncoder

jwt = JWTManager(app)


@app.after_request
def after_request(response):
    origin = request.headers.get('Origin', '*')
    response.headers['Access-Control-Allow-Origin'] = origin
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
    response.headers['Access-Control-Allow-Credentials'] = 'true'
    return response


@app.before_request
def handle_preflight():
    if request.method == 'OPTIONS':
        response = Response()
        origin = request.headers.get('Origin', '*')
        response.headers['Access-Control-Allow-Origin'] = origin
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization, X-Requested-With, Accept'
        response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS, PATCH'
        response.headers['Access-Control-Allow-Credentials'] = 'true'
        response.headers['Access-Control-Max-Age'] = '3600'
        return response, 200


if EMAIL_AVAILABLE:
    try:
        init_mail(app)
        print("Outlook email service initialized")
    except Exception as e:
        print(f"Failed to initialize email: {e}")
        EMAIL_AVAILABLE = False

os.makedirs(app.config['UPLOAD_FOLDER'], exist_ok=True)

cached_data = {
    'daily_data': None,
    'feature_config': None,
    'last_updated': None
}


def load_cached_data():
    """Load data from saved file if exists."""
    data_file = os.path.join(app.config['UPLOAD_FOLDER'], 'current_data.xlsx')
    if os.path.exists(data_file):
        try:
            parsed = parse_excel_data(data_file)
            cached_data['daily_data'] = parsed['daily_data']
            cached_data['feature_config'] = parsed['feature_config']
            cached_data['last_updated'] = datetime.fromtimestamp(os.path.getmtime(data_file))
            return True
        except Exception as e:
            print(f"Error loading cached data: {e}")
    return False


load_cached_data()

# Initialize keep-alive service for Render.com (must be at module level for Gunicorn)
if KEEP_ALIVE_AVAILABLE:
    try:
        init_keep_alive()
        print("Keep-alive service initialized")
    except Exception as e:
        print(f"Failed to initialize keep-alive: {e}")


@app.route('/')
def serve():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy', 
        'timestamp': datetime.now().isoformat(),
        'pdf_available': PDF_AVAILABLE,
        'email_available': EMAIL_AVAILABLE,
        'email_type': 'outlook_local' if EMAIL_AVAILABLE else None
    })


@app.route('/api/auth/login', methods=['POST'])
def login():
    data = request.get_json()
    username = data.get('username', '')
    password = data.get('password', '')
    
    if username in Config.USERS and Config.USERS[username]['password'] == password:
        user = Config.USERS[username]
        access_token = create_access_token(
            identity=username,
            additional_claims={'role': user['role'], 'name': user['name']}
        )
        return jsonify({
            'access_token': access_token,
            'user': {
                'username': username,
                'role': user['role'],
                'name': user['name']
            }
        })
    
    return jsonify({'error': 'Invalid credentials'}), 401


@app.route('/api/auth/verify', methods=['GET'])
@jwt_required()
def verify_token():
    current_user = get_jwt_identity()
    claims = get_jwt()
    return jsonify({
        'valid': True,
        'user': {
            'username': current_user,
            'role': claims.get('role'),
            'name': claims.get('name')
        }
    })


@app.route('/api/upload', methods=['POST'])
@jwt_required()
def upload_file():
    claims = get_jwt()
    if claims.get('role') not in ['dev', 'admin']:
        return jsonify({'error': 'Unauthorized. Dev mode required.'}), 403
    
    if 'file' not in request.files:
        return jsonify({'error': 'No file provided'}), 400
    
    file = request.files['file']
    if file.filename == '':
        return jsonify({'error': 'No file selected'}), 400
    
    if not file.filename.endswith(('.xlsx', '.xls')):
        return jsonify({'error': 'Invalid file format. Please upload an Excel file.'}), 400
    
    try:
        filename = 'current_data.xlsx'
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        file.save(filepath)
        
        parsed = parse_excel_data(filepath)
        cached_data['daily_data'] = parsed['daily_data']
        cached_data['feature_config'] = parsed['feature_config']
        cached_data['last_updated'] = datetime.now()
        
        use_cases = get_use_cases(parsed['feature_config'])
        
        return jsonify({
            'message': 'File uploaded successfully',
            'records': int(len(parsed['daily_data'])),
            'use_cases': use_cases,
            'last_updated': cached_data['last_updated'].isoformat()
        })
    except Exception as e:
        print(f"Upload Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/kpi/summary', methods=['GET'])
@jwt_required()
def kpi_summary():
    if cached_data['daily_data'] is None:
        return jsonify({'error': 'No data available. Please upload data first.'}), 404

    use_case = request.args.get('use_case')
    period = request.args.get('period', 'all')
    business_segment = request.args.get('business_segment')
    device_type = request.args.get('device_type')
    page_type = request.args.get('page_type')

    try:
        if use_case:
            filtered_data = cached_data['daily_data'][cached_data['daily_data']['use_case'] == use_case]
            launch_date = get_launch_date(cached_data['feature_config'], use_case)
        else:
            filtered_data = cached_data['daily_data']
            launch_date = None

        period_days = None if period == 'all' else period
        summary = get_kpi_summary(
            filtered_data, launch_date, period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        return jsonify({
            'summary': summary,
            'last_updated': cached_data['last_updated'].isoformat() if cached_data['last_updated'] else None
        })
    except Exception as e:
        print(f"Summary Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/kpi/daily', methods=['GET'])
@jwt_required()
def kpi_daily():
    if cached_data['daily_data'] is None:
        return jsonify({'error': 'No data available. Please upload data first.'}), 404

    use_case = request.args.get('use_case')
    kpi = request.args.get('kpi', 'visits')
    period = request.args.get('period', 'all')
    business_segment = request.args.get('business_segment')
    device_type = request.args.get('device_type')
    page_type = request.args.get('page_type')

    try:
        launch_date = None
        if use_case:
            launch_date = get_launch_date(cached_data['feature_config'], use_case)

        period_days = None if period == 'all' else period

        result = get_daily_kpi_data(
            cached_data['daily_data'],
            use_case=use_case,
            kpi=kpi,
            launch_date=launch_date,
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        return jsonify({
            'data': result,
            'kpi': kpi,
            'period': period,
            'launch_date': launch_date
        })
    except Exception as e:
        print(f"Daily Data Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/kpi/comparison', methods=['GET'])
@jwt_required()
def kpi_comparison():
    """Get daily TY vs LY comparison data for charts."""
    if cached_data['daily_data'] is None:
        return jsonify({'error': 'No data available. Please upload data first.'}), 404

    use_case = request.args.get('use_case')
    kpi = request.args.get('kpi', 'visits')
    period = request.args.get('period', 'all')
    business_segment = request.args.get('business_segment')
    device_type = request.args.get('device_type')
    page_type = request.args.get('page_type')

    try:
        launch_date = None
        if use_case:
            launch_date = get_launch_date(cached_data['feature_config'], use_case)

        period_days = None if period == 'all' else period

        result = get_daily_comparison_data(
            cached_data['daily_data'],
            use_case=use_case,
            kpi=kpi,
            launch_date=launch_date,
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        return jsonify({
            'data': result,
            'kpi': kpi,
            'period': period,
            'launch_date': launch_date
        })
    except Exception as e:
        print(f"Comparison Data Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/kpi/analysis', methods=['GET'])
@jwt_required()
def kpi_analysis():
    if cached_data['daily_data'] is None or cached_data['feature_config'] is None:
        return jsonify({'error': 'No data available. Please upload data first.'}), 404

    use_case = request.args.get('use_case')
    period = request.args.get('period', 'all')
    business_segment = request.args.get('business_segment')
    device_type = request.args.get('device_type')
    page_type = request.args.get('page_type')

    try:
        period_days = None if period == 'all' else period

        results = calculate_pre_post_metrics(
            cached_data['daily_data'],
            cached_data['feature_config'],
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        if not results:
            return jsonify({
                'analysis': [],
                'message': 'No analysis results. Check if launch dates are in the past.',
                'last_updated': cached_data['last_updated'].isoformat() if cached_data['last_updated'] else None
            })

        if use_case:
            results = [r for r in results if r['use_case'] == use_case]

        return jsonify({
            'analysis': results,
            'period': period,
            'last_updated': cached_data['last_updated'].isoformat() if cached_data['last_updated'] else None
        })
    except Exception as e:
        print(f"Analysis Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Analysis calculation failed: {str(e)}'}), 500


@app.route('/api/use-cases', methods=['GET'])
@jwt_required()
def list_use_cases():
    if cached_data['feature_config'] is None:
        return jsonify({'use_cases': [], 'configs': []})
    
    try:
        use_cases = get_use_cases(cached_data['feature_config'])
        
        configs = []
        for _, row in cached_data['feature_config'].iterrows():
            config = {
                'use_case': str(row['use_case']),
                'launch_date': row['launch_date'].strftime('%Y-%m-%d') if hasattr(row['launch_date'], 'strftime') else str(row['launch_date'])
            }
            if 'description' in row and not pd.isna(row['description']):
                config['description'] = str(row['description'])
            configs.append(config)
        
        return jsonify({
            'use_cases': use_cases,
            'configs': configs
        })
    except Exception as e:
        print(f"Use Cases Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/segments/page-types', methods=['GET'])
@jwt_required()
def get_page_types():
    """Get unique page types for the filter dropdown."""
    if cached_data['daily_data'] is None:
        return jsonify({'page_types': ['All']})

    try:
        from utils import get_unique_page_types
        page_types = get_unique_page_types(cached_data['daily_data'])
        return jsonify({'page_types': page_types})
    except Exception as e:
        print(f"Page Types Error: {str(e)}")
        return jsonify({'page_types': ['All']})


@app.route('/api/data/status', methods=['GET'])
@jwt_required()
def data_status():
    has_data = cached_data['daily_data'] is not None
    
    try:
        use_cases = get_use_cases(cached_data['feature_config']) if cached_data['feature_config'] is not None else []
        records = int(len(cached_data['daily_data'])) if has_data else 0
        
        configs = []
        if cached_data['feature_config'] is not None:
            for _, row in cached_data['feature_config'].iterrows():
                configs.append({
                    'use_case': str(row['use_case']),
                    'launch_date': row['launch_date'].strftime('%Y-%m-%d')
                })
        
        return jsonify({
            'has_data': has_data,
            'last_updated': cached_data['last_updated'].isoformat() if cached_data['last_updated'] else None,
            'records': records,
            'use_cases': use_cases,
            'configs': configs
        })
    except Exception as e:
        print(f"Status Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': str(e)}), 500


@app.route('/api/stakeholders', methods=['GET'])
@jwt_required()
def get_stakeholders_list():
    """Get stakeholders for a use case."""
    if cached_data['feature_config'] is None:
        return jsonify({'stakeholders': []})
    
    use_case = request.args.get('use_case')
    
    if not use_case:
        return jsonify({'error': 'use_case parameter required'}), 400
    
    try:
        stakeholders = get_stakeholders(cached_data['feature_config'], use_case)
        return jsonify({
            'stakeholders': stakeholders,
            'use_case': use_case
        })
    except Exception as e:
        print(f"Stakeholders Error: {str(e)}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/report/preview', methods=['GET', 'POST'])
@jwt_required()
def preview_report():
    """Generate PDF preview."""
    if not PDF_AVAILABLE:
        return jsonify({'error': 'PDF generation is not available. Please install weasyprint.'}), 503

    if cached_data['daily_data'] is None or cached_data['feature_config'] is None:
        return jsonify({'error': 'No data available'}), 404

    # Support both GET (simple preview) and POST (with chart data/tags)
    if request.method == 'POST':
        data = request.get_json() or {}
        use_case = data.get('use_case')
        period = data.get('period', 'all')
        business_segment = data.get('business_segment')
        device_type = data.get('device_type')
        page_type = data.get('page_type')
        chart_tags = data.get('chart_tags', [])
        chart_display = data.get('chart_display', 'both')  # 'ty', 'ly', or 'both'
        selected_kpi = data.get('selected_kpi', 'visits')
    else:
        use_case = request.args.get('use_case')
        period = request.args.get('period', 'all')
        business_segment = request.args.get('business_segment')
        device_type = request.args.get('device_type')
        page_type = request.args.get('page_type')
        chart_tags = []
        chart_display = request.args.get('chart_display', 'both')
        selected_kpi = request.args.get('selected_kpi', 'visits')

    if not use_case:
        return jsonify({'error': 'use_case parameter required'}), 400

    try:
        period_days = None if period == 'all' else period

        analysis = calculate_pre_post_metrics(
            cached_data['daily_data'],
            cached_data['feature_config'],
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        analysis = [r for r in analysis if r['use_case'] == use_case]

        if not analysis:
            return jsonify({'error': 'No analysis data for this use case'}), 404

        launch_date = analysis[0]['launch_date']
        total_days = analysis[0].get('total_post_days', 0)
        period_days_actual = analysis[0].get('period_days', total_days)

        if period == 'all':
            period_label = f"{total_days} days post-launch"
        else:
            period_label = f"{period_days_actual} days post-launch"

        # Build segment filter label
        segment_filters = []
        if business_segment and business_segment.lower() not in ['all', '']:
            segment_filters.append(f"Business: {business_segment}")
        if device_type and device_type.lower() not in ['all', '']:
            segment_filters.append(f"Device: {device_type}")
        if page_type and page_type.lower() not in ['all', '']:
            segment_filters.append(f"Page: {page_type}")
        segment_label = " | ".join(segment_filters) if segment_filters else None

        # Get chart comparison data for the PDF
        chart_data = get_daily_comparison_data(
            cached_data['daily_data'],
            use_case=use_case,
            kpi=selected_kpi,
            launch_date=launch_date,
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        pdf_data = generate_pdf(
            analysis, use_case, period_label, launch_date, segment_label,
            chart_data=chart_data,
            chart_tags=chart_tags,
            chart_display=chart_display,
            selected_kpi=selected_kpi
        )

        return Response(
            pdf_data,
            mimetype='application/pdf',
            headers={
                'Content-Disposition': f'inline; filename=report_{use_case.replace(" ", "_")}.pdf'
            }
        )
    except Exception as e:
        print(f"PDF Generation Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'PDF generation failed: {str(e)}'}), 500


@app.route('/api/report/send', methods=['POST'])
@jwt_required()
def send_report():
    """Send report to stakeholders via local Outlook."""
    if not EMAIL_AVAILABLE:
        return jsonify({
            'error': 'Email service is not available. Please install pywin32: pip install pywin32'
        }), 503

    if not PDF_AVAILABLE:
        return jsonify({
            'error': 'PDF generation is not available. Please install weasyprint.'
        }), 503

    if cached_data['daily_data'] is None or cached_data['feature_config'] is None:
        return jsonify({'error': 'No data available'}), 404

    data = request.get_json()
    use_case = data.get('use_case')
    period = data.get('period', 'all')
    recipients = data.get('recipients', [])
    business_segment = data.get('business_segment')
    device_type = data.get('device_type')
    page_type = data.get('page_type')
    chart_tags = data.get('chart_tags', [])
    chart_display = data.get('chart_display', 'both')
    selected_kpi = data.get('selected_kpi', 'visits')

    if not use_case:
        return jsonify({'error': 'use_case is required'}), 400

    if not recipients:
        return jsonify({'error': 'At least one recipient is required'}), 400

    valid_recipients = []
    for email in recipients:
        email = email.strip()
        if email and '@' in email and '.' in email:
            valid_recipients.append(email)

    if not valid_recipients:
        return jsonify({'error': 'No valid email addresses provided'}), 400

    try:
        period_days = None if period == 'all' else period

        analysis = calculate_pre_post_metrics(
            cached_data['daily_data'],
            cached_data['feature_config'],
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        analysis = [r for r in analysis if r['use_case'] == use_case]

        if not analysis:
            return jsonify({'error': 'No analysis data for this use case'}), 404

        launch_date = analysis[0]['launch_date']
        total_days = analysis[0].get('total_post_days', 0)
        period_days_actual = analysis[0].get('period_days', total_days)

        if period == 'all':
            period_label = f"{total_days} days post-launch"
        else:
            period_label = f"{period_days_actual} days post-launch"

        # Build segment filter label
        segment_filters = []
        if business_segment and business_segment.lower() not in ['all', '']:
            segment_filters.append(f"Business: {business_segment}")
        if device_type and device_type.lower() not in ['all', '']:
            segment_filters.append(f"Device: {device_type}")
        if page_type and page_type.lower() not in ['all', '']:
            segment_filters.append(f"Page: {page_type}")
        segment_label = " | ".join(segment_filters) if segment_filters else None

        # Get chart comparison data for the PDF
        chart_data = get_daily_comparison_data(
            cached_data['daily_data'],
            use_case=use_case,
            kpi=selected_kpi,
            launch_date=launch_date,
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        print(f"Generating PDF for {use_case}...")
        pdf_data = generate_pdf(
            analysis, use_case, period_label, launch_date, segment_label,
            chart_data=chart_data,
            chart_tags=chart_tags,
            chart_display=chart_display,
            selected_kpi=selected_kpi
        )
        print(f"PDF generated, size: {len(pdf_data)} bytes")

        print(f"Sending email via Outlook to {valid_recipients}...")
        result = send_report_email(valid_recipients, use_case, period_label, pdf_data)
        print(f"Email sent successfully via Outlook")

        return jsonify({
            'success': True,
            'message': f'Report sent to {len(result["recipients"])} recipient(s) via Outlook',
            'recipients': result['recipients']
        })
    except Exception as e:
        print(f"Email Send Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to send email: {str(e)}'}), 500


@app.route('/api/report/draft', methods=['POST'])
@jwt_required()
def create_report_draft():
    """Create a draft email in Outlook for user review before sending."""
    if not EMAIL_AVAILABLE:
        return jsonify({
            'error': 'Email service is not available. Please install pywin32: pip install pywin32'
        }), 503

    if not PDF_AVAILABLE:
        return jsonify({
            'error': 'PDF generation is not available. Please install weasyprint.'
        }), 503

    if cached_data['daily_data'] is None or cached_data['feature_config'] is None:
        return jsonify({'error': 'No data available'}), 404

    data = request.get_json()
    use_case = data.get('use_case')
    period = data.get('period', 'all')
    recipients = data.get('recipients', [])
    business_segment = data.get('business_segment')
    device_type = data.get('device_type')
    page_type = data.get('page_type')
    chart_tags = data.get('chart_tags', [])
    chart_display = data.get('chart_display', 'both')
    selected_kpi = data.get('selected_kpi', 'visits')

    if not use_case:
        return jsonify({'error': 'use_case is required'}), 400

    valid_recipients = []
    for email in recipients:
        email = email.strip()
        if email and '@' in email and '.' in email:
            valid_recipients.append(email)

    try:
        period_days = None if period == 'all' else period

        analysis = calculate_pre_post_metrics(
            cached_data['daily_data'],
            cached_data['feature_config'],
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        analysis = [r for r in analysis if r['use_case'] == use_case]

        if not analysis:
            return jsonify({'error': 'No analysis data for this use case'}), 404

        launch_date = analysis[0]['launch_date']
        total_days = analysis[0].get('total_post_days', 0)
        period_days_actual = analysis[0].get('period_days', total_days)

        if period == 'all':
            period_label = f"{total_days} days post-launch"
        else:
            period_label = f"{period_days_actual} days post-launch"

        # Build segment filter label
        segment_filters = []
        if business_segment and business_segment.lower() not in ['all', '']:
            segment_filters.append(f"Business: {business_segment}")
        if device_type and device_type.lower() not in ['all', '']:
            segment_filters.append(f"Device: {device_type}")
        if page_type and page_type.lower() not in ['all', '']:
            segment_filters.append(f"Page: {page_type}")
        segment_label = " | ".join(segment_filters) if segment_filters else None

        # Get chart comparison data for the PDF
        chart_data = get_daily_comparison_data(
            cached_data['daily_data'],
            use_case=use_case,
            kpi=selected_kpi,
            launch_date=launch_date,
            period_days=period_days,
            business_segment=business_segment,
            device_type=device_type,
            page_type=page_type
        )

        pdf_data = generate_pdf(
            analysis, use_case, period_label, launch_date, segment_label,
            chart_data=chart_data,
            chart_tags=chart_tags,
            chart_display=chart_display,
            selected_kpi=selected_kpi
        )

        result = create_draft_email(valid_recipients, use_case, period_label, pdf_data)

        return jsonify({
            'success': True,
            'message': 'Draft opened in Outlook',
            'recipients': result.get('recipients', [])
        })
    except Exception as e:
        print(f"Draft Creation Error: {str(e)}")
        print(traceback.format_exc())
        return jsonify({'error': f'Failed to create draft: {str(e)}'}), 500


@app.route('/api/email/current-user', methods=['GET'])
@jwt_required()
def get_outlook_user():
    """Get the current Outlook user's email address."""
    if not EMAIL_AVAILABLE:
        return jsonify({
            'success': False,
            'error': 'Email service is not available'
        }), 503
    
    try:
        result = get_current_outlook_user()
        return jsonify(result)
    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500


@app.route('/api/email/test', methods=['POST'])
@jwt_required()
def test_email():
    """Test email configuration."""
    claims = get_jwt()
    if claims.get('role') not in ['dev', 'admin']:
        return jsonify({'error': 'Unauthorized. Dev mode required.'}), 403
    
    if not EMAIL_AVAILABLE:
        return jsonify({
            'configured': False,
            'error': 'Outlook email service not available. Run: pip install pywin32'
        })
    
    try:
        outlook_user = get_current_outlook_user()
        
        return jsonify({
            'configured': outlook_user.get('success', False),
            'type': 'outlook_local',
            'outlook_user': outlook_user,
            'pdf_available': PDF_AVAILABLE
        })
    except Exception as e:
        return jsonify({
            'configured': False,
            'error': str(e)
        })


@app.errorhandler(404)
def not_found(e):
    return send_from_directory(app.static_folder, 'index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5000))
    debug = os.environ.get('FLASK_DEBUG', 'true').lower() == 'true'
    print(f"Starting server on port {port}")
    print(f"PDF Available: {PDF_AVAILABLE}")
    print(f"Email Available: {EMAIL_AVAILABLE}")
    if EMAIL_AVAILABLE:
        print("Email Type: Local Outlook Application")

    app.run(host='0.0.0.0', port=port, debug=debug)