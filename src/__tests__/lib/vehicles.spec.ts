import { describe, it, expect } from 'vitest';
import { getAllMakes, getModelsForMake, getTrimsForModel, vehicles } from '@/lib/data/vehicles';

describe('Vehicle Data', () => {
  it('should load vehicle data', () => {
    expect(vehicles).toBeDefined();
    expect(typeof vehicles).toBe('object');
    expect(Object.keys(vehicles).length).toBeGreaterThan(0);
  });

  it('should get all makes', () => {
    const makes = getAllMakes();
    expect(makes).toBeDefined();
    expect(Array.isArray(makes)).toBe(true);
    expect(makes.length).toBeGreaterThan(0);
    // Should be sorted
    const sorted = [...makes].sort();
    expect(makes).toEqual(sorted);
  });

  it('should get models for a make', () => {
    const makes = getAllMakes();
    const firstMake = makes[0];
    const models = getModelsForMake(firstMake);
    expect(models).toBeDefined();
    expect(Array.isArray(models)).toBe(true);
    expect(models.length).toBeGreaterThan(0);
  });

  it('should get trims for a model', () => {
    const makes = getAllMakes();
    const firstMake = makes[0];
    const models = getModelsForMake(firstMake);
    const firstModel = models[0];
    const trims = getTrimsForModel(firstMake, firstModel);
    expect(trims).toBeDefined();
    expect(Array.isArray(trims)).toBe(true);
  });

  it('should handle invalid make', () => {
    const models = getModelsForMake('InvalidMake');
    expect(models).toEqual([]);
  });

  it('should handle invalid model', () => {
    const trims = getTrimsForModel('InvalidMake', 'InvalidModel');
    expect(trims).toEqual([]);
  });
});
