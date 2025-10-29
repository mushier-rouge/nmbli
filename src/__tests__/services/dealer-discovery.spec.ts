import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  discoverDealersForBrief,
  getDealersForBrief,
} from '@/lib/services/dealer-discovery';
import { findDealersInState } from '@/lib/api/google-maps';
import { prisma } from '@/lib/prisma';

// Mock Google Maps API
vi.mock('@/lib/api/google-maps', () => ({
  findDealersInState: vi.fn(),
}));

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    brief: {
      findUnique: vi.fn(),
    },
    dealership: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findMany: vi.fn(),
    },
    dealerProspect: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

describe('Dealer Discovery Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('discoverDealersForBrief', () => {
    it('should discover dealers for a brief with single make', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '90210',
        makes: ['Toyota'],
      };

      const mockDealers = [
        {
          name: 'Smith Toyota',
          make: 'Toyota',
          address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          zipcode: '90001',
          phone: '555-1234',
          website: 'https://smithtoyota.com',
          email: 'sales@smithtoyota.com',
        },
      ];

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(findDealersInState).mockResolvedValue(mockDealers as any);
      vi.mocked(prisma.dealership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.dealership.create).mockResolvedValue({ ...mockDealers[0], id: 'dealer-1' } as any);
      vi.mocked(prisma.dealerProspect.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.dealerProspect.create).mockResolvedValue({ id: 'prospect-1' } as any);

      const result = await discoverDealersForBrief('brief-123');

      expect(prisma.brief.findUnique).toHaveBeenCalled();
      expect(findDealersInState).toHaveBeenCalledWith({
        make: 'Toyota',
        state: expect.any(String),
        zipcode: '90210',
        count: 15,
      });
      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('Smith Toyota');
    });

    it('should discover dealers for multiple makes', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '60601',
        makes: ['Honda', 'Toyota'],
      };

      const hondaDealers = [
        {
          name: 'Johnson Honda',
          make: 'Honda',
          address: '456 Oak Ave',
          city: 'Chicago',
          state: 'IL',
          zipcode: '60601',
        },
      ];

      const toyotaDealers = [
        {
          name: 'Chicago Toyota',
          make: 'Toyota',
          address: '789 Elm St',
          city: 'Chicago',
          state: 'IL',
          zipcode: '60602',
        },
      ];

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(findDealersInState)
        .mockResolvedValueOnce(hondaDealers as any)
        .mockResolvedValueOnce(toyotaDealers as any);
      vi.mocked(prisma.dealership.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.dealership.create)
        .mockResolvedValueOnce({ ...hondaDealers[0], id: 'dealer-1' } as any)
        .mockResolvedValueOnce({ ...toyotaDealers[0], id: 'dealer-2' } as any);
      vi.mocked(prisma.dealerProspect.findFirst).mockResolvedValue(null);
      vi.mocked(prisma.dealerProspect.create).mockResolvedValue({ id: 'prospect-1' } as any);

      const result = await discoverDealersForBrief('brief-123');

      expect(findDealersInState).toHaveBeenCalledTimes(2);
      expect(prisma.dealership.create).toHaveBeenCalledTimes(2);
      expect(result).toHaveLength(2);
    });

    it('should skip existing dealers (no duplicates)', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '90210',
        makes: ['Toyota'],
      };

      const mockDealers = [
        {
          name: 'Smith Toyota',
          make: 'Toyota',
          address: '123 Main St',
          city: 'Los Angeles',
          state: 'CA',
          zipcode: '90001',
        },
      ];

      const existingDealer = { id: 'dealer-1', ...mockDealers[0] };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(findDealersInState).mockResolvedValue(mockDealers as any);
      vi.mocked(prisma.dealership.findFirst).mockResolvedValue(existingDealer as any);

      await discoverDealersForBrief('brief-123');

      expect(prisma.dealership.create).not.toHaveBeenCalled();
    });

    it('should throw error if brief not found', async () => {
      vi.mocked(prisma.brief.findUnique).mockResolvedValue(null);

      await expect(discoverDealersForBrief('invalid-id')).rejects.toThrow(
        'Brief invalid-id not found'
      );
    });

    it('should handle Gemini API errors gracefully', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '90210',
        makes: ['Toyota'],
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(findDealersInState).mockRejectedValue(
        new Error('Gemini API error')
      );

      // Should not throw - errors are caught and logged
      const result = await discoverDealersForBrief('brief-123');
      expect(result).toEqual([]);
    });

    it('should handle invalid dealer data gracefully', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '90210',
        makes: ['Toyota'],
      };

      const mockDealers = [
        {
          name: 'Invalid Dealer',
          // Missing required fields
        },
      ];

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(findDealersInState).mockResolvedValue(mockDealers as any);

      // Should not throw - invalid dealers are skipped
      const result = await discoverDealersForBrief('brief-123');
      expect(result).toEqual([]);
    });
  });

  describe('getDealersForBrief', () => {
    it('should return dealers for brief', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '90210',
        makes: ['Toyota'],
      };

      const mockDealers = [
        {
          id: 'dealer-1',
          name: 'Smith Toyota',
          make: 'Toyota',
          state: 'WA',
          city: 'Los Angeles',
          phone: '555-1234',
          email: 'sales@smithtoyota.com',
        },
        {
          id: 'dealer-2',
          name: 'LA Toyota Center',
          make: 'Toyota',
          state: 'WA',
          city: 'Los Angeles',
        },
      ];

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(prisma.dealership.findMany).mockResolvedValue(mockDealers as any);

      const dealers = await getDealersForBrief('brief-123');

      expect(dealers).toHaveLength(2);
      expect(dealers[0].name).toBe('Smith Toyota');
      expect(prisma.dealership.findMany).toHaveBeenCalledWith({
        where: {
          make: { in: ['Toyota'] },
          state: expect.any(String),
        },
        orderBy: { verified: 'desc' },
      });
    });

    it('should filter by multiple makes', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '60601',
        makes: ['Honda', 'Toyota', 'Mazda'],
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(prisma.dealership.findMany).mockResolvedValue([]);

      await getDealersForBrief('brief-123');

      expect(prisma.dealership.findMany).toHaveBeenCalledWith({
        where: {
          make: { in: ['Honda', 'Toyota', 'Mazda'] },
          state: expect.any(String),
        },
        orderBy: { verified: 'desc' },
      });
    });

    it('should return empty array if no dealers found', async () => {
      const mockBrief = {
        id: 'brief-123',
        zipcode: '90210',
        makes: ['RareBrand'],
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);
      vi.mocked(prisma.dealership.findMany).mockResolvedValue([]);

      const dealers = await getDealersForBrief('brief-123');

      expect(dealers).toHaveLength(0);
    });

    it('should throw error if brief not found', async () => {
      vi.mocked(prisma.brief.findUnique).mockResolvedValue(null);

      await expect(getDealersForBrief('invalid-id')).rejects.toThrow(
        'Brief invalid-id not found'
      );
    });
  });
});
