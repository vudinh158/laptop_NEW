// server/config/passport.js
const passport = require("passport");
const { Strategy: GoogleStrategy } = require("passport-google-oauth20");
const { Strategy: FacebookStrategy } = require("passport-facebook");
const { User, Role, Cart } = require("../models");
const jwt = require("jsonwebtoken");

const issueJwt = (userId) =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "your-secret-key", { expiresIn: "7d" });

async function findOrCreateOAuthUser({ provider, oauthId, email, name, avatar }) {
  // 1) Nếu đã có user với oauth_provider+oauth_id → dùng luôn
  let user = await User.findOne({ where: { oauth_provider: provider, oauth_id: oauthId } });

  // 2) Nếu chưa có nhưng email trùng user sẵn có → gắn cặp oauth_* vào user đó
  if (!user && email) {
    user = await User.findOne({ where: { email } });
    if (user) {
      await user.update({ oauth_provider: provider, oauth_id: oauthId, avatar_url: user.avatar_url || avatar });
    }
  }

  // 3) Nếu vẫn chưa có → tạo user mới
  if (!user) {
    // tạo username an toàn
    const base = (email?.split("@")[0] || name || provider).replace(/[^a-zA-Z0-9_.-]/g, "").slice(0, 20);
    const username = `${base}_${Math.random().toString(36).slice(2, 7)}`;

    user = await User.create({
      username,
      email,
      full_name: name,
      avatar_url: avatar,
      oauth_provider: provider,
      oauth_id: oauthId,
      // password_hash, phone_number để null
    });

    // gán role customer + tạo cart
    const customerRole = await Role.findOne({ where: { role_name: "customer" } });
    if (customerRole) await user.addRole(customerRole);
    await Cart.create({ user_id: user.user_id });
  }

  // cập nhật last_login
  await user.update({ last_login: new Date() });

  const token = issueJwt(user.user_id);
  return { user, token };
}

passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL, // http://localhost:5000/api/auth/google/callback
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null;
        const name = profile.displayName || "";
        const avatar = profile.photos?.[0]?.value || null;
        const { user, token } = await findOrCreateOAuthUser({
          provider: "google",
          oauthId: profile.id,
          email,
          name,
          avatar,
        });
        return done(null, { user, token });
      } catch (e) {
        return done(e);
      }
    }
  )
);

passport.use(
  new FacebookStrategy(
    {
      clientID: process.env.FACEBOOK_CLIENT_ID,
      clientSecret: process.env.FACEBOOK_CLIENT_SECRET,
      callbackURL: process.env.FACEBOOK_CALLBACK_URL, // http://localhost:5000/api/auth/facebook/callback
      profileFields: ["id", "displayName", "emails", "photos"],
    },
    async (accessToken, refreshToken, profile, done) => {
      try {
        const email = profile.emails?.[0]?.value || null; // có thể không có email
        const name = profile.displayName || "";
        const avatar = profile.photos?.[0]?.value || null;
        const { user, token } = await findOrCreateOAuthUser({
          provider: "facebook",
          oauthId: profile.id,
          email,
          name,
          avatar,
        });
        return done(null, { user, token });
      } catch (e) {
        return done(e);
      }
    }
  )
);

module.exports = passport;
