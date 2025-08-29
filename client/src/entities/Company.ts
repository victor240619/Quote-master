import { apiRequest } from "@/lib/queryClient";
import type { Company, InsertCompany } from "@shared/schema";

export class CompanyEntity {
  static async me(): Promise<Company | null> {
    const response = await apiRequest("GET", "/api/companies/me");
    const data = await response.json();
    return data || null;
  }

  static async create(company: InsertCompany): Promise<Company> {
    const response = await apiRequest("POST", "/api/companies", company);
    return response.json();
  }

  static async update(companyId: string, data: Partial<Company>): Promise<Company> {
    const response = await apiRequest("PUT", `/api/companies/${companyId}`, data);
    return response.json();
  }

  static async list(): Promise<Company[]> {
    const response = await apiRequest("GET", "/api/admin/companies");
    return response.json();
  }
}

export { CompanyEntity as Company };
