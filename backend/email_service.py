import pythoncom
import win32com.client
import threading
import tempfile
import os
from datetime import datetime


def init_mail(app):
    """Initialize email service - kept for compatibility but not needed for Outlook."""
    pass


def get_current_outlook_user():
    """
    Get the email address of the currently signed-in Outlook user.
    Prioritizes @homedepot.com accounts.
    """
    pythoncom.CoInitialize()
    try:
        outlook = win32com.client.Dispatch('Outlook.Application')
        namespace = outlook.GetNamespace("MAPI")
        accounts = namespace.Accounts
        
        if accounts.Count == 0:
            return {
                "success": False,
                "message": "No Outlook accounts found. Please sign in to Outlook."
            }
        
        # Look for Home Depot account first
        homedepot_account = None
        all_accounts = []
        
        for i in range(1, accounts.Count + 1):
            account = accounts.Item(i)
            email = account.SmtpAddress.lower() if account.SmtpAddress else ""
            display_name = account.DisplayName
            
            all_accounts.append({
                "email": account.SmtpAddress,
                "display_name": display_name
            })
            
            if "@homedepot.com" in email:
                homedepot_account = account
                break
        
        # If Home Depot account found, use it
        if homedepot_account:
            return {
                "success": True,
                "email": homedepot_account.SmtpAddress,
                "display_name": homedepot_account.DisplayName,
                "is_homedepot": True
            }
        
        # No Home Depot account found
        return {
            "success": False,
            "message": "Please sign in to your Home Depot (@homedepot.com) Outlook account.",
            "accounts_found": len(all_accounts),
            "is_homedepot": False
        }
            
    except Exception as e:
        return {
            "success": False,
            "message": f"Failed to connect to Outlook: {str(e)}"
        }
    finally:
        pythoncom.CoUninitialize()


def get_homedepot_account():
    """
    Get the Home Depot Outlook account for sending emails.
    Returns the account object or raises an exception.
    """
    pythoncom.CoInitialize()
    try:
        outlook = win32com.client.Dispatch('Outlook.Application')
        namespace = outlook.GetNamespace("MAPI")
        accounts = namespace.Accounts
        
        if accounts.Count == 0:
            raise Exception("No Outlook accounts found. Please open Outlook and sign in.")
        
        # Look for Home Depot account
        for i in range(1, accounts.Count + 1):
            account = accounts.Item(i)
            email = account.SmtpAddress.lower() if account.SmtpAddress else ""
            
            if "@homedepot.com" in email:
                return {
                    "account": account,
                    "email": account.SmtpAddress,
                    "display_name": account.DisplayName,
                    "outlook": outlook
                }
        
        # No Home Depot account found
        raise Exception("Please sign in to your Home Depot (@homedepot.com) Outlook account to send reports.")
            
    except Exception as e:
        pythoncom.CoUninitialize()
        raise e


