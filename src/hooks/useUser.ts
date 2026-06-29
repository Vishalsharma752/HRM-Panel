import { useAuthContext } from "../contexts/AuthContext";
import { isAdminRole } from "../data/store";

export function useUser() {
  const { currentUser, authLoading } = useAuthContext();
  
  return {
    user: currentUser,
    role: currentUser?.role ?? null,
    isAdmin: currentUser ? isAdminRole(currentUser.role) : false,
    isEmployee: currentUser?.role === "Employee",
    isLoading: authLoading,
  };
}
