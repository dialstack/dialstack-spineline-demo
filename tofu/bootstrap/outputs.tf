# Outputs for bootstrap resources

output "state_bucket_name" {
  description = "Name of the S3 bucket for OpenTofu state"
  value       = aws_s3_bucket.tofu_state.bucket
}

output "state_bucket_region" {
  description = "Region of the S3 bucket"
  value       = aws_s3_bucket.tofu_state.region
}

output "dynamodb_table_name" {
  description = "Name of the DynamoDB table for state locking"
  value       = aws_dynamodb_table.tofu_state_lock.name
}

output "backend_configuration" {
  description = "Backend configuration block for main OpenTofu configuration"
  value       = <<EOF
backend "s3" {
  bucket         = "${aws_s3_bucket.tofu_state.bucket}"
  key            = "infrastructure/tofu.tfstate"
  region         = "${aws_s3_bucket.tofu_state.region}"
  dynamodb_table = "${aws_dynamodb_table.tofu_state_lock.name}"
  encrypt        = true
}
EOF
}