import { apiRequest } from "@/lib/queryClient";
import type { User } from "@shared/schema";

export class UserEntity {
  static async me(): Promise<User> {
    const response = await apiRequest("GET", "/api/auth/user");
    return response.json();
  }

  static async list(): Promise<User[]> {
    const response = await apiRequest("GET", "/api/admin/users");
    return response.json();
  }

  static async update(userId: string, data: Partial<User>): Promise<User> {
    const response = await apiRequest("PUT", `/api/admin/users/${userId}`, data);
    return response.json();
  }
}

export { UserEntity as User };
