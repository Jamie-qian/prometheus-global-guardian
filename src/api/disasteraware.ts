import { getAccessToken, authorize, authFetch } from "./auth";
import type { HazardType, ActiveHazard } from "../types";

export async function fetchHazardTypes(): Promise<HazardType[]> {
  try {
    const url = `/api/hazards/types`;
    const res = await authFetch(url);

    if (res && res.ok) {
      return await res.json();
    }

    throw new Error("Failed to fetch hazard types");
  } catch (error) {
    console.error("Error fetching hazard types:", error);
    return [];
  }
}

export async function fetchHazardsActive(type?: string): Promise<any[]> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      await authorize();
    }

    const url = type && type !== "ALL" ? `/api/hazards/active/category/${type}` : `/api/hazards/active`;
    const res = await authFetch(url);

    if (res && res.ok) {
      return await res.json();
    }

    throw new Error("Failed to fetch active hazards");
  } catch (error) {
    console.error("Error fetching active hazards:", error);
    return [];
  }
}

/**
 * Fetch active hazards by category ID
 * @param categoryId - The category ID to filter hazards. Available categories:
 *   - "EVENT": Natural disasters and emergency events
 *   - "EXERCISE": Training exercises and simulations
 *   - "OTHER": Other types of hazards
 *   - "RESPONSE": Response-related activities
 * @returns Promise<ActiveHazard[]> - Array of active hazards for the specified category
 */
export async function fetchActiveHazardsByCategory(categoryId: string): Promise<ActiveHazard[]> {
  try {
    const accessToken = getAccessToken();
    if (!accessToken) {
      await authorize();
    }

    const url = `/api/hazards/active/category/${categoryId}`;
    const res = await authFetch(url);

    if (res && res.ok) {
      const data = await res.json();
      return data;
    }

    throw new Error(`Failed to fetch active hazards for category: ${categoryId}`);
  } catch (error) {
    console.error(`Error fetching active hazards for category ${categoryId}:`, error);
    return [];
  }
}
