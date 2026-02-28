# 🌐 Webserver Frontend - EC2 Deployment

## Quick Start
This folder contains everything needed to deploy the **Frontend** of Smart Influencing on your `webserver` EC2 instance.

## What's Inside
- `DEPLOYMENT.md` - Complete step-by-step deployment guide
- `index.html` - Landing page
- `js/` - JavaScript files (including **config.js** - READ THIS!)
- `css/` - Stylesheets
- `pages/` - Dashboard and authentication pages

## Most Important File
**⚠️ `js/config.js`** - You MUST edit this file after deployment:
```javascript
// Change this to your Backend EC2 IP or domain
window.API_BASE_URL = 'http://10.0.1.50:80/smart-influencing/php/api';
```

## Quick Reference

### Copy files to EC2
```bash
scp -r . ubuntu@<webserver-ip>:/var/www/smart-influencing-frontend/
```

### Get started
1. SSH into your webserver EC2
2. Follow `DEPLOYMENT.md` step-by-step
3. Edit `js/config.js` with your backend IP
4. Restart Nginx: `sudo systemctl restart nginx`
5. Test: Open browser to `http://<webserver-ip>`

### Service commands
```bash
# Check status
sudo systemctl status nginx

# Restart
sudo systemctl restart nginx

# View logs
sudo tail -f /var/log/nginx/error.log
```

## Troubleshooting
- **Can't see website?** Check Nginx is running: `sudo systemctl status nginx`
- **API not responding?** Update `js/config.js` with correct backend IP
- **Styling broken?** Check browser console for 404 errors on CSS files

## Need help?
Read the full guide: `DEPLOYMENT.md`
