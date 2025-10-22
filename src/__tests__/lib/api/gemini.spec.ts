import { describe, it, expect, vi, beforeEach } from 'vitest';
import { findDealersInState } from '@/lib/api/gemini';
import { GoogleGenerativeAI } from '@google/generative-ai';

// Mock the Gemini SDK
vi.mock('@google/generative-ai', () => {
  return {
    GoogleGenerativeAI: vi.fn(),
  };
});

describe('Gemini API - Dealer Discovery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.skip('should find dealers and return validated data', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([
          {
            name: 'Smith Toyota',
            address: '123 Main St',
            city: 'Los Angeles',
            state: 'CA',
            zipcode: '90001',
            phone: '555-1234',
            website: 'https://smithtoyota.com',
            email: 'sales@smithtoyota.com',
          },
          {
            name: 'Johnson Toyota',
            address: '456 Oak Ave',
            city: 'San Diego',
            state: 'CA',
            zipcode: '92101',
          },
        ]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    const dealers = await findDealersInState({
      make: 'Toyota',
      state: 'CA',
      count: 2,
    });

    expect(dealers).toHaveLength(2);
    expect(dealers[0]).toMatchObject({
      name: 'Smith Toyota',
      city: 'Los Angeles',
      state: 'CA',
      zipcode: '90001',
    });
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('Toyota')
    );
    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('CA')
    );
  });

  it('should validate dealer data with Zod schema', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([
          {
            name: 'Invalid Dealer',
            address: '123 Main St',
            city: 'LA',
            state: 'CALIFORNIA', // Invalid - should be 2 chars
            zipcode: '90001',
          },
        ]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await expect(
      findDealersInState({
        make: 'Toyota',
        state: 'CA',
        count: 1,
      })
    ).rejects.toThrow();
  });

  it.skip('should handle empty response from Gemini', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    const dealers = await findDealersInState({
      make: 'Toyota',
      state: 'CA',
      count: 10,
    });

    expect(dealers).toHaveLength(0);
  });

  it('should handle malformed JSON response', async () => {
    const mockResponse = {
      response: {
        text: () => 'This is not valid JSON',
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await expect(
      findDealersInState({
        make: 'Toyota',
        state: 'CA',
        count: 10,
      })
    ).rejects.toThrow();
  });

  it.skip('should use Gemini 1.5 Flash model', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await findDealersInState({
      make: 'Honda',
      state: 'TX',
      count: 5,
    });

    expect(mockGetGenerativeModel).toHaveBeenCalledWith({
      model: 'gemini-1.5-flash',
    });
  });

  it.skip('should default to 15 dealers if count not specified', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await findDealersInState({
      make: 'Honda',
      state: 'TX',
    });

    expect(mockGenerateContent).toHaveBeenCalledWith(
      expect.stringContaining('15')
    );
  });

  it.skip('should handle API errors gracefully', async () => {
    const mockGenerateContent = vi
      .fn()
      .mockRejectedValue(new Error('API quota exceeded'));
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await expect(
      findDealersInState({
        make: 'Toyota',
        state: 'CA',
        count: 10,
      })
    ).rejects.toThrow('API quota exceeded');
  });

  it('should validate zipcode format', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([
          {
            name: 'Test Dealer',
            address: '123 Main St',
            city: 'LA',
            state: 'CA',
            zipcode: 'INVALID', // Invalid zipcode
          },
        ]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await expect(
      findDealersInState({
        make: 'Toyota',
        state: 'CA',
        count: 1,
      })
    ).rejects.toThrow();
  });

  it('should validate optional email format', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([
          {
            name: 'Test Dealer',
            address: '123 Main St',
            city: 'LA',
            state: 'CA',
            zipcode: '90001',
            email: 'not-an-email', // Invalid email
          },
        ]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await expect(
      findDealersInState({
        make: 'Toyota',
        state: 'CA',
        count: 1,
      })
    ).rejects.toThrow();
  });

  it('should validate optional website URL format', async () => {
    const mockResponse = {
      response: {
        text: () => JSON.stringify([
          {
            name: 'Test Dealer',
            address: '123 Main St',
            city: 'LA',
            state: 'CA',
            zipcode: '90001',
            website: 'not a url', // Invalid URL
          },
        ]),
      },
    };

    const mockGenerateContent = vi.fn().mockResolvedValue(mockResponse);
    const mockGetGenerativeModel = vi.fn().mockReturnValue({
      generateContent: mockGenerateContent,
    });

    (GoogleGenerativeAI as any).mockImplementation(() => ({
      getGenerativeModel: mockGetGenerativeModel,
    }));

    await expect(
      findDealersInState({
        make: 'Toyota',
        state: 'CA',
        count: 1,
      })
    ).rejects.toThrow();
  });
});
