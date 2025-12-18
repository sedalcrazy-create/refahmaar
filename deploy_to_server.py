#!/usr/bin/env python3
import pexpect
import sys
import time

SERVER = "37.152.174.87"
USER = "root"
PASSWORD = "UJIr3a9UyH#b"
REMOTE_DIR = "/opt/yalda-snake"

print("="*60)
print("🚀 Yalda Snake Challenge - Auto Deploy")
print("="*60)
print("")

def run_ssh_command(child, command, wait_for='#', timeout=30):
    """Run a command and wait for prompt"""
    print(f"▶ {command}")
    child.sendline(command)
    child.expect([wait_for, '\$'], timeout=timeout)
    output = child.before.strip()
    if output:
        print(output)
    return output

try:
    print("🔗 Connecting to server...")
    child = pexpect.spawn(f'ssh -o StrictHostKeyChecking=no {USER}@{SERVER}', encoding='utf-8', timeout=60)

    # Wait for password prompt
    index = child.expect(['password:', pexpect.EOF, pexpect.TIMEOUT])

    if index == 0:
        print("🔐 Sending password...")
        child.sendline(PASSWORD)

        # Wait for shell prompt
        child.expect(['#', '\$', pexpect.TIMEOUT], timeout=10)

        print("✅ Connected!")
        print("")

        # Create directory
        print("📂 Step 1: Creating application directory...")
        run_ssh_command(child, f'mkdir -p {REMOTE_DIR}')
        run_ssh_command(child, f'cd {REMOTE_DIR}')
        print("✅ Directory ready")
        print("")

        # Check if files exist
        print("📦 Step 2: Checking if files already uploaded...")
        output = run_ssh_command(child, 'ls -la package.json 2>/dev/null || echo "NOT_FOUND"')

        if 'NOT_FOUND' in output:
            print("⚠️  Files not found. Please upload files first.")
            print("")
            print("To upload files, run from Windows:")
            print(f"  scp -r E:/project/marrefah/* {USER}@{SERVER}:{REMOTE_DIR}/")
            print("")
            print("Or use WinSCP:")
            print(f"  Host: {SERVER}")
            print(f"  User: {USER}")
            print(f"  Password: {PASSWORD}")
            print(f"  Remote path: {REMOTE_DIR}")
            print("")
            child.sendline('exit')
            child.expect(pexpect.EOF)
            sys.exit(1)

        print("✅ Files found")
        print("")

        # Setup environment
        print("🔧 Step 3: Setting up environment...")
        output = run_ssh_command(child, 'ls -la .env 2>/dev/null || echo "NOT_FOUND"')

        if 'NOT_FOUND' in output:
            print("Creating .env file...")
            run_ssh_command(child, '''cat > .env << 'ENVEOF'
PORT=3001
NODE_ENV=production
POSTGRES_HOST=postgres
POSTGRES_PORT=5432
POSTGRES_DB=yalda_snake
POSTGRES_USER=snake_user
POSTGRES_PASSWORD=YaldaSnake2024!Secure
MAX_PLAYERS=150
GAME_SPEED=10
BOARD_WIDTH=100
BOARD_HEIGHT=60
BALE_BOT_TOKEN=64658763:rgYSwBxd05vEuuuNNbNNYZdtA-T1Gxdx5nw
GAME_URL=https://snake.darmanjoo.ir
CHANNEL_ID=@your_channel
ENVEOF''')
            print("✅ .env created")
        else:
            print("✅ .env exists")
        print("")

        # Configure Nginx
        print("🌐 Step 4: Configuring Nginx...")
        run_ssh_command(child, 'cp nginx-snake-darmanjoo.conf /etc/nginx/sites-available/snake.darmanjoo.ir')
        run_ssh_command(child, 'ln -sf /etc/nginx/sites-available/snake.darmanjoo.ir /etc/nginx/sites-enabled/')

        # Test Nginx
        output = run_ssh_command(child, 'nginx -t 2>&1 || echo "NGINX_ERROR"')
        if 'NGINX_ERROR' not in output and 'successful' in output:
            run_ssh_command(child, 'systemctl reload nginx')
            print("✅ Nginx configured")
        else:
            print("⚠️  Nginx test failed, but continuing...")
        print("")

        # SSL Check
        print("🔐 Step 5: Checking SSL certificate...")
        output = run_ssh_command(child, 'ls /etc/letsencrypt/live/snake.darmanjoo.ir/fullchain.pem 2>/dev/null || echo "NOT_FOUND"')

        if 'NOT_FOUND' in output:
            print("⚠️  SSL certificate not found")
            print("Installing certbot...")
            run_ssh_command(child, 'apt-get update -qq && apt-get install -y certbot python3-certbot-nginx -qq', timeout=120)

            print("Obtaining certificate...")
            run_ssh_command(child, 'certbot --nginx -d snake.darmanjoo.ir --non-interactive --agree-tos --register-unsafely-without-email', timeout=120)
            print("✅ SSL certificate obtained")
        else:
            print("✅ SSL certificate exists")
        print("")

        # Docker deployment
        print("🐳 Step 6: Deploying with Docker...")

        # Stop existing containers
        print("Stopping existing containers...")
        run_ssh_command(child, 'docker-compose down 2>/dev/null || true', timeout=60)

        # Build and start
        print("Building and starting containers...")
        run_ssh_command(child, 'docker-compose up -d --build', timeout=300)

        print("Waiting for services to start...")
        time.sleep(20)

        print("✅ Docker deployment complete")
        print("")

        # Health checks
        print("🔍 Step 7: Running health checks...")

        # Check containers
        print("Container status:")
        run_ssh_command(child, 'docker-compose ps')
        print("")

        # Check app health
        time.sleep(5)
        output = run_ssh_command(child, 'curl -f http://localhost:3001/health 2>/dev/null || echo "HEALTH_FAILED"')
        if 'HEALTH_FAILED' not in output:
            print("✅ Application is healthy")
        else:
            print("⚠️  Application health check failed")
        print("")

        # View logs
        print("📊 Recent logs:")
        run_ssh_command(child, 'docker-compose logs --tail=20 app')
        print("")

        # Exit
        child.sendline('exit')
        child.expect(pexpect.EOF)

        print("")
        print("="*60)
        print("✅ Deployment Complete!")
        print("="*60)
        print("")
        print("🌐 URLs:")
        print(f"  - Game: https://snake.darmanjoo.ir")
        print(f"  - Health: https://snake.darmanjoo.ir/health")
        print(f"  - Bot: @refahsnakebot")
        print("")
        print("📝 Next Steps:")
        print("  1. Edit .env and set your CHANNEL_ID")
        print("  2. Restart bot: docker-compose restart bot")
        print("  3. Make bot admin of the channel")
        print("  4. Test the game!")
        print("")
        print("📊 View logs:")
        print(f"  ssh {USER}@{SERVER} 'cd {REMOTE_DIR} && docker-compose logs -f'")
        print("")

    else:
        print("❌ Connection failed - no password prompt")
        sys.exit(1)

except pexpect.TIMEOUT:
    print("❌ Connection timeout")
    sys.exit(1)
except pexpect.EOF:
    print("❌ Connection closed unexpectedly")
    sys.exit(1)
except KeyboardInterrupt:
    print("\n⚠️  Interrupted by user")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
