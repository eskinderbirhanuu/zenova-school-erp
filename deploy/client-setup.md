# ZENOVA LAN Setup — Client PCs
# ================================
# After the server is running, configure each school PC.

## 1. Hosts file (so users type http://zenova.local instead of IP)

### Windows:
Open Notepad as Administrator, then open:
C:\Windows\System32\drivers\etc\hosts

Add this line at the bottom:
192.168.1.100   zenova.local

### Linux / Mac:
sudo nano /etc/hosts
Add:
192.168.1.100   zenova.local

Then visit: http://zenova.local:3000

## 2. Desktop shortcut

### Windows:
1. Right-click desktop → New → Shortcut
2. Location: http://zenova.local:3000
3. Name: ZENOVA School ERP

### Linux:
Create a .desktop file:
[Desktop Entry]
Name=ZENOVA ERP
Exec=xdg-open http://zenova.local:3000
Type=Application
Icon=web-browser

## 3. Browser bookmark
All browsers: Bookmark http://zenova.local:3000 as "ZENOVA"

## 4. Kiosk mode (optional — for dedicated school PC)
### Chrome:
"C:\Program Files\Google\Chrome\Application\chrome.exe" --kiosk http://zenova.local:3000

### Firefox:
firefox --kiosk http://zenova.local:3000
