export interface CampusRental {
  id: string; // product id
  productId: string;
  productTitle: string;
  productImage: string;
  rentPerDay: number;
  pickupLocation: string;
  startDate: string;
  returnByDate: string;
  status: "Active Rental" | "Return Requested" | "Returned Successfully";
  returnNote?: string;
}

const STORAGE_KEY = "campuskart_user_rentals_v1";

export function getUserRentals(): CampusRental[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

export function saveUserRentals(rentals: CampusRental[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(rentals));
  } catch {
    // ignore
  }
}

export function addOrUpdateRental(rental: CampusRental): void {
  const current = getUserRentals();
  const existingIdx = current.findIndex((r) => r.productId === rental.productId);
  if (existingIdx >= 0) {
    current[existingIdx] = { ...current[existingIdx], ...rental };
  } else {
    current.unshift(rental);
  }
  saveUserRentals(current);
}

export function requestRentalReturn(productId: string, returnDate: string, note?: string): void {
  const current = getUserRentals();
  const target = current.find((r) => r.productId === productId);
  if (target) {
    target.status = "Return Requested";
    target.returnByDate = returnDate;
    if (note) target.returnNote = note;
    saveUserRentals(current);
  }
}
