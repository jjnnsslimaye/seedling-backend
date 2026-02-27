from sendgrid import SendGridAPIClient
from sendgrid.helpers.mail import Mail
from app.config import get_settings
from decimal import Decimal
import logging

logger = logging.getLogger(__name__)

settings = get_settings()


async def send_password_reset_email(to_email: str, reset_token: str, username: str):
    """Send password reset email with token link"""

    # Build reset URL (frontend URL)
    reset_url = f"{settings.frontend_url}/reset-password?token={reset_token}"

    # Email content
    subject = "Reset Your Seedling Password"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2>Password Reset Request</h2>
          <p>Hi {username},</p>
          <p>We received a request to reset your password for your Seedling account.</p>
          <p>Click the button below to reset your password:</p>
          <div style="margin: 30px 0;">
            <a href="{reset_url}"
               style="background-color: #16a34a; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p>Or copy and paste this link into your browser:</p>
          <p style="color: #666; font-size: 14px;">{reset_url}</p>
          <p>This link will expire in 1 hour.</p>
          <p>If you didn't request this password reset, you can safely ignore this email.</p>
        </div>
      </body>
    </html>
    """

    try:
        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )

        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)

        logger.info(f"Password reset email sent to {to_email}, status: {response.status_code}")
        return True

    except Exception as e:
        logger.error(f"Failed to send password reset email to {to_email}: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")


async def send_email_change_notification(old_email: str, new_email: str, username: str):
    """Send notification to old email address when email is changed"""

    # Email content
    subject = "Your Seedling Email Address Has Been Changed"
    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
        <div style="max-width: 600px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #DC2626;">Email Address Changed</h2>
          <p>Hi {username},</p>
          <p>This is a notification that the email address for your Seedling account has been changed.</p>

          <div style="background-color: #F3F4F6; padding: 15px; border-radius: 6px; margin: 20px 0;">
            <p style="margin: 5px 0;"><strong>Old Email:</strong> {old_email}</p>
            <p style="margin: 5px 0;"><strong>New Email:</strong> {new_email}</p>
          </div>

          <p>If you made this change, you can safely ignore this email.</p>

          <div style="background-color: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0;">
            <p style="margin: 0; color: #991B1B;">
              <strong>⚠️ Important:</strong> If you did NOT make this change, your account may have been compromised.
              Please contact our support team immediately at support@seedling.com
            </p>
          </div>

          <p>Future notifications will be sent to your new email address: <strong>{new_email}</strong></p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #ddd;">
          <p style="color: #999; font-size: 12px;">
            Seedling - Competition Platform<br>
            This is an automated security notification.
          </p>
        </div>
      </body>
    </html>
    """

    try:
        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=old_email,
            subject=subject,
            html_content=html_content
        )

        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)

        logger.info(f"Email change notification sent to {old_email}, status: {response.status_code}")
        return True

    except Exception as e:
        logger.error(f"Failed to send email change notification to {old_email}: {str(e)}")
        # Don't raise exception - we don't want to fail the email update if notification fails
        return False


