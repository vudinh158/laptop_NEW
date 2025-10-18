from flask import Flask, jsonify
from flask_cors import CORS
import pandas as pd
import joblib
import os
import psycopg2
from dotenv import load_dotenv
import re

load_dotenv()

# --- KHỞI TẠO ỨNG DỤNG VÀ TẢI MODEL ---
app = Flask(__name__)
CORS(app) # Cho phép gọi API từ domain khác 

print("Đang tải mô hình và dữ liệu tham chiếu...")
try:
    model = joblib.load('knn_model.joblib')
    scaler = joblib.load('scaler.joblib')
    # df_trained dùng để dịch từ index -> variation_id
    df_trained = pd.read_pickle('products_df_from_db.pkl')
    print("Tải mô hình và dữ liệu tham chiếu thành công!")
except FileNotFoundError:
    print("Lỗi: Không tìm thấy file model. Vui lòng chạy 'train_recommender.py' trước.")
    exit()

# Hàm tương tác với DB
def get_db_connection():
    """Tạo và trả về một kết nối đến database."""
    conn_string = os.getenv("DATABASE_URL")
    if not conn_string:
        raise ValueError("Lỗi: Vui lòng cung cấp DATABASE_URL trong file .env")
    conn = psycopg2.connect(conn_string)
    return conn

def calculate_performance_score_realtime(variation_details):
    # Tính điểm hiệu năng cho một sản phẩm dựa trên chi tiết từ DB
    # Logic giống file Train
    score = 0
    try:
        cpu_score = 0
        cpu = str(variation_details.get('processor', '')).lower()
        if any(x in cpu for x in ['m3 max', 'm4 max', 'i9', 'ryzen 9', 'ultra 9']): cpu_score = 100
        elif any(x in cpu for x in ['m3 pro', 'm4 pro', 'i7', 'ryzen 7', 'ultra 7']): cpu_score = 80
        elif any(x in cpu for x in ['m3', 'm4', 'i5', 'ryzen 5', 'ultra 5']): cpu_score = 60
        else: cpu_score = 40
        score += cpu_score * 0.4

        gpu_score = 0
        gpu = str(variation_details.get('graphics_card', '')).lower()
        if any(x in gpu for x in ['4080', '4090', '5070', '5080', '5090', '30-core', '40-core']): gpu_score = 100
        elif '4070' in gpu: gpu_score = 90
        elif '4060' in gpu: gpu_score = 85
        elif '4050' in gpu: gpu_score = 75
        elif any(x in gpu for x in ['3050', '2050']): gpu_score = 60
        elif any(x in gpu for x in ['arc', '14-core', '16-core', '18-core']): gpu_score = 40
        else: gpu_score = 20
        score += gpu_score * 0.35

        ram_score = 0
        ram_str = str(variation_details.get('ram', '')).lower()
        ram_gb = int(re.search(r'\d+', ram_str).group()) if re.search(r'\d+', ram_str) else 8
        if ram_gb >= 32: ram_score = 100
        elif ram_gb >= 18: ram_score = 80
        elif ram_gb >= 16: ram_score = 70
        else: ram_score = 40
        score += ram_score * 0.15

        storage_score = 0
        storage_str = str(variation_details.get('storage', '')).lower()
        if '4tb' in storage_str: storage_score = 100
        elif '2tb' in storage_str: storage_score = 90
        elif '1tb' in storage_str: storage_score = 80
        elif '512gb' in storage_str: storage_score = 60
        else: storage_score = 40
        score += storage_score * 0.1
    except Exception as e:
        app.logger.error(f"Lỗi tính điểm: {e}")
        return 50
    return round(score, 2)

# Endpoint
@app.route('/recommend/<int:variation_id>', methods=['GET'])
def recommend(variation_id):
    conn = None
    try:
        # 1. Lấy thông tin "sống" của sản phẩm gốc từ DB
        conn = get_db_connection()
        cur = conn.cursor()
        query_single = "SELECT processor, ram, storage, graphics_card, price FROM product_variations WHERE variation_id = %s;"
        cur.execute(query_single, (variation_id,))
        product_data = cur.fetchone()

        if not product_data:
            return jsonify({"error": f"Sản phẩm với variation_id {variation_id} không tìm thấy trong DB."}), 404
        
        product_details = { 'processor': product_data[0], 'ram': product_data[1], 'storage': product_data[2], 'graphics_card': product_data[3], 'price': float(product_data[4]) }

        # 2. Tính performance_score trong thời gian thực
        price = product_details['price']
        score = calculate_performance_score_realtime(product_details)
        
        # 3. Chuẩn hóa dữ liệu và dùng model tìm hàng xóm
        scaled_features = scaler.transform([[price, score]])
        distances, indices = model.kneighbors(scaled_features)
        
        # 4. Dịch index ra variation_id dùng df_trained
        neighbor_indices = indices[0][1:] # Bỏ qua sản phẩm đầu tiên (chính nó)
        recommended_ids = df_trained.iloc[neighbor_indices]['variation_id'].tolist()
        
        if not recommended_ids: return jsonify([])

        # 5. Lấy thông tin sống của các sản phẩm gợi ý từ DB
        query_multiple = """
            SELECT pv.variation_id, p.product_name, pv.price, pv.sku, p.slug
            FROM product_variations pv
            LEFT JOIN products p ON pv.product_id = p.product_id
            WHERE pv.variation_id IN %s AND pv.is_available = true;
        """
        cur.execute(query_multiple, (tuple(recommended_ids),))
        recommended_products_data = cur.fetchall()
        
        result = [{'variation_id': row[0], 'product_name': row[1], 'price': float(row[2]), 'sku': row[3], 'slug': row[4]} for row in recommended_products_data]
        cur.close()
        return jsonify(result)

    except Exception as e:
        app.logger.error(f"Lỗi hệ thống khi gợi ý cho ID {variation_id}: {e}")
        return jsonify({"error": "Đã xảy ra lỗi nội bộ trên server."}), 500
    finally:
        if conn: conn.close()

if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5000)