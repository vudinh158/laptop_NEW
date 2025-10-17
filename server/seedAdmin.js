const bcrypt = require('bcryptjs');
require('dotenv').config({ path: './.env' });
const { User, Role, sequelize } = require('./models');

// Thông tin tài khoản Admin
const ADMIN_USERNAME = "super_admin";
const ADMIN_EMAIL = "admin@laptopstore.com";
const ADMIN_PASSWORD = "AdminPassword123"; // Mật khẩu tạm thời, nên đổi sau khi chạy

async function seedAdmin() {
    await sequelize.authenticate();
    console.log("Database connected. Starting Admin Seeder...");

    try {
        // 1. Đảm bảo Role 'admin' tồn tại
        let adminRole = await Role.findOne({ where: { role_name: 'admin' } });
        if (!adminRole) {
            adminRole = await Role.create({ 
                role_name: 'admin', 
                description: 'Quản trị viên hệ thống' 
            });
            console.log("Created 'admin' role.");
        }

        // 2. Kiểm tra xem Admin đã tồn tại chưa
        let adminUser = await User.findOne({ where: { email: ADMIN_EMAIL } });

        if (adminUser) {
            console.log("Admin user already exists. ID:", adminUser.user_id);
            // Cập nhật vai trò Admin nếu cần
            await adminUser.setRoles([adminRole]); 
            console.log("Admin role re-assigned successfully.");
            return;
        }

        // 3. Tạo Admin User mới
        // NOTE: Mật khẩu sẽ được băm tự động nhờ Sequelize hooks trong model User.js
        adminUser = await User.create({
            username: ADMIN_USERNAME,
            email: ADMIN_EMAIL,
            password_hash: ADMIN_PASSWORD, 
            full_name: "System Administrator",
            is_active: true
        });

        // 4. Gán vai trò 'admin' cho người dùng
        await adminUser.addRole(adminRole);
        
        console.log(`Successfully created Admin: ${ADMIN_USERNAME}`);

    } catch (error) {
        console.error("Error during admin seeding:", error.message);
    } finally {
        await sequelize.close();
        console.log("Database connection closed.");
    }
}

seedAdmin();