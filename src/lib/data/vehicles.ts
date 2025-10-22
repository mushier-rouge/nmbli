export type VehicleModel = {
  model: string;
  trims: string[];
};

export type VehicleData = Record<string, VehicleModel[]>;

// Static import works correctly in both Next.js server and client
import vehicleData from './vehicles.json';

export const vehicles: VehicleData = vehicleData as VehicleData;

/**
 * Get all available makes sorted alphabetically
 */
export function getAllMakes(): string[] {
  return Object.keys(vehicles).sort();
}

/**
 * Get all models for a given make
 */
export function getModelsForMake(make: string): string[] {
  const makeData = vehicles[make];
  if (!makeData) return [];
  return makeData.map((m) => m.model).sort();
}

/**
 * Get all trims for a given make and model
 */
export function getTrimsForModel(make: string, model: string): string[] {
  const makeData = vehicles[make];
  if (!makeData) return [];
  const modelData = makeData.find((m) => m.model === model);
  return modelData ? modelData.trims : [];
}

/**
 * Get models for multiple makes
 */
export function getModelsForMakes(makes: string[]): string[] {
  const modelsSet = new Set<string>();
  makes.forEach((make) => {
    const models = getModelsForMake(make);
    models.forEach((model) => modelsSet.add(model));
  });
  return Array.from(modelsSet).sort();
}

/**
 * Get trims for multiple makes and models
 */
export function getTrimsForModels(selections: Array<{ make: string; model: string }>): string[] {
  const trimsSet = new Set<string>();
  selections.forEach(({ make, model }) => {
    const trims = getTrimsForModel(make, model);
    trims.forEach((trim) => trimsSet.add(trim));
  });
  return Array.from(trimsSet).sort();
}
