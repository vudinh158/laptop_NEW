import pandas as pd
from sklearn.preprocessing import MinMaxScaler
from sklearn.neighbors import NearestNeighbors
import joblib
import os
import psycopg2
from dotenv import load_dotenv
import re

load_dotenv()

def fetch_data_from_db():
    conn_string = os.getenv("DATABASE_URL")
    if not conn_string:
        print("Lỗi: Sai đường dẫn DB")
        return None
    try:
        conn = psycopg2.connect(conn_string)
        print("Kết nối database thành công!")
        query = """
        SELECT 
            pv.variation_id,
            pv.product_id,
            p.product_name,
            pv.processor,
            pv.ram,
            pv.storage,
            pv.graphics_card,
            pv.price
        FROM 
            product_variations pv
        LEFT JOIN 
            products p ON pv.product_id = p.product_id
        WHERE 
            pv.is_available = true;
        """
        df = pd.read_sql(query, conn)
        conn.close()
        return df
    except Exception as e:
        print(f"Lỗi khi kết nối hoặc truy vấn DB: {e}")
        return None

# Tính điểm hiệu năng
def calculate_performance_score(row):
    score = 0
    try:
        # 1. Chấm điểm CPU (trọng số 40%)
        cpu_score = 0
        cpu = str(row['processor']).lower()
        if any(x in cpu for x in ['m3 max', 'm4 max', 'i9', 'ryzen 9', 'ultra 9']): cpu_score = 100
        elif any(x in cpu for x in ['m3 pro', 'm4 pro', 'i7', 'ryzen 7', 'ultra 7']): cpu_score = 80
        elif any(x in cpu for x in ['m3', 'm4', 'i5', 'ryzen 5', 'ultra 5']): cpu_score = 60
        else: cpu_score = 40
        score += cpu_score * 0.4

        # 2. Chấm điểm GPU (trọng số 35%)
        gpu_score = 0
        gpu = str(row['graphics_card']).lower()
        if any(x in gpu for x in ['4080', '4090', '5070', '5080', '5090', '30-core', '40-core']): gpu_score = 100
        elif '4070' in gpu: gpu_score = 90
        elif '4060' in gpu: gpu_score = 85
        elif '4050' in gpu: gpu_score = 75
        elif any(x in gpu for x in ['3050', '2050']): gpu_score = 60
        elif any(x in gpu for x in ['arc', '14-core', '16-core', '18-core']): gpu_score = 40
        else: gpu_score = 20 # Card tích hợp
        score += gpu_score * 0.35
        
        # 3. Chấm điểm RAM (trọng số 15%)
        ram_score = 0
        ram_str = str(row['ram']).lower()
        ram_gb = int(re.search(r'\d+', ram_str).group()) if re.search(r'\d+', ram_str) else 8
        if ram_gb >= 32: ram_score = 100
        elif ram_gb >= 18: ram_score = 80
        elif ram_gb >= 16: ram_score = 70
        else: ram_score = 40
        score += ram_score * 0.15

        # 4. Chấm điểm Storage (trọng số 10%)
        storage_score = 0
        storage_str = str(row['storage']).lower()
        if '4tb' in storage_str: storage_score = 100
        elif '2tb' in storage_str: storage_score = 90
        elif '1tb' in storage_str: storage_score = 80
        elif '512gb' in storage_str: storage_score = 60
        else: storage_score = 40
        score += storage_score * 0.1
        
    except Exception as e:
        print(f"Lỗi khi tính điểm cho variation_id {row.get('variation_id', 'N/A')}: {e}")
        return 50 # Trả về điểm trung bình nếu có lỗi
    return round(score, 2)

def main():
    print("Bắt đầu quá trình huấn luyện từ Database...")
    
    df = fetch_data_from_db()
    if df is None or df.empty:
        print("Không có dữ liệu để huấn luyện.")
        return

    print(f"Đã lấy thành công {len(df)} biến thể sản phẩm từ DB.")
    
    # Tính toán performance_score cho mỗi dòng
    df['performance_score'] = df.apply(calculate_performance_score, axis=1)
    
    # Chuyển đổi kiểu dữ liệu của cột price sang số
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df.dropna(subset=['price', 'performance_score'], inplace=True)

    features = df[['price', 'performance_score']]
    
    scaler = MinMaxScaler()
    features_scaled = scaler.fit_transform(features)
    print("Đã chuẩn hóa dữ liệu.")
    
    # Chỉ số k 
    k = 10 
    if len(df) < k:
        k = len(df) # Đảm bảo k không lớn hơn số lượng sản phẩm
        
    model = NearestNeighbors(n_neighbors=k, algorithm='ball_tree')
    model.fit(features_scaled)
    print(f"Đã huấn luyện mô hình KNN với k={k}.")
    
    joblib.dump(model, 'knn_model.joblib')
    joblib.dump(scaler, 'scaler.joblib')
    df.to_pickle('products_df_from_db.pkl')
    
    print("\nQuá trình huấn luyện hoàn tất!")
    print("Đã lưu các file: knn_model.joblib, scaler.joblib, products_df_from_db.pkl")

if __name__ == '__main__':
    main()