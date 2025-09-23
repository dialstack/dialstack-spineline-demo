# Bootstrap configuration to create S3 backend for OpenTofu state
# Run this first with local state, then migrate to S3 backend

terraform {
  required_version = ">= 1.6"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    random = {
      source  = "hashicorp/random"
      version = "~> 3.1"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

variable "aws_region" {
  description = "AWS region for resources"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "spineline"
}

# Random suffix to ensure unique bucket names
resource "random_id" "state_suffix" {
  byte_length = 8
}

# S3 bucket for OpenTofu state
resource "aws_s3_bucket" "tofu_state" {
  bucket = "${var.project_name}-tofu-state-${random_id.state_suffix.hex}"

  tags = {
    Name        = "OpenTofu State"
    Project     = var.project_name
    Environment = "infrastructure"
  }
}

# Enable versioning on the S3 bucket
resource "aws_s3_bucket_versioning" "tofu_state" {
  bucket = aws_s3_bucket.tofu_state.id
  versioning_configuration {
    status = "Enabled"
  }
}

# Enable server-side encryption
resource "aws_s3_bucket_server_side_encryption_configuration" "tofu_state" {
  bucket = aws_s3_bucket.tofu_state.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# Block public access
resource "aws_s3_bucket_public_access_block" "tofu_state" {
  bucket = aws_s3_bucket.tofu_state.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# DynamoDB table for state locking
resource "aws_dynamodb_table" "tofu_state_lock" {
  name           = "${var.project_name}-tofu-state-lock"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "LockID"

  attribute {
    name = "LockID"
    type = "S"
  }

  tags = {
    Name        = "OpenTofu State Lock"
    Project     = var.project_name
    Environment = "infrastructure"
  }
}