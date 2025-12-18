#!/usr/bin/env python3
import pexpect
import sys
import os

SERVER = "37.152.174.87"
USER = "root"
PASSWORD = "UJIr3a9UyH#b"
LOCAL_DIR = "E:/project/marrefah"
REMOTE_DIR = "/opt/yalda-snake"

print("="*60)
print("📤 Uploading Project Files to Server")
print("="*60)
print("")

# Files and directories to exclude
EXCLUDE = [
    'node_modules',
    'sample-code',
    '.git',
    '*.tar.gz',
    '*.log',
    '__pycache__',
    '.DS_Store',
    'yalda-snake-deploy.tar.gz'
]

try:
    print(f"📂 Local: {LOCAL_DIR}")
    print(f"🌐 Remote: {USER}@{SERVER}:{REMOTE_DIR}")
    print("")

    # Create tar archive
    print("📦 Creating archive...")
    os.chdir(LOCAL_DIR)

    exclude_args = ' '.join([f'--exclude="{x}"' for x in EXCLUDE])
    tar_cmd = f'tar -czf /tmp/yalda-snake-upload.tar.gz {exclude_args} .'

    print(f"▶ {tar_cmd}")
    os.system(tar_cmd)

    if not os.path.exists('/tmp/yalda-snake-upload.tar.gz'):
        print("❌ Failed to create archive")
        sys.exit(1)

    archive_size = os.path.getsize('/tmp/yalda-snake-upload.tar.gz') / (1024 * 1024)
    print(f"✅ Archive created: {archive_size:.2f} MB")
    print("")

    # Upload via SCP
    print("📤 Uploading to server...")

    scp_cmd = f'scp -o StrictHostKeyChecking=no /tmp/yalda-snake-upload.tar.gz {USER}@{SERVER}:/tmp/'
    print(f"▶ {scp_cmd}")

    child = pexpect.spawn(scp_cmd, encoding='utf-8', timeout=300)

    index = child.expect(['password:', pexpect.EOF, pexpect.TIMEOUT])

    if index == 0:
        child.sendline(PASSWORD)
        child.expect(pexpect.EOF, timeout=300)
        print("✅ Upload complete")
    else:
        print("❌ Upload failed")
        sys.exit(1)

    print("")

    # Extract on server
    print("📂 Extracting on server...")

    ssh_cmd = f'ssh -o StrictHostKeyChecking=no {USER}@{SERVER}'
    child = pexpect.spawn(ssh_cmd, encoding='utf-8', timeout=60)

    index = child.expect(['password:', pexpect.EOF, pexpect.TIMEOUT])

    if index == 0:
        child.sendline(PASSWORD)
        child.expect(['#', '\$'], timeout=10)

        # Create directory
        child.sendline(f'mkdir -p {REMOTE_DIR}')
        child.expect(['#', '\$'])

        # Extract
        child.sendline(f'cd {REMOTE_DIR} && tar -xzf /tmp/yalda-snake-upload.tar.gz')
        child.expect(['#', '\$'], timeout=60)

        # Cleanup
        child.sendline('rm /tmp/yalda-snake-upload.tar.gz')
        child.expect(['#', '\$'])

        # Verify
        child.sendline('ls -la package.json app.js')
        child.expect(['#', '\$'])
        output = child.before.strip()
        print(output)

        child.sendline('exit')
        child.expect(pexpect.EOF)

        print("")
        print("✅ Files extracted successfully")
    else:
        print("❌ SSH connection failed")
        sys.exit(1)

    # Cleanup local
    os.remove('/tmp/yalda-snake-upload.tar.gz')

    print("")
    print("="*60)
    print("✅ Upload Complete!")
    print("="*60)
    print("")
    print("📝 Next step:")
    print("  Run: python deploy_to_server.py")
    print("")

except KeyboardInterrupt:
    print("\n⚠️  Interrupted by user")
    sys.exit(1)
except Exception as e:
    print(f"❌ Error: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)