async def send_winner_notification(
    to_email: str,
    username: str,
    competition_title: str,
    placement: str,  # "first", "second", "third"
    prize_amount: Decimal,
    has_payment_setup: bool,
    submission_id: int,
    frontend_url: str
):
    """Send winner notification with prize details and payout instructions"""

    # Format placement text
    placement_map = {
        "first": "🥇 1st Place",
        "second": "🥈 2nd Place",
        "third": "🥉 3rd Place",
        "fourth": "4th Place",
        "fifth": "5th Place"
    }
    place_text = placement_map.get(placement, f"{placement} Place")

    # Build payout section based on payment setup
    if has_payment_setup:
        payout_section = f"""
        <div style="background-color: #d1fae5; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #065f46; margin-top: 0;">💰 Payment Processing</h3>
          <p style="color: #065f46; margin-bottom: 0;">
            Your prize payment of <strong>${prize_amount}</strong> is being processed
            and will be sent to your connected bank account shortly.
          </p>
        </div>
        """
    else:
        payouts_url = f"{frontend_url}/payouts"
        payout_section = f"""
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #92400e; margin-top: 0;">⚠️ Action Required</h3>
          <p style="color: #92400e;">
            To claim your prize of <strong>${prize_amount}</strong>, please set up
            your payout account:
          </p>
          <div style="text-align: center; margin-top: 20px;">
            <a href="{payouts_url}"
               style="background-color: #f59e0b; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;
                      font-weight: bold;">
              Set Up Payouts Now
            </a>
          </div>
        </div>
        """

    results_url = f"{frontend_url}/submissions/{submission_id}/results"

    subject = f"🎉 Congratulations! You won {competition_title}!"

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #4f46e5; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🎉 Congratulations!</h1>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <p style="font-size: 16px;">Hi <strong>{username}</strong>,</p>

          <p style="font-size: 18px; color: #1f2937;">
            Congratulations! You placed <strong>{place_text}</strong> in
            <strong>{competition_title}</strong>!
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #6b7280; margin: 0;">Your Prize</p>
            <p style="font-size: 36px; font-weight: bold; color: #059669; margin: 10px 0;">
              ${prize_amount}
            </p>
          </div>

          {payout_section}

          <div style="text-align: center; margin-top: 30px;">
            <a href="{results_url}"
               style="background-color: #4f46e5; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;">
              View Your Results & Feedback
            </a>
          </div>

          <p style="margin-top: 30px; color: #6b7280; font-size: 14px;">
            Congratulations again on your achievement!
          </p>

          <p style="color: #6b7280; font-size: 14px;">
            - The Seedling Team
          </p>
        </div>

        <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>Seedling - Competition Platform</p>
        </div>
      </body>
    </html>
    """

    try:
        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)
        logger.info(f"Winner notification sent to {to_email}, status: {response.status_code}")
        return True
    except Exception as e:
        logger.error(f"Failed to send winner notification to {to_email}: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")


async def send_participant_notification(
    to_email: str,
    username: str,
    competition_title: str,
    placement_rank: int,  # Numeric rank (4, 5, 6, etc.)
    total_submissions: int,
    submission_id: int,
    frontend_url: str
):
    """Send thank you email to non-winning participants"""

    results_url = f"{frontend_url}/submissions/{submission_id}/results"
    browse_url = f"{frontend_url}/competitions"

    subject = f"Thank you for participating in {competition_title}"

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: #6366f1; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Thank You for Participating!</h1>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <p style="font-size: 16px;">Hi <strong>{username}</strong>,</p>

          <p style="font-size: 16px; color: #1f2937;">
            Thank you for your submission to <strong>{competition_title}</strong>!
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center;">
            <p style="font-size: 14px; color: #6b7280; margin: 0;">Your Placement</p>
            <p style="font-size: 32px; font-weight: bold; color: #4f46e5; margin: 10px 0;">
              {placement_rank} out of {total_submissions}
            </p>
          </div>

          <p style="font-size: 16px;">
            While you didn't place in the top positions this time, we appreciate your
            participation and hope you found the experience valuable.
          </p>

          <div style="text-align: center; margin-top: 30px;">
            <a href="{results_url}"
               style="background-color: #4f46e5; color: white; padding: 12px 24px;
                      text-decoration: none; border-radius: 6px; display: inline-block;
                      margin-bottom: 10px;">
              View Your Scores & Feedback
            </a>
          </div>

          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 30px 0;">
            <p style="color: #1e40af; margin: 0; text-align: center;">
              <strong>Keep competing!</strong> We hope to see you in future competitions.
            </p>
            <div style="text-align: center; margin-top: 15px;">
              <a href="{browse_url}"
                 style="background-color: #3b82f6; color: white; padding: 10px 20px;
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-size: 14px;">
                Browse Competitions
              </a>
            </div>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            - The Seedling Team
          </p>
        </div>

        <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>Seedling - Competition Platform</p>
        </div>
      </body>
    </html>
    """

    try:
        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)
        logger.info(f"Participant notification sent to {to_email}, status: {response.status_code}")
        return True
    except Exception as e:
        logger.error(f"Failed to send participant notification to {to_email}: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")


