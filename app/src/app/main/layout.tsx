// Layout do app autenticado. Toaster já vem do root layout.
export default function MainLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <>{children}</>;
}
