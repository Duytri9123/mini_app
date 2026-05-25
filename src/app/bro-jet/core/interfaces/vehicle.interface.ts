export type VehicleType = 'sedan' | 'suv' | 'truck' | 'electric';

export interface BjVehicle {
  id: string;
  licensePlate: string;
  name?: string;
  brand: string;
  model: string;
  color: string;
  imageUrl: string | null;
  vehicleType: VehicleType;
  isDefault: boolean;
}
