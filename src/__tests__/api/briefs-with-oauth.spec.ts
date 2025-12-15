import { describe, it, expect, beforeEach, vi } from 'vitest';
import { POST, GET } from '@/app/api/briefs/route';
import { prisma } from '@/lib/prisma';
import { createSupabaseRouteClient } from '@/lib/supabase/route';

// Mock dependencies
vi.mock('@/lib/prisma', () => ({
  prisma: {
    user: {
      upsert: vi.fn(),
      findUnique: vi.fn(),
    },
    brief: {
      create: vi.fn(),
      findMany: vi.fn(),
    },
  },
}));

vi.mock('@/lib/supabase/route', () => ({
  createSupabaseRouteClient: vi.fn(),
}));

describe('POST /api/briefs - OAuth User Creation & Brief Creation', () => {
  const mockUserId = 'auth-user-123';
  const mockUserEmail = 'test@example.com';
  const mockUserName = 'Test User';

  const mockSession = {
    user: {
      id: mockUserId,
      email: mockUserEmail,
      user_metadata: {
        full_name: mockUserName,
      },
    },
  };

  const mockBriefPayload = {
    zipcode: '98101',
    paymentType: 'finance',
    maxOTD: 50000,
    makes: ['Toyota'],
    models: ['Camry'],
    trims: ['XLE'],
    colors: ['Silver'],
    mustHaves: ['Leather Seats'],
    timelinePreference: '2-4 weeks',
  };

  const mockCreatedBrief = {
    id: 'brief-123',
    buyerId: mockUserId,
    ...mockBriefPayload,
    status: 'sourcing',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create User record for new OAuth user and then create brief', async () => {
    // Mock Supabase session
    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
        }),
      },
    } as any);

    // Mock user upsert (creates new user)
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      name: mockUserName,
      role: 'buyer',
      createdAt: new Date(),
    } as any);

    // Mock brief creation
    vi.mocked(prisma.brief.create).mockResolvedValue(mockCreatedBrief as any);

    // Create mock request
    const request = new Request('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBriefPayload),
    });

    // Call the API
    const response = await POST(request as any);
    const data = await response.json();

    // Verify user was created with correct data
    expect(prisma.user.upsert).toHaveBeenCalledWith({
      where: { id: mockUserId },
      update: {},
      create: {
        id: mockUserId,
        email: mockUserEmail,
        name: mockUserName,
        role: 'buyer',
      },
    });

    // Verify brief was created
    expect(prisma.brief.create).toHaveBeenCalledWith({
      data: {
        buyerId: mockUserId,
        status: 'sourcing',
        ...mockBriefPayload,
      },
    });

    // Verify response
    expect(response.status).toBe(200);
    expect(data.id).toBe('brief-123');
    expect(data.buyerId).toBe(mockUserId);
    expect(data.status).toBe('sourcing');
    expect(data.zipcode).toBe('98101');
  });

  it('should use existing User record and create brief', async () => {
    // Mock Supabase session
    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
        }),
      },
    } as any);

    // Mock user upsert (returns existing user, no creation)
    const existingUser = {
      id: mockUserId,
      email: mockUserEmail,
      name: mockUserName,
      role: 'buyer',
      createdAt: new Date('2024-01-01'),
    };
    vi.mocked(prisma.user.upsert).mockResolvedValue(existingUser as any);

    // Mock brief creation
    vi.mocked(prisma.brief.create).mockResolvedValue(mockCreatedBrief as any);

    // Create mock request
    const request = new Request('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBriefPayload),
    });

    // Call the API
    const response = await POST(request as any);
    const data = await response.json();

    // Verify user upsert was called (would use existing record)
    expect(prisma.user.upsert).toHaveBeenCalled();

    // Verify brief was created
    expect(prisma.brief.create).toHaveBeenCalled();

    // Verify response
    expect(response.status).toBe(200);
    expect(data.id).toBe('brief-123');
  });

  it('should derive name from email when user_metadata.full_name is missing', async () => {
    const sessionWithoutName = {
      user: {
        id: mockUserId,
        email: 'john.doe@example.com',
        user_metadata: {},
      },
    };

    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: sessionWithoutName },
        }),
      },
    } as any);

    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: mockUserId,
      email: 'john.doe@example.com',
      name: 'john.doe',
      role: 'buyer',
      createdAt: new Date(),
    } as any);

    vi.mocked(prisma.brief.create).mockResolvedValue(mockCreatedBrief as any);

    const request = new Request('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBriefPayload),
    });

    await POST(request as any);

    // Verify name was derived from email
    expect(prisma.user.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          name: 'john.doe', // Email prefix
        }),
      })
    );
  });

  it('should return 401 when no session exists', async () => {
    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    } as any);

    const request = new Request('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBriefPayload),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Unauthorized');
    expect(prisma.user.upsert).not.toHaveBeenCalled();
    expect(prisma.brief.create).not.toHaveBeenCalled();
  });

  it('should handle database errors gracefully', async () => {
    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
        }),
      },
    } as any);

    // Mock user upsert success
    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      name: mockUserName,
      role: 'buyer',
      createdAt: new Date(),
    } as any);

    // Mock brief creation failure
    vi.mocked(prisma.brief.create).mockRejectedValue(
      new Error('Database connection failed')
    );

    const request = new Request('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(mockBriefPayload),
    });

    const response = await POST(request as any);
    const data = await response.json();

    expect(response.status).toBe(500);
    expect(data.message).toBe('Internal Server Error');
  });

  it('should include paymentPreferences when provided', async () => {
    const paymentPrefs = [
      { type: 'finance', downPayment: 10000, termMonths: 60 },
    ];

    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
        }),
      },
    } as any);

    vi.mocked(prisma.user.upsert).mockResolvedValue({
      id: mockUserId,
      email: mockUserEmail,
      name: mockUserName,
      role: 'buyer',
      createdAt: new Date(),
    } as any);

    vi.mocked(prisma.brief.create).mockResolvedValue({
      ...mockCreatedBrief,
      paymentPreferences: paymentPrefs,
    } as any);

    const request = new Request('http://localhost/api/briefs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...mockBriefPayload,
        paymentPreferences: paymentPrefs,
      }),
    });

    await POST(request as any);

    expect(prisma.brief.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        paymentPreferences: paymentPrefs,
      }),
    });
  });
});

