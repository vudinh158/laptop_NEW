// server/services/emailService.js
const nodemailer = require('nodemailer');

// Cấu hình transporter (sử dụng Gmail SMTP làm ví dụ)
const transporter = nodemailer.createTransporter({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER || 'your-email@gmail.com',
    pass: process.env.EMAIL_PASS || 'your-app-password'
  }
});

/**
 * Gửi email xác nhận đơn hàng
 * @param {Object} data - Dữ liệu đơn hàng
 */
async function sendOrderConfirmationEmail(data) {
  const { order, items_breakdown, payment_provider, payment_method } = data;

  try {
    // Lấy thông tin user (có thể cần query thêm nếu không có trong order)
    const { User } = require('../models');
    const user = await User.findByPk(order.user_id);

    if (!user) {
      throw new Error('User not found for order confirmation email');
    }

    const paymentMethodText = payment_provider === 'COD' ? 'Thanh toán khi nhận hàng' : 'Ví điện tử VNPay';

    // Tạo nội dung email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Xác nhận đơn hàng ${order.order_code}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #2563eb; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .order-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .item { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .total { font-weight: bold; font-size: 18px; color: #2563eb; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LaptopStore</h1>
            <h2>Xác nhận đơn hàng</h2>
          </div>

          <div class="content">
            <p>Xin chào <strong>${user.full_name || user.username}</strong>,</p>

            <p>Cảm ơn bạn đã tin tưởng và lựa chọn sản phẩm của LaptopStore!</p>

            <div class="order-info">
              <h3>Thông tin đơn hàng: <strong>${order.order_code}</strong></h3>
              <p><strong>Ngày đặt:</strong> ${new Date(order.created_at).toLocaleString('vi-VN')}</p>
              <p><strong>Trạng thái:</strong> ${order.status === 'processing' ? 'Đang xử lý' : 'Chờ thanh toán'}</p>
              <p><strong>Phương thức thanh toán:</strong> ${paymentMethodText}</p>
            </div>

            <h4>Sản phẩm đã đặt:</h4>
            ${items_breakdown.map(item => `
              <div class="item">
                <div>
                  <strong>${item.product_name}</strong>
                  ${item.variation ? `<br><small>${[item.variation.processor, item.variation.ram, item.variation.storage].filter(Boolean).join(' / ')}</small>` : ''}
                  <br><small>Số lượng: ${item.quantity}</small>
                </div>
                <div>${(item.price * item.quantity).toLocaleString('vi-VN')}₫</div>
              </div>
            `).join('')}

            <div class="order-info">
              <div class="item">
                <span>Tạm tính:</span>
                <span>${order.total_amount.toLocaleString('vi-VN')}₫</span>
              </div>
              <div class="item">
                <span>Giảm giá:</span>
                <span>-${order.discount_amount.toLocaleString('vi-VN')}₫</span>
              </div>
              <div class="item">
                <span>Phí vận chuyển:</span>
                <span>${order.shipping_fee.toLocaleString('vi-VN')}₫</span>
              </div>
              <div class="item total">
                <span>Tổng cộng:</span>
                <span>${order.final_amount.toLocaleString('vi-VN')}₫</span>
              </div>
            </div>

            <div class="order-info">
              <h4>Thông tin giao hàng:</h4>
              <p><strong>Người nhận:</strong> ${order.shipping_name}</p>
              <p><strong>Số điện thoại:</strong> ${order.shipping_phone}</p>
              <p><strong>Địa chỉ:</strong> ${order.shipping_address}</p>
            </div>

            <p><strong>Tiếp theo bạn sẽ nhận được:</strong></p>
            <ul>
              <li>Email xác nhận khi đơn hàng được chuẩn bị</li>
              <li>Thông báo giao hàng qua SMS</li>
              <li>Hỗ trợ hotline 1900 XXX XXX</li>
            </ul>

            <p>Nếu bạn có bất kỳ câu hỏi nào, vui lòng liên hệ với chúng tôi.</p>

            <p>Trân trọng,<br><strong>Đội ngũ LaptopStore</strong></p>
          </div>

          <div class="footer">
            <p>Email này được gửi tự động từ hệ thống LaptopStore.</p>
            <p>© 2024 LaptopStore. Tất cả quyền được bảo lưu.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const mailOptions = {
      from: process.env.EMAIL_USER || 'noreply@laptopstore.vn',
      to: user.email,
      subject: `Xác nhận đơn hàng ${order.order_code} - LaptopStore`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order confirmation email sent to ${user.email} for order ${order.order_code}`);

  } catch (error) {
    console.error('Failed to send order confirmation email:', error);
    throw error;
  }
}

module.exports = {
  sendOrderConfirmationEmail
};
