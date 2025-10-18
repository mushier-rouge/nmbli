import { NextRequest, NextResponse } from 'next/server';

import { requireSession } from '@/lib/auth/session';
import { uploadContractFiles } from '@/lib/services/contracts';
import { contractUploadSchema } from '@/lib/validation/contract';

export async function POST(request: NextRequest) {
  try {
    await requireSession(['dealer', 'ops']);
    const formData = await request.formData();

    const payload = formData.get('payload');
    if (!payload || typeof payload !== 'string') {
      return NextResponse.json({ message: 'Missing payload' }, { status: 400 });
    }

    const { quoteId } = contractUploadSchema.parse(JSON.parse(payload));
    const files = formData
      .getAll('files')
      .filter((file): file is File => file instanceof File && file.size > 0);

    const contract = await uploadContractFiles({ quoteId, files });

    return NextResponse.json({ contractId: contract.id });
  } catch (error) {
    console.error(error);
    if (error instanceof Error) {
      return NextResponse.json({ message: error.message }, { status: 400 });
    }
    return NextResponse.json({ message: 'Failed to upload contract' }, { status: 500 });
  }
}
