import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import db from "../database"; // relative — đúng pattern pages/api/

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  // API Route: phải truyền (req, res, authOptions) để NextAuth đọc cookie
  const session = await getServerSession(req, res, authOptions);

  if (!session) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  if (session.user?.role !== "admin") {
    return res.status(403).json({ error: "Forbidden" });
  }

  // LEFT JOIN để user không có wishlist/alert vẫn xuất hiện với count = 0
  // GROUP BY đầy đủ tất cả non-aggregated columns — tuân thủ ONLY_FULL_GROUP_BY của MySQL 8
  const result = await db.query(
    `SELECT
       u.id,
       u.email,
       u.role,
       u.created_at,
       COUNT(DISTINCT w.id)  AS wishlist_count,
       COUNT(DISTINCT pa.id) AS alert_count
     FROM users u
     LEFT JOIN wishlist    w  ON w.user_id  = u.id
     LEFT JOIN price_alert pa ON pa.user_id = u.id
     GROUP BY u.id, u.email, u.role, u.created_at
     ORDER BY u.created_at DESC`
  );

  // result là array rows trực tiếp — không destructure [rows, fields]
  return res.status(200).json(result);
}
