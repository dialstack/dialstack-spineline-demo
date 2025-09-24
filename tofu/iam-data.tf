# Local values for pre-created IAM resources
# These resources must be created first using the iam-bootstrap configuration
# Using calculated values eliminates the need for IAM read permissions in GitHub Actions

data "aws_caller_identity" "current" {}

locals {
  # IAM resource names and ARNs calculated from known naming patterns
  app_instance_profile_name = "${var.project_name}-app-profile"
  app_role_arn              = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-app-role"
  rds_monitoring_role_arn   = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:role/${var.project_name}-rds-monitoring"
}