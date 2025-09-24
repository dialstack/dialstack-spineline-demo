#!/bin/bash
# Blue/Green deployment script for Spineline application
# Usage: ./scripts/deploy.sh [blue|green] [production|staging]

set -e

# Configuration
PROJECT_NAME="spineline"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(dirname "$SCRIPT_DIR")"

# Parse arguments
TARGET_ENV="${1:-blue}"
DEPLOY_TYPE="${2:-staging}"

if [[ "$TARGET_ENV" != "blue" && "$TARGET_ENV" != "green" ]]; then
    echo "Error: First argument must be 'blue' or 'green'"
    echo "Usage: $0 [blue|green] [production|staging]"
    exit 1
fi

if [[ "$DEPLOY_TYPE" != "production" && "$DEPLOY_TYPE" != "staging" ]]; then
    echo "Error: Second argument must be 'production' or 'staging'"
    echo "Usage: $0 [blue|green] [production|staging]"
    exit 1
fi

# Color output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${GREEN}[$(date +'%Y-%m-%d %H:%M:%S')]${NC} $1"
}

warn() {
    echo -e "${YELLOW}[$(date +'%Y-%m-%d %H:%M:%S')] WARNING:${NC} $1"
}

error() {
    echo -e "${RED}[$(date +'%Y-%m-%d %H:%M:%S')] ERROR:${NC} $1"
    exit 1
}

# Get infrastructure outputs
get_infrastructure_output() {
    local output_name="$1"
    cd "$ROOT_DIR/tofu"
    tofu output -raw "$output_name" 2>/dev/null || echo ""
}

# Health check function
health_check() {
    local url="$1"
    local max_attempts=30
    local attempt=1

    log "Performing health check on $url"

    while [ $attempt -le $max_attempts ]; do
        if curl -f -s "$url/api/health" > /dev/null; then
            log "Health check passed (attempt $attempt)"
            return 0
        fi

        echo -n "."
        sleep 10
        ((attempt++))
    done

    error "Health check failed after $max_attempts attempts"
}

# Wait for deployment to be ready
wait_for_deployment() {
    local environment="$1"
    local instance_ip

    instance_ip=$(get_infrastructure_output "${environment}_public_ip")

    if [[ -z "$instance_ip" ]]; then
        error "Could not get IP address for $environment environment"
    fi

    log "Waiting for $environment environment to be ready at $instance_ip"

    # Wait for SSH to be available
    log "Waiting for SSH connectivity..."
    while ! nc -z "$instance_ip" 22 2>/dev/null; do
        echo -n "."
        sleep 5
    done
    echo ""

    # Wait for HTTPS to be available
    log "Waiting for HTTPS service..."
    while ! nc -z "$instance_ip" 443 2>/dev/null; do
        echo -n "."
        sleep 5
    done
    echo ""

    # Perform health check
    health_check "https://${environment}.${PROJECT_NAME}.dev"
}

# Deploy to environment
deploy_to_environment() {
    local environment="$1"
    local instance_ip

    instance_ip=$(get_infrastructure_output "${environment}_public_ip")

    if [[ -z "$instance_ip" ]]; then
        error "Could not get IP address for $environment environment"
    fi

    log "Deploying to $environment environment ($instance_ip)"

    # Get SSH key from Systems Manager
    log "Retrieving SSH key from AWS Systems Manager..."
    aws ssm get-parameter \
        --name "/${PROJECT_NAME}/ssh/private_key" \
        --with-decryption \
        --query 'Parameter.Value' \
        --output text > /tmp/deploy_key

    chmod 600 /tmp/deploy_key

    # Get bastion IP
    bastion_ip=$(get_infrastructure_output "bastion_public_ip")

    if [[ -z "$bastion_ip" ]]; then
        error "Could not get bastion IP address"
    fi

    log "Using bastion host at $bastion_ip"

    # Deploy via bastion host
    ssh -i /tmp/deploy_key \
        -o StrictHostKeyChecking=no \
        -o ProxyCommand="ssh -i /tmp/deploy_key -o StrictHostKeyChecking=no -W %h:%p ec2-user@$bastion_ip" \
        ec2-user@"$instance_ip" \
        "sudo /opt/deploy.sh https://github.com/$(git config --get remote.origin.url | sed 's/.*github.com[:/]\([^.]*\).*/\1/') main"

    # Clean up SSH key
    rm -f /tmp/deploy_key

    log "Deployment to $environment completed"
}

# Switch DNS to new environment (production only)
switch_dns() {
    local new_environment="$1"

    if [[ "$DEPLOY_TYPE" != "production" ]]; then
        warn "DNS switching skipped - not a production deployment"
        return 0
    fi

    log "Switching DNS to $new_environment environment"

    # Update Terraform variable and apply
    cd "$ROOT_DIR/tofu"

    # Create terraform.tfvars with new active environment
    cat > terraform.tfvars << EOF
# Only override values that differ from defaults

# Environment deployment flags (override default: deploy_green = false)
deploy_green = true

# Active environment (controls DNS routing)
active_environment = "$new_environment"

# Instance configuration (override default key name)
key_pair_name = "${PROJECT_NAME}-key"

# Database configuration (override default db name and username)
db_name = "${PROJECT_NAME}_production"
db_username = "app_user"
EOF

    # Apply the change
    tofu apply -auto-approve

    log "DNS switched to $new_environment environment"
}

# Rollback function
rollback() {
    local current_env
    current_env=$(get_infrastructure_output "active_environment")

    if [[ "$current_env" == "blue" ]]; then
        switch_dns "green"
    else
        switch_dns "blue"
    fi

    log "Rolled back to $(get_infrastructure_output "active_environment") environment"
}

# Main deployment flow
main() {
    log "Starting $DEPLOY_TYPE deployment to $TARGET_ENV environment"

    # Check if target environment is currently active
    current_active=$(get_infrastructure_output "active_environment")

    if [[ "$TARGET_ENV" == "$current_active" && "$DEPLOY_TYPE" == "production" ]]; then
        warn "Deploying to currently active environment ($TARGET_ENV)"
        read -p "Continue? (y/N): " -n 1 -r
        echo
        if [[ ! $REPLY =~ ^[Yy]$ ]]; then
            error "Deployment cancelled"
        fi
    fi

    # Deploy to target environment
    deploy_to_environment "$TARGET_ENV"

    # Wait for deployment to be ready
    wait_for_deployment "$TARGET_ENV"

    if [[ "$DEPLOY_TYPE" == "production" ]]; then
        # Ask for confirmation before switching DNS
        log "Deployment successful. Ready to switch DNS to $TARGET_ENV environment."
        read -p "Switch production traffic to $TARGET_ENV? (y/N): " -n 1 -r
        echo

        if [[ $REPLY =~ ^[Yy]$ ]]; then
            switch_dns "$TARGET_ENV"

            # Final health check on production domain
            health_check "https://${PROJECT_NAME}.dev"

            log "Production deployment completed successfully!"
            log "Active environment: $TARGET_ENV"
        else
            log "DNS switch cancelled. $TARGET_ENV environment is ready but not active."
        fi
    else
        log "Staging deployment to $TARGET_ENV completed successfully!"
        log "Access at: https://${TARGET_ENV}.${PROJECT_NAME}.dev"
    fi
}

# Handle command line options
case "${1:-}" in
    "rollback")
        log "Initiating rollback..."
        rollback
        ;;
    *)
        main
        ;;
esac