# Lab M2: HTTP Access - EC2 Web Application

## Public IP and Test URL
- **Public IP:** 50.17.205.23
- **Test URL:** http://50.17.205.23
- **Instance:** i-0214d1cc1fc7a0ff9 (nodejs-app-1a)
- **Private IP:** 10.0.11.112

## Security Group ID and Rules
- **Security Group:** app-tier-sg (sg-0b33c7eb3eb59da41)
- **Inbound Rules:**
  - HTTP (TCP port 80) from 0.0.0.0/0 (Anywhere IPv4)
  - SSH (TCP port 22) from existing rules

## Step-by-Step Process

### 1. Start EC2 Instance
- Navigated to EC2 console (us-east-1)
- Found instance `nodejs-app-1a` (i-0214d1cc1fc7a0ff9) in stopped state
- Started the instance via Instance State > Start instance

### 2. Configure Security Group
- Identified security group `app-tier-sg` (sg-0b33c7eb3eb59da41) from instance Security tab
- Navigated to security group and clicked "Edit inbound rules"
- The existing HTTP rule had source set to a load balancer security group (sg-0a9ada4856d63eeac)
- Deleted the existing HTTP rule (could not change from SG reference to CIDR in place)
- Added new rule: Type=HTTP, Port=80, Source=0.0.0.0/0 (Anywhere-IPv4)
- Saved rules successfully

### 3. Fix Networking (NAT Gateway Issue)
- Instance is in private subnet `app-subnet-1a` (subnet-042c0fb602895edd5)
- Discovered NAT gateway (nat-0b49534b9038efd6d) had been deleted - showing Blackhole in route table
- Updated route table `private-rt-1a` (rtb-053910c29016d0af0):
  - Changed 0.0.0.0/0 target from deleted NAT Gateway to Internet Gateway (igw-05c32967b5450e184)
- Allocated Elastic IP: 50.17.205.23
- Associated Elastic IP with instance i-0214d1cc1fc7a0ff9

### 4. Connect to Instance
- Used EC2 Instance Connect via private IP with endpoint eice-0a1e274e6db079000
- Connected as ec2-user to 10.0.11.112

### 5. Install Nginx
```bash
sudo amazon-linux-extras install -y nginx1
sudo yum install -y nginx
```
Note: Standard `yum install nginx` fails on Amazon Linux 2; must use amazon-linux-extras first.

### 6. Create Node.js Application
```bash
mkdir ~/app && cd ~/app
npm init -y
npm install express
```
Created `index.js` with Express app listening on port 8080.

### 7. Configure Nginx Reverse Proxy
```bash
sudo tee /etc/nginx/conf.d/app.conf << EOF
server {
    listen 80;
    location / {
        proxy_pass http://localhost:8080;
    }
}
EOF
```

### 8. Start Services
```bash
node index.js &
sudo systemctl start nginx
sudo systemctl enable nginx
```

### 9. Test
```bash
curl http://localhost          # Local test - SUCCESS
curl http://50.17.205.23      # Public IP test - SUCCESS
```
Also verified in browser: http://50.17.205.23

## Troubleshooting

### Issue 1: Security Group Rule Error
**Problem:** "You may not specify an IPv4 CIDR for an existing referenced group id rule"
**Fix:** Delete the existing SG-reference-based HTTP rule and create a fresh rule with CIDR 0.0.0.0/0

### Issue 2: No Internet Access on Instance
**Problem:** `curl` to external URLs timed out; `sudo yum install nginx` failed
**Root Cause:** NAT Gateway was deleted, leaving a Blackhole route in the route table
**Fix:** Updated route table to use Internet Gateway instead of NAT Gateway; allocated and associated Elastic IP

### Issue 3: Nginx Not in Standard Repos
**Problem:** `sudo yum install -y nginx` returned "No package nginx available"
**Fix:** Used `sudo amazon-linux-extras install -y nginx1` to enable nginx from Amazon Linux Extras

### Issue 4: Bash History Expansion
**Problem:** Commands with `!` in strings caused bash history expansion errors
**Fix:** Removed `!` characters or used single quotes to prevent expansion

## Reflection: Why Use Nginx as a Reverse Proxy?

Nginx serves as a reverse proxy in front of the Node.js application for several important reasons:

1. **Port Abstraction:** Node.js runs on port 8080 (non-privileged port, no root needed), while Nginx listens on port 80 (standard HTTP). Nginx bridges the gap, so users access the standard port.

2. **Security:** The Node.js app is not directly exposed to the internet. Nginx acts as a buffer, hiding implementation details and providing a layer of protection.

3. **Performance:** Nginx is highly optimized for handling concurrent connections and serving static files efficiently. It can handle thousands of connections with minimal memory, offloading this work from Node.js.

4. **SSL Termination:** Nginx can handle HTTPS/TLS, decrypting traffic before passing plain HTTP to the backend - simplifying the Node.js app.

5. **Load Balancing:** Nginx can distribute traffic across multiple Node.js instances, enabling horizontal scaling.

6. **Request Buffering:** Nginx buffers slow client requests and sends complete requests to Node.js, preventing slow clients from blocking the event loop.

7. **Logging and Monitoring:** Centralized access logs and error handling at the proxy layer.
