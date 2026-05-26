export type GmVehicleType = 'motorbike' | 'car' | 'van' | 'truck';

export interface GmVehicle {
  id: string;
  name: string;
  licensePlate: string;
  vehicleType: GmVehicleType;
  brand?: string;
  model?: string;
  color?: string;
  imageUrl?: string | null;
  maxWeightKg?: number;
  isDefault: boolean;
}
