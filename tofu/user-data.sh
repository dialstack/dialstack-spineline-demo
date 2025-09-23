#!/bin/bash
# User data script for EC2 instances in blue/green deployment
# This script initializes the server with Node.js, nginx, certbot and the application

set -e

# Variables passed from Terraform
ENVIRONMENT="${environment}"
PROJECT_NAME="${project_name}"
DOMAIN_NAME="${domain_name}"
ROUTE53_ZONE_ID="${route53_zone_id}"

# Log everything
exec > >(tee /var/log/user-data.log|logger -t user-data -s 2>/dev/console) 2>&1

echo "Starting user data script for ${PROJECT_NAME} ${ENVIRONMENT} environment"

# Update system packages
yum update -y

# Install required packages
yum install -y \
    git \
    nginx \
    amazon-cloudwatch-agent \
    awscli

# Install Node.js 24
curl -fsSL https://rpm.nodesource.com/setup_24.x | sudo bash -
yum install -y nodejs

# Install PM2 for process management
npm install -g pm2

# Install Certbot for Let's Encrypt SSL certificates
yum install -y certbot python3-certbot-dns-route53

# Create application user
useradd -r -s /bin/bash -m app

# Create application directory
mkdir -p /opt/${PROJECT_NAME}
chown app:app /opt/${PROJECT_NAME}

# Create logs directory
mkdir -p /var/log/${PROJECT_NAME}
chown app:app /var/log/${PROJECT_NAME}

# Configure nginx
cat > /etc/nginx/nginx.conf << 'EOF'
user nginx;
worker_processes auto;
error_log /var/log/nginx/error.log;
pid /run/nginx.pid;

events {
    worker_connections 1024;
}