describe('GET /api/briefs - Fetch Briefs for Authenticated User', () => {
  const mockUserId = 'auth-user-123';
  const mockSession = {
    user: {
      id: mockUserId,
      email: 'test@example.com',
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch all briefs for authenticated user', async () => {
    const mockBriefs = [
      {
        id: 'brief-1',
        buyerId: mockUserId,
        zipcode: '98101',
        status: 'sourcing',
        createdAt: new Date(),
      },
      {
        id: 'brief-2',
        buyerId: mockUserId,
        zipcode: '90210',
        status: 'offers',
        createdAt: new Date(),
      },
    ];

    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: mockSession },
        }),
      },
    } as any);

    vi.mocked(prisma.brief.findMany).mockResolvedValue(mockBriefs as any);

    const request = new Request('http://localhost/api/briefs', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await response.json();

    expect(prisma.brief.findMany).toHaveBeenCalledWith({
      where: { buyerId: mockUserId },
      orderBy: { createdAt: 'desc' },
    });

    expect(response.status).toBe(200);
    expect(data).toHaveLength(2);
    expect(data[0].id).toBe('brief-1');
    expect(data[1].id).toBe('brief-2');
  });

  it('should return 401 when no session exists', async () => {
    vi.mocked(createSupabaseRouteClient).mockReturnValue({
      auth: {
        getSession: vi.fn().mockResolvedValue({
          data: { session: null },
        }),
      },
    } as any);

    const request = new Request('http://localhost/api/briefs', {
      method: 'GET',
    });

    const response = await GET(request as any);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.message).toBe('Unauthorized');
    expect(prisma.brief.findMany).not.toHaveBeenCalled();
  });
});
