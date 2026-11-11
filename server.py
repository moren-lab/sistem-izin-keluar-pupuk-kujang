import sys
import os
import socket
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

PORT = 8080

def get_local_ip():
    try:
        s = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        s.connect(('8.8.8.8', 80))
        ip = s.getsockname()[0]
        s.close()
        return ip
    except Exception:
        try:
            return socket.gethostbyname(socket.gethostname())
        except Exception:
            return '127.0.0.1'

class CustomHandler(SimpleHTTPRequestHandler):
    def end_headers(self):
        # Header agar mobile dan desktop selalu memuat aset terbaru tanpa cache usang
        self.send_header('Cache-Control', 'no-cache, no-store, must-revalidate')
        self.send_header('Pragma', 'no-cache')
        self.send_header('Expires', '0')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def log_message(self, format, *args):
        # Ringkas tampilan log agar terminal bersih dan tidak memperlambat I/O
        sys.stdout.write(f"[{self.log_date_time_string()}] {args[0]} {args[1]}\n")

if __name__ == '__main__':
    local_ip = get_local_ip()
    script_dir = os.path.dirname(os.path.abspath(__file__))
    os.chdir(script_dir)
    
    server_address = ('0.0.0.0', PORT)
    try:
        server = ThreadingHTTPServer(server_address, CustomHandler)
    except OSError:
        # Jika port 8080 sedang terpakai, gunakan port 3000
        PORT = 3000
        server_address = ('0.0.0.0', PORT)
        server = ThreadingHTTPServer(server_address, CustomHandler)

    print("=" * 64)
    print("   SISTEM PERIZINAN KELUAR AREA - PT PUPUK KUJANG")
    print("=" * 64)
    print(f"   [Laptop/Desktop]  Buka : http://localhost:{PORT}")
    print(f"   [Ponsel/Mobile]   Buka : http://{local_ip}:{PORT}")
    print("=" * 64)
    print("   Status : Server Multi-Threaded Aktif (Anti-Lag di Mobile)")
    print("   (Jendela ini jangan ditutup selama menggunakan aplikasi)")
    print("=" * 64)
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nServer lokal dihentikan.")