http {
    log_format  main  '$remote_addr - $remote_user [$time_local] "$request" '
                      '$status $body_bytes_sent "$http_referer" '
                      '"$http_user_agent" "$http_x_forwarded_for"';

    access_log  /var/log/nginx/access.log  main;

    sendfile            on;
    tcp_nopush          on;
    tcp_nodelay         on;
    keepalive_timeout   65;
    types_hash_max_size 2048;

    include             /etc/nginx/mime.types;
    default_type        application/octet-stream;

    # Gzip compression
    gzip on;
    gzip_vary on;
    gzip_min_length 1024;
    gzip_proxied any;
    gzip_comp_level 6;
    gzip_types
        application/atom+xml
        application/javascript
        application/json
        application/rss+xml
        application/vnd.ms-fontobject
        application/x-font-ttf
        application/x-web-app-manifest+json
        application/xhtml+xml
        application/xml
        font/opentype
        image/svg+xml
        image/x-icon
        text/css
        text/plain
        text/x-component;

    include /etc/nginx/conf.d/*.conf;
}
EOF

# Create nginx site configuration for the application
cat > /etc/nginx/conf.d/${PROJECT_NAME}.conf << EOF
server {
    listen 80;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME} ${ENVIRONMENT}.${DOMAIN_NAME};

    # Redirect all HTTP to HTTPS
    return 301 https://\$server_name\$request_uri;
}

server {
    listen 443 ssl http2;
    server_name ${DOMAIN_NAME} www.${DOMAIN_NAME} ${ENVIRONMENT}.${DOMAIN_NAME};

    # SSL certificates (will be configured after Let's Encrypt setup)
    ssl_certificate /etc/letsencrypt/live/${DOMAIN_NAME}/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/${DOMAIN_NAME}/privkey.pem;

    # Modern SSL configuration
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Content-Type-Options nosniff;
    add_header X-Frame-Options DENY;
    add_header X-XSS-Protection "1; mode=block";

    # Proxy to Next.js application
    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
        proxy_cache_bypass \$http_upgrade;
    }

    # Static files caching
    location /_next/static {
        proxy_pass http://127.0.0.1:3000;
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
}
EOF

# Create systemd service for the application
cat > /etc/systemd/system/${PROJECT_NAME}.service << EOF
[Unit]
Description=${PROJECT_NAME} Next.js Application (${ENVIRONMENT})
After=network.target

[Service]
Type=simple
User=app
Group=app
WorkingDirectory=/opt/${PROJECT_NAME}
Environment=NODE_ENV=production
Environment=ENVIRONMENT=${ENVIRONMENT}
ExecStart=/usr/bin/npm start
Restart=always
RestartSec=10

# Logging
StandardOutput=append:/var/log/${PROJECT_NAME}/app.log
StandardError=append:/var/log/${PROJECT_NAME}/error.log

[Install]
WantedBy=multi-user.target
EOF

# Create SSL certificate using Let's Encrypt DNS-01 challenge
# This will run after initial deployment when the application is ready
cat > /opt/setup-ssl.sh << EOF
#!/bin/bash
# SSL setup script - run this after application deployment

# Get SSL certificate using DNS-01 challenge
certbot certonly \
    --dns-route53 \
    --dns-route53-propagation-seconds 30 \
    -d ${DOMAIN_NAME} \
    -d www.${DOMAIN_NAME} \
    -d ${ENVIRONMENT}.${DOMAIN_NAME} \
    --email admin@${DOMAIN_NAME} \
    --agree-tos \
    --non-interactive

# Set up automatic renewal
echo "0 12 * * * /usr/bin/certbot renew --quiet && /usr/bin/systemctl reload nginx" | crontab -

# Reload nginx to use the new certificates
systemctl reload nginx
EOF

chmod +x /opt/setup-ssl.sh

# Configure CloudWatch agent
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
    "logs": {
        "logs_collected": {
            "files": {
                "collect_list": [
                    {
                        "file_path": "/var/log/${PROJECT_NAME}/app.log",
                        "log_group_name": "/aws/ec2/${PROJECT_NAME}/app",
                        "log_stream_name": "${ENVIRONMENT}-{instance_id}"
                    },
                    {
                        "file_path": "/var/log/${PROJECT_NAME}/error.log",
                        "log_group_name": "/aws/ec2/${PROJECT_NAME}/error",
                        "log_stream_name": "${ENVIRONMENT}-{instance_id}"
                    },
                    {
                        "file_path": "/var/log/nginx/access.log",
                        "log_group_name": "/aws/ec2/${PROJECT_NAME}/nginx-access",
                        "log_stream_name": "${ENVIRONMENT}-{instance_id}"
                    },
                    {
                        "file_path": "/var/log/nginx/error.log",
                        "log_group_name": "/aws/ec2/${PROJECT_NAME}/nginx-error",
                        "log_stream_name": "${ENVIRONMENT}-{instance_id}"
                    }
                ]
            }
        }
    },
    "metrics": {
        "namespace": "${PROJECT_NAME}",
        "metrics_collected": {
            "cpu": {
                "measurement": [
                    "cpu_usage_idle",
                    "cpu_usage_iowait",
                    "cpu_usage_user",
                    "cpu_usage_system"
                ],
                "metrics_collection_interval": 300
            },
            "disk": {
                "measurement": [
                    "used_percent"
                ],
                "metrics_collection_interval": 300,
                "resources": [
                    "*"
                ]
            },
            "mem": {
                "measurement": [
                    "mem_used_percent"
                ],
                "metrics_collection_interval": 300
            }
        }
    }
}
EOF

# Start and enable services
systemctl enable nginx
systemctl enable amazon-cloudwatch-agent
systemctl enable ${PROJECT_NAME}

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
    -a fetch-config \
    -m ec2 \
    -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
    -s

# Create deployment script for GitHub Actions
cat > /opt/deploy.sh << 'EOF'
#!/bin/bash
# Deployment script for GitHub Actions
set -e

APP_DIR="/opt/${PROJECT_NAME}"
REPO_URL="$1"
BRANCH="$2"

echo "Deploying ${PROJECT_NAME} from ${REPO_URL} (${BRANCH})"

# Stop the application
systemctl stop ${PROJECT_NAME} || true

# Backup current version if exists
if [ -d "${APP_DIR}" ]; then
    mv "${APP_DIR}" "${APP_DIR}.backup.$(date +%s)"
fi

# Clone the repository
git clone -b "${BRANCH}" "${REPO_URL}" "${APP_DIR}"
cd "${APP_DIR}"

# Install dependencies
npm ci --only=production

# Build the application
npm run build

# Set proper ownership
chown -R app:app "${APP_DIR}"

# Start the application
systemctl start ${PROJECT_NAME}
systemctl status ${PROJECT_NAME}

echo "Deployment completed successfully"
EOF

chmod +x /opt/deploy.sh

echo "User data script completed successfully"
echo "Server initialized for ${PROJECT_NAME} ${ENVIRONMENT} environment"
echo "Next steps:"
echo "1. Deploy application code using /opt/deploy.sh"
echo "2. Run /opt/setup-ssl.sh to configure SSL certificates"
echo "3. Start nginx: systemctl start nginx"