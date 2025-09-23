# IAM roles and policies for blue/green deployment

# IAM role for EC2 instances (Route53 access for Let's Encrypt DNS-01)
resource "aws_iam_role" "app" {
  name = "${var.project_name}-app-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-app-role"
  }
}

# IAM policy for Route53 access (Let's Encrypt DNS-01 challenge)
resource "aws_iam_policy" "route53_letsencrypt" {
  name        = "${var.project_name}-route53-letsencrypt"
  description = "Allow Route53 access for Let's Encrypt DNS-01 challenges"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "route53:ListHostedZones",
          "route53:GetChange"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets"
        ]
        Resource = "arn:aws:route53:::hostedzone/${aws_route53_zone.main.zone_id}"
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-route53-letsencrypt"
  }
}

# IAM policy for Systems Manager access (for retrieving secrets)
resource "aws_iam_policy" "ssm_access" {
  name        = "${var.project_name}-ssm-access"
  description = "Allow access to Systems Manager parameters"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
        ]
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ssm-access"
  }
}

# IAM policy for CloudWatch logs and monitoring
resource "aws_iam_policy" "cloudwatch_logs" {
  name        = "${var.project_name}-cloudwatch-logs"
  description = "Allow writing logs to CloudWatch"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:DescribeLogStreams"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/ec2/${var.project_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData"
        ]
        Resource = "*"
        Condition = {
          StringEquals = {
            "cloudwatch:namespace" = "${var.project_name}"
          }
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-cloudwatch-logs"
  }
}

# Attach policies to the app role
resource "aws_iam_role_policy_attachment" "app_route53" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.route53_letsencrypt.arn
}

resource "aws_iam_role_policy_attachment" "app_ssm" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.ssm_access.arn
}

resource "aws_iam_role_policy_attachment" "app_cloudwatch" {
  role       = aws_iam_role.app.name
  policy_arn = aws_iam_policy.cloudwatch_logs.arn
}

# Instance profile for EC2 instances
resource "aws_iam_instance_profile" "app" {
  name = "${var.project_name}-app-profile"
  role = aws_iam_role.app.name

  tags = {
    Name = "${var.project_name}-app-profile"
  }
}

# IAM user for GitHub Actions (deployment automation)
resource "aws_iam_user" "github_actions" {
  name = "${var.project_name}-github-actions"

  tags = {
    Name = "${var.project_name}-github-actions"
  }
}

# IAM policy for GitHub Actions (deployment permissions)
resource "aws_iam_policy" "github_actions" {
  name        = "${var.project_name}-github-actions"
  description = "Permissions for GitHub Actions deployment"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ec2:DescribeInstances",
          "ec2:DescribeInstanceStatus",
          "ec2:DescribeImages",
          "ec2:DescribeSecurityGroups",
          "ec2:DescribeSubnets",
          "ec2:DescribeVpcs"
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "route53:ChangeResourceRecordSets",
          "route53:GetChange",
          "route53:ListResourceRecordSets"
        ]
        Resource = [
          "arn:aws:route53:::hostedzone/${aws_route53_zone.main.zone_id}",
          "arn:aws:route53:::change/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters"
        ]
        Resource = [
          "arn:aws:ssm:${var.aws_region}:*:parameter/${var.project_name}/*"
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "logs:GetLogEvents"
        ]
        Resource = [
          "arn:aws:logs:${var.aws_region}:*:log-group:/aws/ec2/${var.project_name}/*"
        ]
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-github-actions"
  }
}

# Attach policy to GitHub Actions user
resource "aws_iam_user_policy_attachment" "github_actions" {
  user       = aws_iam_user.github_actions.name
  policy_arn = aws_iam_policy.github_actions.arn
}

# Access keys for GitHub Actions (store these as GitHub secrets)
resource "aws_iam_access_key" "github_actions" {
  user = aws_iam_user.github_actions.name

  # Store in Systems Manager for secure access
  depends_on = [aws_iam_user.github_actions]
}

# Store GitHub Actions credentials in Systems Manager
resource "aws_ssm_parameter" "github_actions_access_key" {
  name  = "/${var.project_name}/github/aws_access_key_id"
  type  = "SecureString"
  value = aws_iam_access_key.github_actions.id

  tags = {
    Name = "${var.project_name}-github-access-key"
  }
}

resource "aws_ssm_parameter" "github_actions_secret_key" {
  name  = "/${var.project_name}/github/aws_secret_access_key"
  type  = "SecureString"
  value = aws_iam_access_key.github_actions.secret

  tags = {
    Name = "${var.project_name}-github-secret-key"
  }
}