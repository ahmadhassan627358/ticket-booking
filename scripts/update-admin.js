const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const prisma = new PrismaClient();

async function main() {
  const newEmail = "ahmaddeveloper2003@gmail.com".toLowerCase().trim();
  const newPassword = "Ali@bbas1801";
  const newName = "Ahmad Hassan (Admin)";
  const passwordHash = await bcrypt.hash(newPassword, 10);

  console.log(`Updating admin user in database to ${newEmail}...`);

  // Check if old admin exists
  const existingAdmin = await prisma.user.findFirst({
    where: { role: "ADMIN" },
  });

  if (existingAdmin) {
    const updated = await prisma.user.update({
      where: { id: existingAdmin.id },
      data: {
        email: newEmail,
        name: newName,
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`✅ Existing admin updated successfully! ID: ${updated.id}, Email: ${updated.email}`);
  } else {
    const created = await prisma.user.upsert({
      where: { email: newEmail },
      update: {
        passwordHash,
        role: "ADMIN",
        name: newName,
      },
      create: {
        email: newEmail,
        name: newName,
        phone: "+923001234567",
        passwordHash,
        role: "ADMIN",
      },
    });
    console.log(`✅ Admin created successfully! ID: ${created.id}, Email: ${created.email}`);
  }
}

main()
  .catch((e) => {
    console.error("❌ Error updating admin:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