async def send_competition_announcement(
    to_email: str,
    username: str,
    competition_id: int,
    competition_title: str,
    domain: str,
    description: str,
    prize_pool: Decimal,
    entry_fee: Decimal,
    max_entries: int,
    start_date: str,
    end_date: str,
    frontend_url: str
):
    """Send announcement email when competition moves from Draft to Upcoming"""

    competition_url = f"{frontend_url}/competitions/{competition_id}"
    browse_url = f"{frontend_url}/competitions"

    # Get domain color styling
    domain_colors = {
        "AI": "#9333ea",
        "Blockchain": "#3b82f6",
        "Climate Tech": "#10b981",
        "Fintech": "#f59e0b",
        "Health Tech": "#ef4444",
        "EdTech": "#6366f1",
    }
    domain_color = domain_colors.get(domain, "#6b7280")

    subject = f"🚀 New Competition: {competition_title}"

    html_content = f"""
    <html>
      <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto;">
        <div style="background-color: {domain_color}; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 28px;">🚀 New Competition Available!</h1>
        </div>

        <div style="padding: 30px; background-color: #f9fafb;">
          <p style="font-size: 16px;">Hi <strong>{username}</strong>,</p>

          <p style="font-size: 16px; color: #1f2937;">
            A new competition is now open for entries on Seedling!
          </p>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid {domain_color};">
            <h2 style="margin-top: 0; color: #1f2937; font-size: 22px;">{competition_title}</h2>
            <span style="display: inline-block; padding: 4px 12px; background-color: {domain_color}; color: white; border-radius: 12px; font-size: 12px; font-weight: bold; margin-bottom: 12px;">
              {domain}
            </span>
            <p style="color: #4b5563; margin: 12px 0;">
              {description}
            </p>
          </div>

          <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <h3 style="margin-top: 0; color: #1f2937; font-size: 18px;">Competition Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">💰 Prize Pool:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold; text-align: right; font-size: 14px;">${prize_pool}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🎟️ Entry Fee:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold; text-align: right; font-size: 14px;">${entry_fee}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">👥 Max Entries:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold; text-align: right; font-size: 14px;">{max_entries}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">📅 Start Date:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold; text-align: right; font-size: 14px;">{start_date}</td>
              </tr>
              <tr>
                <td style="padding: 8px 0; color: #6b7280; font-size: 14px;">🏁 End Date:</td>
                <td style="padding: 8px 0; color: #1f2937; font-weight: bold; text-align: right; font-size: 14px;">{end_date}</td>
              </tr>
            </table>
          </div>

          <div style="text-align: center; margin: 30px 0;">
            <a href="{competition_url}"
               style="background-color: {domain_color}; color: white; padding: 14px 28px;
                      text-decoration: none; border-radius: 6px; display: inline-block;
                      font-weight: bold; font-size: 16px;">
              View Competition Details
            </a>
          </div>

          <div style="background-color: #dbeafe; padding: 20px; border-radius: 8px; margin: 20px 0;">
            <p style="color: #1e40af; margin: 0; text-align: center; font-size: 14px;">
              <strong>Don't miss out!</strong> Spots are limited and fill up fast.
            </p>
            <div style="text-align: center; margin-top: 15px;">
              <a href="{browse_url}"
                 style="background-color: #3b82f6; color: white; padding: 10px 20px;
                        text-decoration: none; border-radius: 6px; display: inline-block;
                        font-size: 14px;">
                Browse All Competitions
              </a>
            </div>
          </div>

          <p style="color: #6b7280; font-size: 14px;">
            Good luck!<br>
            - The Seedling Team
          </p>
        </div>

        <div style="background-color: #e5e7eb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280;">
          <p>Seedling - Competition Platform</p>
        </div>
      </body>
    </html>
    """

    try:
        message = Mail(
            from_email=settings.sendgrid_from_email,
            to_emails=to_email,
            subject=subject,
            html_content=html_content
        )
        sg = SendGridAPIClient(settings.sendgrid_api_key)
        response = sg.send(message)
        logger.info(f"Competition announcement sent to {to_email}, status: {response.status_code}")
        return True
    except Exception as e:
        logger.error(f"Failed to send competition announcement to {to_email}: {str(e)}")
        raise Exception(f"Failed to send email: {str(e)}")
