import { LoginBrandPanel } from "@/components/auth/login-brand-panel";
import { LoginForm } from "@/components/auth/login-form";

interface LoginPageProps {
  searchParams: Promise<{ next?: string }>;
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const { next } = await searchParams;

  return (
    <main className="grid min-h-svh w-full bg-background lg:grid-cols-[1.05fr_1fr]">
      <LoginBrandPanel />
      <section className="relative flex items-center justify-center px-6 py-12 sm:px-10 lg:px-20">
        <LoginForm nextParam={next ?? ""} />
      </section>
    </main>
  );
}
