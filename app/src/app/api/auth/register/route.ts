
import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { prisma } from "@/src/lib/prisma";
import { registerSchema } from "@/src/lib/schemas";
import { seedDefaultCategories } from "@/src/lib/seed";

export async function POST(request: Request) {
  try {
    // Valida e normaliza payload (zod já faz lowercase/trim no email)
    const parsed = registerSchema.safeParse(await request.json());
    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Dados inválidos";
      return NextResponse.json({ error: first }, { status: 400 });
    }
    const { email, password, name } = parsed.data;

    // Email já cadastrado?
    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "Este email já está em uso" }, { status: 400 });
    }

    // Hash + create + seed em uma única transação — ou tudo passa, ou nada fica salvo
    const passwordHash = await bcrypt.hash(password, 12);
    await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: { email, name, passwordHash },
      });
      await seedDefaultCategories(user.id, tx);
    });

    return NextResponse.json({ success: true }, { status: 201 });
  } catch (error) {
    console.error("Erro no registro:", error);
    return NextResponse.json({ error: "Erro interno do servidor" }, { status: 500 });
  }
}
