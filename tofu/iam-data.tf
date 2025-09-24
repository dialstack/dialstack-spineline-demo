# Data sources to reference pre-created IAM resources
# These resources must be created first using the iam-bootstrap configuration

data "aws_iam_role" "app" {
  name = "${var.project_name}-app-role"
}

data "aws_iam_role" "rds_monitoring" {
  name = "${var.project_name}-rds-monitoring"
}

data "aws_iam_instance_profile" "app" {
  name = "${var.project_name}-app-profile"
}