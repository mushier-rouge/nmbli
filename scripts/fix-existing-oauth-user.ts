import { PrismaClient } from '@/generated/prisma';
import { createClient } from '@supabase/supabase-js';

// This script creates User records for existing OAuth users who logged in before the fix
async function fixExistingOAuthUsers() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const prisma = new PrismaClient();

  try {
    console.log('Fetching all Supabase auth users...');

    // Get all auth users from Supabase
    const { data: { users }, error } = await supabase.auth.admin.listUsers();

    if (error) {
      console.error('Error fetching Supabase users:', error);
      return;
    }

    console.log(`Found ${users.length} auth users in Supabase\n`);

    for (const authUser of users) {
      // Check if user exists in Prisma database
      const existingUser = await prisma.user.findUnique({
        where: { id: authUser.id }
      });

      if (existingUser) {
        console.log(`✅ User already exists: ${authUser.email} (${authUser.id})`);
      } else {
        // Create the missing user
        const newUser = await prisma.user.create({
          data: {
            id: authUser.id,
            email: authUser.email!,
            name: authUser.user_metadata?.full_name || authUser.email!.split('@')[0],
            role: 'buyer',
          }
        });
        console.log(`✨ Created User record: ${newUser.email} (${newUser.id})`);
      }
    }

    console.log('\n🎉 Done! All OAuth users now have User records in the database.');
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixExistingOAuthUsers();