def send_report_email(recipients, use_case, period_label, pdf_data, sender_name="OKR Tracker Dashboard"):
    """Send the PDF report via local Outlook application using The Home Depot account."""
    
    if not recipients:
        raise ValueError("No recipients provided")
    
    recipient_list = [r.strip() for r in recipients if r and r.strip() and '@' in r]
    
    if not recipient_list:
        raise ValueError("No valid recipients provided")
    
    subject = f"The Home Depot OKR Tracking Report: {use_case}"
    
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #F96302; padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">The Home Depot OKR Tracking Report</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6;">Hello,</p>
            
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6;">
                Please find attached the OKR Tracking Report for <strong>{use_case}</strong>.
            </p>
            
            <div style="background: #f5f5f7; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <h3 style="color: #1d1d1f; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Report Details</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="color: #6e6e73; padding: 4px 0;">Use Case:</td>
                        <td style="color: #1d1d1f; font-weight: 600;">{use_case}</td>
                    </tr>
                    <tr>
                        <td style="color: #6e6e73; padding: 4px 0;">Analysis Period:</td>
                        <td style="color: #1d1d1f; font-weight: 600;">{period_label}</td>
                    </tr>
                    <tr>
                        <td style="color: #6e6e73; padding: 4px 0;">Generated:</td>
                        <td style="color: #1d1d1f; font-weight: 600;">{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #6e6e73; font-size: 14px; line-height: 1.6;">
                This report contains post-launch Tracking metrics, year-over-year comparisons, 
                pre vs post launch analysis, and incremental impact assessment.
            </p>
            
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6; margin-top: 24px;">
                Best regards,<br>
                <strong>Home Depot Analytics Team</strong>
            </p>
        </div>
        
        <div style="background: #f5f5f7; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #86868b; font-size: 12px; margin: 0;">
                This is an automated message from the OKR Tracker Dashboard.
            </p>
        </div>
    </div>
    """
    
    temp_dir = tempfile.gettempdir()
    filename = f"OKR_Tracking_Report_{use_case.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    temp_pdf_path = os.path.join(temp_dir, filename)
    
    try:
        with open(temp_pdf_path, 'wb') as f:
            f.write(pdf_data)
        
        # Get Home Depot account
        account_info = get_homedepot_account()
        outlook = account_info['outlook']
        hd_account = account_info['account']
        
        try:
            mail = outlook.CreateItem(0)
            
            # Set the sending account to Home Depot account
            mail._oleobj_.Invoke(*(64209, 0, 8, 0, hd_account))
            
            mail.To = "; ".join(recipient_list)
            mail.Subject = subject
            mail.HTMLBody = html_body
            mail.Attachments.Add(temp_pdf_path)
            
            mail.Send()
            
            return {
                'success': True,
                'recipients': recipient_list,
                'filename': filename,
                'sent_from': account_info['email']
            }
            
        finally:
            pythoncom.CoUninitialize()
            
    except Exception as e:
        raise Exception(f"Failed to send email: {str(e)}")
    
    finally:
        try:
            if os.path.exists(temp_pdf_path):
                os.remove(temp_pdf_path)
        except:
            pass


def create_draft_email(recipients, use_case, period_label, pdf_data):
    """Create a draft email and open it in Outlook for user review using Home Depot account."""
    
    if not recipients:
        recipients = []
    
    recipient_list = [r.strip() for r in recipients if r and r.strip() and '@' in r]
    
    subject = f"The Home Depot OKR Tracker Report: {use_case}"
    
    html_body = f"""
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Helvetica Neue', Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: #F96302; padding: 20px; border-radius: 12px 12px 0 0;">
            <h1 style="color: white; margin: 0; font-size: 24px;">The Home Depot OKR Tracking Report</h1>
        </div>
        
        <div style="background: white; padding: 30px; border: 1px solid #e0e0e0; border-top: none;">
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6;">Hello,</p>
            
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6;">
                Please find attached the OKR Tracking Report for <strong>{use_case}</strong>.
            </p>
            
            <div style="background: #f5f5f7; padding: 20px; border-radius: 12px; margin: 24px 0;">
                <h3 style="color: #1d1d1f; margin: 0 0 12px 0; font-size: 14px; text-transform: uppercase; letter-spacing: 0.5px;">Report Details</h3>
                <table style="width: 100%;">
                    <tr>
                        <td style="color: #6e6e73; padding: 4px 0;">Use Case:</td>
                        <td style="color: #1d1d1f; font-weight: 600;">{use_case}</td>
                    </tr>
                    <tr>
                        <td style="color: #6e6e73; padding: 4px 0;">Analysis Period:</td>
                        <td style="color: #1d1d1f; font-weight: 600;">{period_label}</td>
                    </tr>
                    <tr>
                        <td style="color: #6e6e73; padding: 4px 0;">Generated:</td>
                        <td style="color: #1d1d1f; font-weight: 600;">{datetime.now().strftime('%B %d, %Y at %I:%M %p')}</td>
                    </tr>
                </table>
            </div>
            
            <p style="color: #6e6e73; font-size: 14px; line-height: 1.6;">
                This report contains post-launch Tracking metrics, year-over-year comparisons, 
                pre vs post launch analysis, and incremental impact assessment.
            </p>
            
            <p style="color: #1d1d1f; font-size: 16px; line-height: 1.6; margin-top: 24px;">
                Best regards,<br>
                <strong>Home Depot Analytics Team</strong>
            </p>
        </div>
        
        <div style="background: #f5f5f7; padding: 16px; border-radius: 0 0 12px 12px; text-align: center;">
            <p style="color: #86868b; font-size: 12px; margin: 0;">
                This is an automated message from the OKR Tracker Dashboard.
            </p>
        </div>
    </div>
    """
    
    temp_dir = tempfile.gettempdir()
    filename = f"OKR_Tracking_Report_{use_case.replace(' ', '_')}_{datetime.now().strftime('%Y%m%d')}.pdf"
    temp_pdf_path = os.path.join(temp_dir, filename)
    
    try:
        with open(temp_pdf_path, 'wb') as f:
            f.write(pdf_data)
        
        # Get Home Depot account
        account_info = get_homedepot_account()
        outlook = account_info['outlook']
        hd_account = account_info['account']
        
        try:
            mail = outlook.CreateItem(0)
            
            # Set the sending account to Home Depot account
            mail._oleobj_.Invoke(*(64209, 0, 8, 0, hd_account))
            
            if recipient_list:
                mail.To = "; ".join(recipient_list)
            
            mail.Subject = subject
            mail.HTMLBody = html_body
            mail.Attachments.Add(temp_pdf_path)
            
            mail.Display()
            
            return {
                'success': True,
                'recipients': recipient_list,
                'filename': filename,
                'message': 'Draft opened in Outlook',
                'sent_from': account_info['email']
            }
            
        finally:
            pythoncom.CoUninitialize()
            
    except Exception as e:
        raise Exception(f"Failed to create draft: {str(e)}")


def send_email_async(recipients, use_case, period_label, pdf_data, callback=None):
    """Send email asynchronously in a separate thread."""
    
    def thread_target():
        try:
            result = send_report_email(recipients, use_case, period_label, pdf_data)
            if callback:
                callback(result)
        except Exception as e:
            if callback:
                callback({'success': False, 'error': str(e)})
    
    thread = threading.Thread(target=thread_target)
    thread.start()
    return thread


def check_outlook_ready():
    """
    Check if Outlook is ready and has a Home Depot account.
    Returns status information for the frontend.
    """
    pythoncom.CoInitialize()
    try:
        try:
            outlook = win32com.client.Dispatch('Outlook.Application')
        except Exception as e:
            return {
                "ready": False,
                "error": "outlook_not_running",
                "message": "Outlook is not running. Please open Outlook and sign in."
            }
        
        try:
            namespace = outlook.GetNamespace("MAPI")
            accounts = namespace.Accounts
        except Exception as e:
            return {
                "ready": False,
                "error": "outlook_not_configured",
                "message": "Outlook is not configured. Please set up your email account in Outlook."
            }
        
        if accounts.Count == 0:
            return {
                "ready": False,
                "error": "no_accounts",
                "message": "No email accounts found in Outlook. Please add your Home Depot account."
            }
        
        # Look for Home Depot account
        all_accounts = []
        homedepot_account = None
        
        for i in range(1, accounts.Count + 1):
            account = accounts.Item(i)
            email = account.SmtpAddress.lower() if account.SmtpAddress else ""
            
            all_accounts.append(account.SmtpAddress)
            
            if "@homedepot.com" in email:
                homedepot_account = {
                    "email": account.SmtpAddress,
                    "display_name": account.DisplayName
                }
                break
        
        if homedepot_account:
            return {
                "ready": True,
                "email": homedepot_account["email"],
                "display_name": homedepot_account["display_name"],
                "message": f"Ready to send from {homedepot_account['email']}"
            }
        else:
            return {
                "ready": False,
                "error": "no_homedepot_account",
                "message": "Please sign in to your Home Depot (@homedepot.com) Outlook account.",
                "accounts_found": all_accounts
            }
            
    except Exception as e:
        return {
            "ready": False,
            "error": "unknown",
            "message": f"Error checking Outlook: {str(e)}"
        }
    finally:
        pythoncom.CoUninitialize()