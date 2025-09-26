import admin from "@/server/routes/admin.route";
import atlas from "@/server/routes/atlas.route";
import setup from "@/server/routes/setup.route";
import user from "@/server/routes/user.route";

const router = {
  user,
  atlas,
  setup,
  admin,
};

export default router;
