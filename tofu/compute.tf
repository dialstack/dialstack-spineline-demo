# Compute resources for blue/green deployment with SSH bastion

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
  name  = "/${var.project_name}/ssh/private_key"
  type  = "SecureString"
  value = tls_private_key.deployer.private_key_pem

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

# SSH Bastion Host
resource "aws_instance" "bastion" {
  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.nano" # Cheapest option for bastion
  key_name               = aws_key_pair.deployer.key_name
  subnet_id              = aws_subnet.public_a.id
  vpc_security_group_ids = [aws_security_group.bastion.id]

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

  tags = {
    Name = "${var.project_name}-bastion"
    Role = "bastion"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Elastic IP for bastion host (static IP for SSH access)
resource "aws_eip" "bastion" {
  instance = aws_instance.bastion.id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-bastion-eip"
  }

  depends_on = [aws_internet_gateway.main]
}

# Dynamic application instances using locals from database.tf
resource "aws_instance" "main" {
  for_each = local.environments

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.instance_type
  key_name               = aws_key_pair.deployer.key_name
  subnet_id              = each.key == "blue" ? aws_subnet.private_app_a.id : aws_subnet.private_app_b.id
  vpc_security_group_ids = [aws_security_group.app.id]

  # Enhanced user data with Route53 permissions for DNS-01 challenge
  user_data = base64encode(templatefile("${path.module}/user-data.sh", {
    environment     = each.key
    project_name    = var.project_name
    domain_name     = var.domain_name
    route53_zone_id = aws_route53_zone.main.zone_id
  }))

  # Instance profile with Route53 permissions for Let's Encrypt DNS-01
  iam_instance_profile = local.app_instance_profile_name

  # Enable detailed monitoring for production
  monitoring = true

  # Root volume configuration
  root_block_device {
    volume_type = "gp3"
    volume_size = 30 # Free tier eligible (AMI snapshot minimum)
    encrypted   = true

    tags = {
      Name = "${var.project_name}-${each.key}-root"
    }
  }

  tags = {
    Name        = "${var.project_name}-${each.key}"
    Environment = each.key
    Role        = "app-server"
  }

  lifecycle {
    create_before_destroy = true
  }
}

# Dynamic Elastic IPs for application servers (for stable DNS pointing)
resource "aws_eip" "main" {
  for_each = local.environments

  instance = aws_instance.main[each.key].id
  domain   = "vpc"

  tags = {
    Name = "${var.project_name}-${each.key}-eip"
  }

  depends_on = [aws_internet_gateway.main]
}