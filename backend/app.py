import os
import sqlite3
import requests
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

DB_NAME = "database.db"
OGADS_API_KEY = os.environ.get('OGADS_API_KEY', 'TU_API_KEY_DE_OGADS')

def init_db():
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            role TEXT DEFAULT 'Operador',
            balance REAL DEFAULT 0.0
        )
    ''')

    cursor.execute('''
        CREATE TABLE IF NOT EXISTS task_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER,
            task_type TEXT,
            reward REAL,
            timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users (id)
        )
    ''')

    cursor.execute("SELECT * FROM users WHERE username = 'demo_user'")
    if not cursor.fetchone():
        cursor.execute("INSERT INTO users (username, role, balance) VALUES ('demo_user', 'Operador', 0.0)")

    conn.commit()
    conn.close()

# Inicializar Base de Datos al arrancar
init_db()

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "ok",
        "message": "Backend InclusiWork activo"
    }), 200

@app.route('/api/user/balance', methods=['GET'])
def get_balance():
    username = request.args.get('username', 'demo_user')
    conn = sqlite3.connect(DB_NAME)
    cursor = conn.cursor()

    cursor.execute("SELECT balance, role FROM users WHERE username = ?", (username,))
    row = cursor.fetchone()
    conn.close()

    if row:
        return jsonify({
            "username": username,
            "balance": row[0],
            "role": row[1]
        }), 200

    return jsonify({
        "error": "Usuario no encontrado"
    }), 404

# ==========================================
# ENDPOINT PARA COMPLETAR TAREAS MANUALES
# ==========================================
@app.route('/api/tasks/complete', methods=['POST'])
def complete_task():
    try:
        data = request.get_json() or {}
        username = data.get('username', 'demo_user')
        task_type = data.get('task_type', 'Tarea Manual')
        reward = float(data.get('reward', 0))

        conn = sqlite3.connect(DB_NAME)
        cursor = conn.cursor()

        cursor.execute("SELECT id, balance FROM users WHERE username = ?", (username,))
        user = cursor.fetchone()

        if user:
            user_id, current_balance = user
            new_balance = current_balance + reward

            cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
            cursor.execute("INSERT INTO task_logs (user_id, task_type, reward) VALUES (?, ?, ?)",
                           (user_id, task_type, reward))
            conn.commit()
            conn.close()

            return jsonify({"status": "success", "new_balance": new_balance}), 200

        conn.close()
        return jsonify({"error": "Usuario no encontrado"}), 404

    except Exception as e:
        return jsonify({"error": str(e)}), 400

# ==========================================
# ENDPOINT PARA CONSUMIR OFERTAS DE OGADS
# ==========================================
@app.route('/api/offers/ogads', methods=['GET'])
def get_ogads_offers():
    user_ip = request.remote_addr
    user_agent = request.headers.get('User-Agent', '')

    url = "https://appsave.store/api/v2"
    headers = {
        "Authorization": f"Bearer {OGADS_API_KEY}"
    }
    params = {
        "ip": user_ip,
        "user_agent": user_agent
    }

    try:
        response = requests.get(url, headers=headers, params=params)
        data = response.json()
        return jsonify(data), response.status_code
    except Exception as e:
        return jsonify({
            "error": "No se pudieron obtener las ofertas", 
            "details": str(e)
        }), 500

# ==========================================
# WEBHOOK PARA RECIBIR NOTIFICACIONES DE OGADS
# ==========================================
@app.route('/api/webhooks/ogads', methods=['GET', 'POST'])
def ogads_webhook():
    try:
        data = request.args if request.method == 'GET' else (request.get_json() or {})

        username = data.get('userId', 'demo_user')
        reward_usd = float(data.get('payout', 0))

        if reward_usd > 0:
            trm = 4000
            margin = 0.80
            cop_reward = round((reward_usd * trm) * margin, 2)

            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()

            cursor.execute("SELECT id, balance FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()

            if user:
                user_id, current_balance = user
                new_balance = current_balance + cop_reward

                cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
                cursor.execute("INSERT INTO task_logs (user_id, task_type, reward) VALUES (?, ?, ?)",
                               (user_id, 'OGAds Offerwall', cop_reward))
                conn.commit()

            conn.close()
            return "OK", 200

        return "Ignored payout", 200

    except Exception as e:
        print(f"Error en Webhook OGAds: {e}")
        return "Error", 400

# ==========================================
# WEBHOOK MONLIX EXISTENTE
# ==========================================
@app.route('/api/webhooks/monlix', methods=['GET', 'POST'])
def monlix_webhook():
    try:
        data = request.args if request.method == 'GET' else (request.get_json() or {})

        username = data.get('userId', 'demo_user')
        reward_usd = float(data.get('reward', 0))
        status = str(data.get('status', ''))

        if status == '1':
            trm = 4000
            margin = 0.80
            cop_reward = round((reward_usd * trm) * margin, 2)

            conn = sqlite3.connect(DB_NAME)
            cursor = conn.cursor()

            cursor.execute("SELECT id, balance FROM users WHERE username = ?", (username,))
            user = cursor.fetchone()

            if user:
                user_id, current_balance = user
                new_balance = current_balance + cop_reward

                cursor.execute("UPDATE users SET balance = ? WHERE id = ?", (new_balance, user_id))
                cursor.execute("INSERT INTO task_logs (user_id, task_type, reward) VALUES (?, ?, ?)",
                               (user_id, 'Monlix Offerwall', cop_reward))
                conn.commit()

            conn.close()
            return "OK", 200

        return "Ignored status", 200

    except Exception as e:
        print(f"Error en Webhook Monlix: {e}")
        return "Error", 400

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)
