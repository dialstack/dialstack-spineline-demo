# Compute resources for blue/green deployment with SSH bastion

# Security: KMS key for encrypting sensitive parameters
resource "aws_kms_key" "ssm" {
  description             = "KMS key for SSM parameter encryption"
  deletion_window_in_days = 7
  enable_key_rotation     = true

  tags = {
    Name = "${var.project_name}-ssm-key"
  }
}

resource "aws_kms_alias" "ssm" {
  name          = "alias/${var.project_name}-ssm"
  target_key_id = aws_kms_key.ssm.key_id
}

# Instance definitions to eliminate repetition
locals {
  # All instances defined in one place with their specific configurations
  instances = merge(
    # Bastion host
    {
      bastion = {
        ami                    = data.aws_ami.amazon_linux.id
        instance_type          = "t3.nano" # Cheapest option for bastion
        key_name               = aws_key_pair.deployer.key_name
        subnet_id              = aws_subnet.public_a.id
        vpc_security_group_ids = [aws_security_group.bastion.id]
        iam_instance_profile   = null
        # Minimal user data for bastion - just essential updates
        user_data = base64encode(<<-EOF
          #!/bin/bash
          yum update -y
          # Install PostgreSQL client for database admin access
          yum install -y postgresql15
          # Create a welcome message
          echo "SSH Bastion Host for ${var.project_name}" > /etc/motd
          echo "Use this host to access private resources securely" >> /etc/motd
        EOF
        )
        root_volume_size = null
        root_volume_tags = {}
      }
    },
    # Main application instances (blue/green)
    {
      for env in var.deployed_environments : "main-${env}" => {
        ami                    = data.aws_ami.amazon_linux.id
        instance_type          = var.instance_type
        key_name               = aws_key_pair.deployer.key_name
        subnet_id              = env == "blue" ? aws_subnet.private_app_a.id : aws_subnet.private_app_b.id
        vpc_security_group_ids = [aws_security_group.app.id]
        # Instance profile with Route53 permissions for Let's Encrypt DNS-01
        iam_instance_profile   = local.app_instance_profile_name
        # Enhanced user data with Route53 permissions for DNS-01 challenge
        user_data = base64encode(templatefile("${path.module}/user-data.sh", {
          environment     = env
          project_name    = var.project_name
          domain_name     = var.domain_name
          route53_zone_id = aws_route53_zone.main.zone_id
        }))
        root_volume_size = 30 # Free tier eligible (AMI snapshot minimum)
        root_volume_tags = {
          Name = "${var.project_name}-${env}-root"
        }
      }
    }
  )
}

# Generate SSH key pair for secure access
resource "tls_private_key" "deployer" {
  algorithm = "RSA"
  rsa_bits  = 4096
}

resource "aws_key_pair" "deployer" {
  key_name   = var.key_pair_name
  public_key = tls_private_key.deployer.public_key_openssh

  tags = {
    Name = "${var.project_name}-deployer-key"
  }
}

# Store private key in AWS Systems Manager for secure access
resource "aws_ssm_parameter" "private_key" {
  name   = "/${var.project_name}/ssh/private_key"
  type   = "SecureString"
  value  = tls_private_key.deployer.private_key_pem
  key_id = aws_kms_key.ssm.key_id

  tags = {
    Name = "${var.project_name}-ssh-private-key"
  }
}

# Data source for Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Unified EC2 instances (bastion + main instances)
resource "aws_instance" "all" {
  for_each = local.instances

  # Instance-specific configuration from locals
  ami                    = each.value.ami
  instance_type          = each.value.instance_type
  key_name               = each.value.key_name
  subnet_id              = each.value.subnet_id
  vpc_security_group_ids = each.value.vpc_security_group_ids
  iam_instance_profile   = each.value.iam_instance_profile
  user_data              = each.value.user_data

  # Common configuration applied to all instances
  # Performance: Enable EBS optimization
  ebs_optimized = true

  # Monitoring: Enable detailed monitoring
  monitoring = true

  # Security: Configure Instance Metadata Service v2 only
  metadata_options {
    http_endpoint               = "enabled"
    http_tokens                 = "required"  # Require IMDSv2
    http_put_response_hop_limit = 1
  }

  # Security: Encrypted root volume configuration
  root_block_device {
    encrypted   = true
    volume_type = "gp3"
    volume_size = each.value.root_volume_size
    tags        = each.value.root_volume_tags
  }

  tags = merge(
    {
      Name = "${var.project_name}-${each.key}"
    },
    each.key == "bastion" ? { Role = "bastion" } : {
      Environment = split("-", each.key)[1]
      Role        = "app-server"
    }
  )

  lifecycle {
    create_before_destroy = true
    # Note: prevent_destroy cannot be set dynamically, so production instances
    # must have lifecycle protection added manually after deployment
  }
}

# Elastic IP for bastion host (static IP for SSH access)
resource "aws_eip" "bastion" {
  instance = aws_instance.all["bastion"].id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-bastion-eip"
  }

  depends_on = [aws_internet_gateway.main]
}

# Dynamic Elastic IPs for application servers (for stable DNS pointing)
resource "aws_eip" "main" {
  for_each = local.environments

  instance = aws_instance.all["main-${each.key}"].id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-${each.key}-eip"
  }

  depends_on = [aws_internet_gateway.main]
}