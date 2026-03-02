import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-background px-4">
      <div className="mb-8 text-center">
        <p className="text-xl font-semibold tracking-tight text-foreground">
          Volume
        </p>
        <p className="mt-1 text-sm text-muted-foreground">
          Your AI workout coach
        </p>
      </div>
      <SignUp />
    </div>
  );
}
