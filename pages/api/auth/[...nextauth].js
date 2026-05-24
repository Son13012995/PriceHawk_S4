import NextAuth from "next-auth";
import { authOptions } from "@/lib/auth";

// NextAuth v4 pattern: export default handler, không export authOptions từ đây
export default NextAuth(authOptions);
