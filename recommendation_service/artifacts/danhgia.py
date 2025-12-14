import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns

def plot_clusters():
    print("Đang tải dữ liệu từ file .pkl...")
    try:
        # Tải dataframe đã được xử lý từ file huấn luyện
        df = pd.read_pickle('products_df_from_db.pkl')
    except FileNotFoundError:
        print("Lỗi: Không tìm thấy file 'products_df_from_db.pkl'.")
        print("Hãy chạy file 'train_recommender.py' trước.")
        return

    if 'price' not in df.columns or 'performance_score' not in df.columns:
        print("Lỗi: Dataframe không có cột 'price' hoặc 'performance_score'.")
        return

    print(f"Đã tải {len(df)} sản phẩm. Bắt đầu vẽ biểu đồ...")

    # Sử dụng Seaborn để vẽ biểu đồ phân tán (đẹp hơn Matplotlib)
    plt.figure(figsize=(12, 8)) # Tăng kích thước biểu đồ
    sns.scatterplot(
        data=df,
        x='price',
        y='performance_score',
        alpha=0.7, # Làm mờ các điểm để dễ nhìn khi chúng chồng lên nhau
        s=100 # Tăng kích thước điểm
    )
    
    # Định dạng biểu đồ
    plt.title('Biểu đồ Phân cụm Sản phẩm (Giá vs. Hiệu năng)', fontsize=16)
    plt.xlabel('Giá bán (VNĐ)', fontsize=12)
    plt.ylabel('Điểm Hiệu năng (0-100)', fontsize=12)
    
    # Định dạng trục X (giá) để dễ đọc hơn
    try:
        current_ticks = plt.xticks()[0]
        plt.xticks(current_ticks, [f'{int(t/1e6)} triệu' for t in current_ticks], rotation=45)
    except Exception:
        pass # Bỏ qua nếu có lỗi định dạng
        
    plt.grid(True, linestyle='--', alpha=0.5) # Thêm lưới mờ
    plt.tight_layout() # Tự động căn chỉnh

    # Lưu biểu đồ ra file ảnh
    plt.savefig('product_cluster_plot.png')
    print("Đã lưu biểu đồ thành công vào file 'product_cluster_plot.png'")
    
    # Hiển thị biểu đồ (tùy chọn)
    plt.show()

if __name__ == '__main__':
    plot_clusters()