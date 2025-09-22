import { useQuery } from "@tanstack/react-query";
import type { User } from "@shared/schema";

export function useAuth() {
  const { data: user, isLoading, isError } = useQuery<User>({
    queryKey: ["/api/auth/user"],
    retry: false,
    retryOnMount: false,
  });

  return {
    user,
    isLoading: isLoading && !isError, // Stop loading if there's an error
    isAuthenticated: !!user,
    isError,
  };
}
