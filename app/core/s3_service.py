import boto3
from botocore.exceptions import ClientError, BotoCoreError
from fastapi import UploadFile, HTTPException, status
from typing import Tuple
import mimetypes
import os
import re
from app.config import get_settings

# Initialize settings and S3 client
settings = get_settings()
s3_client = boto3.client(
    's3',
    aws_access_key_id=settings.aws_access_key_id,
    aws_secret_access_key=settings.aws_secret_access_key,
    region_name=settings.aws_region,
    config=boto3.session.Config(signature_version='s3v4', s3={'addressing_style': 'path'})
)

# Constants
MAX_VIDEO_SIZE = 100 * 1024 * 1024  # 100MB in bytes
ALLOWED_VIDEO_TYPES = {
    'video/mp4',
    'video/quicktime',  # .mov
    'video/x-msvideo',  # .avi
    'video/webm',
    'video/x-matroska',  # .mkv
}
ALLOWED_EXTENSIONS = {'.mp4', '.mov', '.avi', '.webm', '.mkv'}


def sanitize_filename(filename: str) -> str:
    """
    Sanitize filename to contain only ASCII characters for S3 metadata.
    Preserves file extension.

    Args:
        filename: Original filename that may contain non-ASCII characters

    Returns:
        str: Sanitized filename with only ASCII characters
    """
    # Split filename and extension
    name, ext = os.path.splitext(filename)

    # Replace non-ASCII characters with underscores
    # Keep only: a-z, A-Z, 0-9, hyphen, underscore, space, period
    name = re.sub(r'[^a-zA-Z0-9\-_ .]', '_', name)

    # Remove multiple consecutive underscores/spaces
    name = re.sub(r'[_\s]+', '_', name)

    # Strip leading/trailing underscores and spaces
    name = name.strip('_ ')

    # Rebuild filename
    return f"{name}{ext}"


def validate_video_file(file: UploadFile) -> None:
    """
    Validate that the uploaded file is a video and meets size requirements.

    Args:
        file: The uploaded file to validate

    Raises:
        HTTPException: If file is invalid, not a video, or too large
    """
    # Check if file exists
    if not file:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No file provided"
        )

    # Check file extension
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else ''
    if file_ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid file type. Allowed extensions: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Check content type
    if file.content_type not in ALLOWED_VIDEO_TYPES:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid content type. Must be a video file."
        )

    # Check file size
    file.file.seek(0, 2)  # Seek to end of file
    file_size = file.file.tell()
    file.file.seek(0)  # Reset to beginning

    if file_size > MAX_VIDEO_SIZE:
        size_mb = file_size / (1024 * 1024)
        raise HTTPException(
            status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
            detail=f"File too large ({size_mb:.2f}MB). Maximum size is 100MB."
        )

    if file_size == 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="File is empty"
        )


def upload_video(file: UploadFile, user_id: int, submission_id: int) -> Tuple[str, str]:
    """
    Upload a video file to S3.

    Args:
        file: The video file to upload
        user_id: The ID of the user uploading the video
        submission_id: The ID of the submission

    Returns:
        Tuple[str, str]: A tuple of (s3_key, s3_url)

    Raises:
        HTTPException: If upload fails or file is invalid
    """
    # Validate the file first
    validate_video_file(file)

    # Get file extension
    file_ext = os.path.splitext(file.filename)[1].lower() if file.filename else '.mp4'

    # Generate S3 key with organized structure
    s3_key = f"submissions/{user_id}/{submission_id}/video{file_ext}"

    try:
        # Reset file pointer to beginning
        file.file.seek(0)

        # Upload file to S3
        s3_client.upload_fileobj(
            file.file,
            settings.aws_s3_bucket,
            s3_key,
            ExtraArgs={
                'ContentType': file.content_type,
                'Metadata': {
                    'user_id': str(user_id),
                    'submission_id': str(submission_id),
                    'original_filename': sanitize_filename(file.filename) if file.filename else 'video'
                }
            }
        )

        # Generate S3 URL
        s3_url = f"https://{settings.aws_s3_bucket}.s3.{settings.aws_region}.amazonaws.com/{s3_key}"

        return s3_key, s3_url

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to upload video to S3: {error_code}"
        )
    except BotoCoreError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AWS service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during upload: {str(e)}"
        )


def generate_presigned_url(s3_key: str, expiration: int = 3600) -> str:
    """
    Generate a presigned URL for temporary access to a video file.

    Args:
        s3_key: The S3 key of the file
        expiration: URL expiration time in seconds (default: 3600 = 1 hour)

    Returns:
        str: The presigned URL

    Raises:
        HTTPException: If URL generation fails
    """
    try:
        presigned_url = s3_client.generate_presigned_url(
            'get_object',
            Params={
                'Bucket': settings.aws_s3_bucket,
                'Key': s3_key
            },
            ExpiresIn=expiration
        )
        return presigned_url

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to generate presigned URL: {error_code}"
        )
    except BotoCoreError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AWS service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error generating URL: {str(e)}"
        )


def delete_file(s3_key: str) -> None:
    """
    Delete a file from S3.

    Args:
        s3_key: The S3 key of the file to delete

    Raises:
        HTTPException: If deletion fails
    """
    try:
        s3_client.delete_object(
            Bucket=settings.aws_s3_bucket,
            Key=s3_key
        )

    except ClientError as e:
        error_code = e.response.get('Error', {}).get('Code', 'Unknown')
        # Don't raise error if object doesn't exist (already deleted)
        if error_code != 'NoSuchKey':
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail=f"Failed to delete file from S3: {error_code}"
            )
    except BotoCoreError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"AWS service error: {str(e)}"
        )
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Unexpected error during deletion: {str(e)}"
        )
