// server/services/emailService.js
const nodemailer = require('nodemailer');

// Cấu hình transporter (sử dụng Gmail SMTP làm ví dụ)
const transporter = nodemailer.createTransport({
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

/**
 * Gửi email thông báo cập nhật đơn hàng
 * @param {Object} data - Dữ liệu cập nhật
 */
async function sendOrderUpdateEmail(data) {
  const { order, changeType, oldData, newData, user } = data;

  try {
    if (!user) {
      throw new Error('User not found for order update email');
    }

    let changeTitle = '';
    let changeDetails = '';
    let actionMessage = '';

    switch (changeType) {
      case 'SHIPPING_ADDRESS':
        changeTitle = 'Thay đổi địa chỉ giao hàng';
        changeDetails = `
          <div class="change-section">
            <h4>Địa chỉ cũ:</h4>
            <p><strong>Người nhận:</strong> ${oldData.shipping_name || 'N/A'}</p>
            <p><strong>Số điện thoại:</strong> ${oldData.shipping_phone || 'N/A'}</p>
            <p><strong>Địa chỉ:</strong> ${oldData.shipping_address || 'N/A'}</p>
          </div>
          <div class="change-section">
            <h4>Địa chỉ mới:</h4>
            <p><strong>Người nhận:</strong> ${newData.shipping_name}</p>
            <p><strong>Số điện thoại:</strong> ${newData.shipping_phone}</p>
            <p><strong>Địa chỉ:</strong> ${newData.shipping_address}</p>
          </div>
        `;
        actionMessage = 'Chúng tôi sẽ xử lý đơn hàng theo địa chỉ mới này.';
        break;

      case 'PAYMENT_METHOD':
        changeTitle = 'Thay đổi phương thức thanh toán';
        const oldMethod = oldData.provider === 'COD' ? 'Thanh toán khi nhận hàng' : 'Ví điện tử VNPay';
        const newMethod = newData.provider === 'COD' ? 'Thanh toán khi nhận hàng' : 'Ví điện tử VNPay';

        changeDetails = `
          <div class="change-section">
            <p><strong>Phương thức cũ:</strong> ${oldMethod}</p>
            <p><strong>Phương thức mới:</strong> ${newMethod}</p>
          </div>
        `;

        if (newData.provider === 'COD') {
          actionMessage = 'Đơn hàng sẽ được thanh toán khi nhận hàng. Bạn có thể theo dõi trạng thái đơn hàng trong tài khoản.';
        } else {
          actionMessage = 'Vui lòng hoàn tất thanh toán qua VNPay để đơn hàng được xử lý.';
        }
        break;

      case 'ORDER_STATUS':
        changeTitle = 'Cập nhật trạng thái đơn hàng';
        const statusLabels = {
          'AWAITING_PAYMENT': 'Chờ thanh toán',
          'processing': 'Đang xử lý',
          'shipping': 'Đang giao hàng',
          'delivered': 'Đã giao hàng',
          'cancelled': 'Đã hủy'
        };

        changeDetails = `
          <div class="change-section">
            <p><strong>Trạng thái cũ:</strong> ${statusLabels[oldData.status] || oldData.status}</p>
            <p><strong>Trạng thái mới:</strong> ${statusLabels[newData.status] || newData.status}</p>
          </div>
        `;

        switch (newData.status) {
          case 'shipping':
            actionMessage = 'Đơn hàng của bạn đang được vận chuyển. Bạn sẽ nhận được thông tin chi tiết từ đơn vị giao hàng.';
            break;
          case 'delivered':
            actionMessage = 'Đơn hàng đã được giao thành công. Cảm ơn bạn đã tin tưởng LaptopStore!';
            break;
          case 'cancelled':
            actionMessage = 'Đơn hàng đã được hủy. Nếu bạn đã thanh toán, tiền sẽ được hoàn lại trong vòng 3-5 ngày làm việc.';
            break;
          default:
            actionMessage = 'Trạng thái đơn hàng đã được cập nhật. Vui lòng theo dõi trong tài khoản của bạn.';
        }
        break;

      case 'ORDER_REFUND':
        changeTitle = 'Hoàn tiền đơn hàng';
        changeDetails = `
          <div class="change-section">
            <p><strong>Số tiền hoàn:</strong> ${newData.amount?.toLocaleString('vi-VN')}₫</p>
            <p><strong>Phương thức thanh toán:</strong> ${newData.provider === 'VNPAY' ? 'Ví điện tử VNPay' : 'Thanh toán khi nhận hàng'}</p>
          </div>
        `;
        actionMessage = 'Tiền sẽ được hoàn lại vào tài khoản của bạn trong vòng 3-5 ngày làm việc. Vui lòng theo dõi thông báo từ ngân hàng.';
        break;

      default:
        changeTitle = 'Cập nhật đơn hàng';
        changeDetails = '<p>Đơn hàng của bạn đã được cập nhật.</p>';
        actionMessage = 'Vui lòng kiểm tra chi tiết đơn hàng trong tài khoản.';
    }

    // Tạo nội dung email HTML
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <title>Cập nhật đơn hàng ${order.order_code}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #f59e0b; color: white; padding: 20px; text-align: center; }
          .content { padding: 20px; background: #f9f9f9; }
          .change-section { background: white; padding: 15px; margin: 10px 0; border-radius: 5px; border-left: 4px solid #f59e0b; }
          .order-info { background: white; padding: 15px; margin: 15px 0; border-radius: 5px; }
          .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          .highlight { background: #fef3c7; padding: 10px; border-radius: 5px; margin: 15px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>LaptopStore</h1>
            <h2>Thông báo cập nhật đơn hàng</h2>
          </div>

          <div class="content">
            <p>Xin chào <strong>${user.full_name || user.username}</strong>,</p>

            <p>Đơn hàng <strong>${order.order_code}</strong> của bạn đã được cập nhật với thông tin sau:</p>

            <div class="order-info">
              <h3>${changeTitle}</h3>
              ${changeDetails}
            </div>

            <div class="highlight">
              <strong>Thông tin cập nhật:</strong><br>
              ${actionMessage}
            </div>

            <div class="order-info">
              <h4>Thông tin đơn hàng hiện tại:</h4>
              <p><strong>Mã đơn hàng:</strong> ${order.order_code}</p>
              <p><strong>Trạng thái:</strong> ${order.status === 'processing' ? 'Đang xử lý' : order.status === 'AWAITING_PAYMENT' ? 'Chờ thanh toán' : order.status}</p>
              <p><strong>Tổng tiền:</strong> ${order.final_amount.toLocaleString('vi-VN')}₫</p>
              <p><strong>Phương thức thanh toán:</strong> ${newData.provider === 'COD' ? 'Thanh toán khi nhận hàng' : 'Ví điện tử VNPay'}</p>
            </div>

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
      subject: `${changeTitle} - Đơn hàng ${order.order_code} - LaptopStore`,
      html: htmlContent
    };

    await transporter.sendMail(mailOptions);
    console.log(`Order update email sent to ${user.email} for order ${order.order_code} (${changeType})`);

  } catch (error) {
    console.error('Failed to send order update email:', error);
    throw error;
  }
}

module.exports = {
  sendOrderConfirmationEmail,
  sendOrderUpdateEmail
};
