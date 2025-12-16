import { createClient } from '@supabase/supabase-js';
import { PrismaClient } from '../src/generated/prisma';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const email = process.env.AUTOMATION_TEST_USER_EMAIL!;
const password = process.env.AUTOMATION_TEST_USER_PASSWORD!;

if (!supabaseUrl || !serviceRoleKey || !email || !password) {
    console.error('Missing env vars');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);
const prisma = new PrismaClient();

async function main() {
    console.log(`Checking user ${email}...`);

    // 1. Check/Create in Supabase Auth
    let userId;
    const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

    if (listError) throw listError;

    const existingAuthUser = users.find(u => u.email === email);

    if (existingAuthUser) {
        console.log('✅ Auth user exists:', existingAuthUser.id);
        userId = existingAuthUser.id;
    } else {
        console.log('Creating auth user...');
        const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
            email,
            password,
            email_confirm: true,
            user_metadata: { full_name: 'Automation Ops' }
        });
        if (createError) throw createError;
        console.log('✨ Created auth user:', newUser.user.id);
        userId = newUser.user.id;
    }

    // 2. Check/Create in Prisma DB
    const existingDbUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!existingDbUser) {
        console.log('Creating DB user record...');
        await prisma.user.create({
            data: {
                id: userId,
                email,
                name: 'Automation Ops',
                role: 'buyer' // Vital for accessing /briefs/new
            }
        });
        console.log('✨ Created DB user');
    } else {
        console.log('✅ DB user exists');
        if (existingDbUser.role !== 'buyer') {
            console.log('Updating role to buyer...');
            await prisma.user.update({ where: { id: userId }, data: { role: 'buyer' } });
        }
    }

    console.log('Setup complete.');
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
