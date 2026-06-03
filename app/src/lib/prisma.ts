// Arquivo para configurar o Prisma Client com o adaptador PostgreSQL
// Garantir que ele seja reutilizado durante o desenvolvimento para evitar múltiplas conexões.
import "server-only";

import { Pool } from 'pg'
import { PrismaPg } from '@prisma/adapter-pg'
import { PrismaClient } from '@prisma/client'

const connectionString = process.env.DATABASE_URL
if (!connectionString) {
  throw new Error("A variável de ambiente DATABASE_URL não está definida.")
}

// Função que cria o cliente Prisma com o seu adaptador.
// `max: 1` é a recomendação pra serverless (Vercel Functions): cada instância
// mantém UMA conexão, e o pool real fica num pgBouncer/pgPool a montante
// (Supabase pooler, Neon pooled URL, Vercel Postgres pooled URL, etc.).
// Sem isso, com várias funções e cold starts, é fácil estourar max_connections.
const prismaClientSingleton = () => {
  const pool = new Pool({ connectionString, max: 1 })
  const adapter = new PrismaPg(pool)
  return new PrismaClient({ adapter })
}

// Extensão do objeto globalThis para o TypeScript não reclamar
declare global {
  var prismaGlobal: undefined | ReturnType<typeof prismaClientSingleton>
}

// Exporta o Prisma. 
// Se já existir no globalThis (por causa de um recarregamento), ele reaproveita. 
// Se não, ele cria um novo.
export const prisma = globalThis.prismaGlobal ?? prismaClientSingleton()

// Salva a instância no globalThis se estivermos em ambiente de desenvolvimento
if (process.env.NODE_ENV !== 'production') globalThis.prismaGlobal = prisma
