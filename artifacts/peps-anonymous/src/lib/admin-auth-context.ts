import { createContext, useContext } from "react";
import { adminAuth, type AdminAuthController } from "./admin-auth";

/** Which admin session shared admin components talk through. Defaults to the main Salt & Peps admin. */
export const AdminAuthContext = createContext<AdminAuthController>(adminAuth);
export const useAdminAuth = () => useContext(AdminAuthContext);
