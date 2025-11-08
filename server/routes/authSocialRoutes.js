// server/routes/authSocialRoutes.js
const router = require("express").Router();
const passport = require("../config/passport");

// FE_URL để redirect sau khi cấp JWT
const FE_URL = process.env.FE_APP_URL || "http://localhost:3000";

// ===== GOOGLE =====
router.get(
  "/google",
  passport.authenticate("google", { scope: ["profile", "email"], session: false })
);

router.get(
  "/google/callback",
  passport.authenticate("google", { failureRedirect: `${FE_URL}/login?oauth=google_failed`, session: false }),
  (req, res) => {
    const { token, user } = req.user;
    // trả về FE qua query — FE sẽ lưu token vào localStorage như login thường
    return res.redirect(`${FE_URL}/oauth/success?token=${encodeURIComponent(token)}`);
  }
);

// ===== FACEBOOK =====
router.get(
  "/facebook",
  passport.authenticate("facebook", { scope: ["email"], session: false })
);

router.get(
  "/facebook/callback",
  passport.authenticate("facebook", { failureRedirect: `${FE_URL}/login?oauth=facebook_failed`, session: false }),
  (req, res) => {
    const { token } = req.user;
    return res.redirect(`${FE_URL}/oauth/success?token=${encodeURIComponent(token)}`);
  }
);

module.exports = router;
