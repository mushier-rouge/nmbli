import { describe, expect, it, beforeEach, afterEach, vi } from 'vitest';
import { createBrief, listBuyerBriefs, getBriefDetail } from '@/lib/services/briefs';
import { prisma } from '@/lib/prisma';
import type { CreateBriefInput } from '@/lib/validation/brief';

// Mock Prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    brief: {
      create: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
    },
  },
}));

// Mock timeline service
vi.mock('@/lib/services/timeline', () => ({
  recordTimelineEvent: vi.fn(),
}));

describe('Brief Services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createBrief', () => {
    const mockBuyerId = 'buyer-123';
    const validBriefInput: CreateBriefInput = {
      zipcode: '90210',
      paymentType: 'cash',
      paymentPreferences: [
        { type: 'cash' },
      ],
      maxOTD: 50000,
      makes: ['Toyota'],
      models: ['Camry'],
      trims: ['LE'],
      colors: ['Black'],
      mustHaves: ['Leather seats'],
      timelinePreference: 'asap',
    };

    it('should create a brief with valid input', async () => {
      const mockCreatedBrief = {
        id: 'brief-123',
        buyerId: mockBuyerId,
        ...validBriefInput,
        maxOTD: { toNumber: () => 50000 },
        buyer: { id: mockBuyerId, email: 'test@example.com' },
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.brief.create).mockResolvedValue(mockCreatedBrief as any);

      const result = await createBrief({
        buyerId: mockBuyerId,
        input: validBriefInput,
      });

      expect(prisma.brief.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            buyerId: mockBuyerId,
            zipcode: '90210',
            paymentType: 'cash',
            makes: ['Toyota'],
            models: ['Camry'],
          }),
        })
      );
      expect(result).toEqual(mockCreatedBrief);
    });

    it('should trim zipcode', async () => {
      const inputWithSpaces = {
        ...validBriefInput,
        zipcode: '  90210  ',
      };

      const mockBrief = {
        id: 'brief-123',
        maxOTD: { toString: () => '50000' },
      };

      vi.mocked(prisma.brief.create).mockResolvedValue(mockBrief as any);

      await createBrief({
        buyerId: mockBuyerId,
        input: inputWithSpaces,
      });

      expect(prisma.brief.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            zipcode: '90210',
          }),
        })
      );
    });

    it('should handle optional fields', async () => {
      const minimalInput: CreateBriefInput = {
        zipcode: '90210',
        paymentType: 'cash',
        paymentPreferences: [],
        maxOTD: 50000,
        makes: ['Toyota'],
        models: ['Camry'],
        timelinePreference: 'asap',
      };

      const mockBrief = {
        id: 'brief-123',
        maxOTD: { toString: () => '50000' },
      };

      vi.mocked(prisma.brief.create).mockResolvedValue(mockBrief as any);

      await createBrief({
        buyerId: mockBuyerId,
        input: minimalInput,
      });

      expect(prisma.brief.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            trims: [],
            colors: [],
            mustHaves: [],
          }),
        })
      );
    });
  });

  describe('listBuyerBriefs', () => {
    it('should return all briefs for a buyer', async () => {
      const mockBriefs = [
        {
          id: 'brief-1',
          buyerId: 'buyer-123',
          makes: ['Toyota'],
          models: ['Camry'],
          zipcode: '90210',
          status: 'sourcing',
          maxOTD: { toNumber: () => 50000 },
          paymentPreferences: [],
          mustHaves: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'brief-2',
          buyerId: 'buyer-123',
          makes: ['Honda'],
          models: ['Accord'],
          zipcode: '90211',
          status: 'offers',
          maxOTD: { toNumber: () => 45000 },
          paymentPreferences: [],
          mustHaves: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      vi.mocked(prisma.brief.findMany).mockResolvedValue(mockBriefs as any);

      const result = await listBuyerBriefs('buyer-123');

      expect(prisma.brief.findMany).toHaveBeenCalledWith({
        where: { buyerId: 'buyer-123' },
        orderBy: { createdAt: 'desc' },
        include: {
          quotes: {
            take: 3,
            orderBy: { createdAt: 'desc' },
          },
        },
      });
      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('brief-1');
    });

    it('should return empty array for buyer with no briefs', async () => {
      vi.mocked(prisma.brief.findMany).mockResolvedValue([]);

      const result = await listBuyerBriefs('buyer-no-briefs');

      expect(result).toEqual([]);
    });
  });

  describe('getBriefDetail', () => {
    it('should return brief with quotes and timeline', async () => {
      const mockBrief = {
        id: 'brief-123',
        buyerId: 'buyer-123',
        makes: ['Toyota'],
        models: ['Camry'],
        zipcode: '90210',
        status: 'offers',
        maxOTD: { toNumber: () => 50000 },
        paymentPreferences: [],
        mustHaves: [],
        quotes: [
          {
            id: 'quote-1',
            dealerId: 'dealer-1',
            otdTotal: { toNumber: () => 48000 },
            status: 'pending',
            dealer: { id: 'dealer-1', name: 'Toyota Dealer' },
            lines: [],
          },
        ],
        timelineEvents: [
          {
            id: 'event-1',
            type: 'brief_created',
            payload: {},
            createdAt: new Date(),
          },
        ],
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(prisma.brief.findUnique).mockResolvedValue(mockBrief as any);

      const result = await getBriefDetail('brief-123');

      expect(prisma.brief.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'brief-123' },
          include: expect.objectContaining({
            quotes: expect.any(Object),
            timelineEvents: expect.any(Object),
          }),
        })
      );
      expect(result).toEqual(mockBrief);
      expect(result?.quotes).toHaveLength(1);
      expect(result?.timelineEvents).toHaveLength(1);
    });

    it('should return null for non-existent brief', async () => {
      vi.mocked(prisma.brief.findUnique).mockResolvedValue(null);

      const result = await getBriefDetail('non-existent');

      expect(result).toBeNull();
    });
  });
});
